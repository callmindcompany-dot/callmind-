-- Make lead search usable on a large tenant.
--
-- The list searches name, phone and email with `ilike '%term%'`. Trigram
-- indexes already exist for name and phone (20260731_scale_protection.sql), so
-- those two are servable -- but email had none, and an OR across three columns
-- where one is unindexable pushes the planner to a sequential scan of the whole
-- table. On a Growth tenant that is 250,000 rows re-scanned on every keystroke.
--
-- Two additions:
--
--   1. A trigram index on email, so all three branches of the OR are servable.
--
--   2. A prefix index on phone. In telecalling, search is overwhelmingly a
--      phone number, and a caller types it from the front -- "98765". A
--      left-anchored `phone LIKE '98765%'` can use a plain btree with
--      text_pattern_ops, which is far cheaper than a trigram lookup. The
--      application prefers this path when the query looks like a phone number.
--
-- Trigram indexes are large and are built here CONCURRENTLY where possible so
-- an existing tenant is not locked out during the migration. Supabase runs
-- migrations inside a transaction, which forbids CONCURRENTLY, so these are
-- plain CREATE INDEX -- acceptable while the tables are small, and worth
-- revisiting before a large tenant is live.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search by email address.
CREATE INDEX IF NOT EXISTS idx_leads_email_trgm
  ON public.leads USING gin (email gin_trgm_ops);

-- Left-anchored phone lookup: `phone LIKE '98765%'`.
-- text_pattern_ops is required for LIKE to use a btree regardless of the
-- database's collation.
CREATE INDEX IF NOT EXISTS idx_leads_phone_prefix
  ON public.leads (company_id, phone text_pattern_ops);

-- Every search is already scoped to one company and to undeleted rows, so the
-- planner benefits from a composite that matches that filter before it starts
-- matching text.
CREATE INDEX IF NOT EXISTS idx_leads_company_active
  ON public.leads (company_id, created_at DESC)
  WHERE is_deleted = false;

-- The sort orders added alongside this migration order by these columns.
-- Without an index each one is a full sort of the tenant's leads.
CREATE INDEX IF NOT EXISTS idx_leads_company_updated
  ON public.leads (company_id, updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_leads_company_score
  ON public.leads (company_id, neural_score DESC)
  WHERE is_deleted = false;
