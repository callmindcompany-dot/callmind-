-- Renamed from 20260812000000. It adds the lead columns that
-- 20260811000000_lead_search_indexes.sql builds indexes on -- neural_score
-- among them -- so it has to sort before it, not after. As 20260812 it
-- raised 42703 on the first index that referenced a column it had not
-- created yet.

-- Reconcile the leads table with what the application actually writes.
--
-- src/types/supabase.ts declares 30 columns on `leads`. The schema creates 18.
-- Because those types are hand-maintained rather than generated, TypeScript
-- believed the declaration and reported nothing, while Postgres rejected the
-- writes at runtime.
--
-- The visible symptom was that adding a lead by hand failed every time: the
-- insert in LeadsPage sends `brand`, and no migration has ever created that
-- column. Three list filters had the same problem in reverse -- they filtered
-- on `dnd_status`, `engagement` and `score`, so selecting one made the query
-- fail and the list render empty, which reads as "no leads match" rather than
-- as an error.
--
-- This adds the columns worth keeping and leaves the rest to be removed from
-- the code, rather than inventing storage for features that do not exist.

-- ---------------------------------------------------------------------------
-- Columns the product genuinely uses
-- ---------------------------------------------------------------------------

-- Written by the manual add-lead form and by the website form integration.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS brand TEXT;

-- Deal size. Referenced in five places, and the "Highest value" sort added in
-- 20260811000000 orders by it.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC;

-- AI lead score. Backs the "Highest score" sort and the score filter.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS neural_score INTEGER;

-- Free-text notes captured at creation. The lead_notes table holds the
-- threaded history; this is the first note taken with the lead itself.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- Set by the deduplication service so the UI can flag a suspected duplicate
-- without re-running detection on every render.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;

-- Which Meta ad produced the lead. Written by the Facebook lead-ads poller.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS facebook_ad_name TEXT;

-- Free-text description, distinct from `comment` (a telecaller's remark).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS description TEXT;

-- ---------------------------------------------------------------------------
-- custom_fields vs custom_data
-- ---------------------------------------------------------------------------
-- The schema created `custom_data`; eleven files read and write `custom_fields`.
-- Rather than keep two half-populated JSONB columns, `custom_fields` becomes
-- the single name and anything already in `custom_data` is merged into it.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'leads'
       AND column_name = 'custom_data'
  ) THEN
    UPDATE public.leads
       SET custom_fields = COALESCE(custom_fields, '{}'::jsonb)
                         || COALESCE(custom_data, '{}'::jsonb)
     WHERE custom_data IS NOT NULL AND custom_data <> '{}'::jsonb;
  END IF;
END $$;

-- custom_data is deliberately left in place. Dropping it is a separate,
-- irreversible step and should follow once the merge above has been verified
-- against real data.

-- ---------------------------------------------------------------------------
-- Indexes for the columns the list now sorts and filters on
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_leads_company_budget
  ON public.leads (company_id, estimated_budget DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_leads_duplicate
  ON public.leads (company_id)
  WHERE is_duplicate = true;

-- ---------------------------------------------------------------------------
-- Not added, on purpose
-- ---------------------------------------------------------------------------
-- `dnd_status`  -- DND in India is a regulatory register, not a column. Doing
--                  it properly means checking against the TRAI DND list at
--                  call time, not storing a flag nobody updates. The filter is
--                  being removed from the UI instead.
-- `engagement`  -- No code ever writes it, so a column would only ever be null.
-- `score`       -- The filter meant `neural_score`, which is added above.
-- `reference`,
-- `branch`,
-- `date`        -- Referenced only by the hand-written type declaration. Left
--                  out until something actually needs them.
