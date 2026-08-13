-- GENERATED FILE -- DO NOT EDIT BY HAND.
-- Source: src/config/pricing.ts. Regenerate with `npm run gen:plans`.
-- src/__tests__/planLimits.sync.test.ts fails if this drifts from the config.
--
-- Convention: lead_limit / ai_draft_limit / ai_credit_limit / bulk_import use
-- NULL for "unlimited" and 0 for "off". NULL is deliberate: in SQL
-- `count >= NULL` is NULL rather than true, so an unlimited plan can never
-- trip a limit check by accident.

BEGIN;

CREATE TABLE IF NOT EXISTS public.plan_limits (
  id                TEXT PRIMARY KEY,
  name              TEXT    NOT NULL,
  monthly_price     INTEGER NOT NULL,
  annual_price      INTEGER NOT NULL,
  max_seats         INTEGER NOT NULL,
  max_admins        INTEGER NOT NULL,
  lead_limit        BIGINT,
  ai_draft_limit    INTEGER,
  ai_credit_limit   INTEGER,
  automation_rules  INTEGER NOT NULL DEFAULT 0,
  bulk_import       INTEGER,
  ai_lead_scoring   TEXT    NOT NULL DEFAULT 'off',
  team_targets      BOOLEAN NOT NULL DEFAULT false,
  api_access        TEXT    NOT NULL DEFAULT 'off',
  pdf_export        BOOLEAN NOT NULL DEFAULT false,
  storage_gb_per_seat INTEGER NOT NULL DEFAULT 0,
  -- A flat company-wide grant in MB, used instead of the per-seat allowance.
  -- Zero means "use the per-seat figure". Only the trial sets it.
  storage_flat_mb   INTEGER NOT NULL DEFAULT 0,
  max_file_size_mb  INTEGER NOT NULL DEFAULT 0,
  files_per_lead    INTEGER,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_limits_scoring_chk CHECK (ai_lead_scoring IN ('off', 'on', 'advanced')),
  CONSTRAINT plan_limits_api_chk     CHECK (api_access IN ('off', 'read_only', 'full_read_write'))
);

-- For databases that ran an earlier version of this seed, before storage
-- limits existed. Must precede the INSERT below, which writes these columns.
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS storage_gb_per_seat INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_flat_mb     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_file_size_mb    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS files_per_lead      INTEGER;


INSERT INTO public.plan_limits (
  id, name, monthly_price, annual_price, max_seats, max_admins,
  lead_limit, ai_draft_limit, ai_credit_limit, automation_rules, bulk_import,
  ai_lead_scoring, team_targets, api_access, pdf_export,
  storage_gb_per_seat, storage_flat_mb, max_file_size_mb, files_per_lead
) VALUES
  ('trial', 'Free Trial', 0, 0, 3, 1, 1000, 30, 50, 2, 200, 'off', true, 'off', true, 0, 500, 5, 5),
  ('starter', 'Starter', 699, 599, 10, 1, 50000, 30, 50, 2, 2000, 'off', true, 'off', true, 3, 0, 10, 10),
  ('growth', 'Growth', 1199, 999, 25, 2, 250000, NULL, 200, 15, 10000, 'off', true, 'off', true, 5, 0, 25, 25),
  ('pro', 'Pro', 1499, 1299, 50, 3, NULL, NULL, NULL, 50, NULL, 'off', true, 'off', true, 8, 0, 100, NULL)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  monthly_price    = EXCLUDED.monthly_price,
  annual_price     = EXCLUDED.annual_price,
  max_seats        = EXCLUDED.max_seats,
  max_admins       = EXCLUDED.max_admins,
  lead_limit       = EXCLUDED.lead_limit,
  ai_draft_limit   = EXCLUDED.ai_draft_limit,
  ai_credit_limit  = EXCLUDED.ai_credit_limit,
  automation_rules = EXCLUDED.automation_rules,
  bulk_import      = EXCLUDED.bulk_import,
  ai_lead_scoring  = EXCLUDED.ai_lead_scoring,
  team_targets     = EXCLUDED.team_targets,
  api_access       = EXCLUDED.api_access,
  pdf_export       = EXCLUDED.pdf_export,
  storage_gb_per_seat = EXCLUDED.storage_gb_per_seat,
  storage_flat_mb  = EXCLUDED.storage_flat_mb,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  files_per_lead   = EXCLUDED.files_per_lead,
  updated_at       = NOW();

-- Anyone signed in may read the price list; nobody may write it. There is
-- deliberately no INSERT/UPDATE/DELETE policy, so the table is writable only
-- by migrations and the service role. Without that, a customer could raise
-- their own limits with a single supabase-js call.
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_limits_read ON public.plan_limits;
CREATE POLICY plan_limits_read ON public.plan_limits
  FOR SELECT TO authenticated USING (true);

COMMIT;
