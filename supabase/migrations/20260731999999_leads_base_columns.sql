-- Bring `leads` up to the shape schema.sql always assumed.
--
-- schema.sql declares eighteen columns on `leads`, but that file was never
-- applied to this database -- it is a reference document, not a migration.
-- The live table was built up piecemeal by ALTER statements scattered across
-- other migrations, so it is missing several of the basics.
--
-- The symptom was 42703 "column email does not exist", raised by the trigram
-- index in 20260801010000_enterprise_global_search.sql. Every later migration
-- that touches one of these columns would have failed the same way, one at a
-- time.
--
-- Timestamped to run before the 20260801* set. Every statement is
-- ADD COLUMN IF NOT EXISTS, so it is a no-op for whatever already exists.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email       TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'New';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source      TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city        TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state       TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address     TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS comment     TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_unseen   BOOLEAN DEFAULT TRUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- Referenced by the night-hold cron in src/routes/leads.ts:304, which has been
-- erroring on every run because the column was never created.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hold_outbound_trigger BOOLEAN NOT NULL DEFAULT false;

-- No CHECK constraint on `status` here. schema.sql has one, but adding it to a
-- table with existing rows would fail on any value outside that list, and this
-- migration must not be the thing that blocks the rest. Worth adding once the
-- live values have been inspected.
