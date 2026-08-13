-- Where each lead came from, and what each source is worth.
--
-- leads.source has always held a string, and the lead table has always shown
-- it. What was missing is everything behind it: which run brought the lead in,
-- and -- the question that decides whether a marketplace subscription gets
-- renewed -- whether the leads from a source ever turn into anything.
--
-- Leads per source is half an answer and the easy half. IndiaMART sending 340
-- and JustDial sending 90 says nothing if JustDial's 90 convert and IndiaMART's
-- 340 do not.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS integration_run_id UUID;

COMMENT ON COLUMN public.leads.integration_run_id IS
  'The integration_runs row that created this lead. NULL for manual entry, CSV import, and every lead created before runs were recorded.';

-- No foreign key. integration_runs is admin-only and will be pruned long before
-- the leads are; a cascade would delete customer records to tidy up a log, and
-- a restrict would block the pruning. A dangling id reads as "the run is no
-- longer on file", which is the truth.
CREATE INDEX IF NOT EXISTS idx_leads_integration_run
  ON public.leads(integration_run_id)
  WHERE integration_run_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- What each source is actually worth.
--
-- Deliberately does not guess which status means "won". Statuses are per
-- company (team_settings.leads_statuses) and there is no CHECK constraint on
-- leads.status, so any mapping here would be a guess that reads as a fact.
-- These four columns are all directly observable:
--
--   leads       how many arrived
--   contacted   first_contact_at is set, so somebody actually rang them
--   valued      deal_value > 0, so money was attached to the outcome
--   value       the sum of it
--
-- A source with many leads and few contacts is a volume problem; many contacts
-- and no value is a quality problem. Those are different decisions and the
-- report should not blur them into one "conversion" number.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_source_performance(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  source          TEXT,
  leads           INTEGER,
  contacted       INTEGER,
  valued          INTEGER,
  total_value     NUMERIC,
  first_lead_at   TIMESTAMPTZ,
  last_lead_at    TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown')          AS source,
         COUNT(*)::INTEGER                                        AS leads,
         COUNT(*) FILTER (WHERE l.first_contact_at IS NOT NULL)::INTEGER,
         COUNT(*) FILTER (WHERE COALESCE(l.deal_value, 0) > 0)::INTEGER,
         COALESCE(SUM(l.deal_value) FILTER (WHERE l.deal_value > 0), 0),
         MIN(l.created_at),
         MAX(l.created_at)
  FROM public.leads l
  WHERE l.is_deleted = false
    AND l.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- SECURITY INVOKER, not DEFINER: the caller's own RLS on leads is exactly the
-- scoping this needs, and a DEFINER function here would have to re-implement
-- the tenant filter -- which is how a cross-tenant leak gets written.
GRANT EXECUTE ON FUNCTION public.lead_source_performance(INTEGER) TO authenticated;
