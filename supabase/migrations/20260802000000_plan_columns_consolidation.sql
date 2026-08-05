-- Plan column consolidation.
--
-- Three different files described `companies` three different ways, and
-- src/routes/payments.ts wrote two columns (`subscription_status`,
-- `plan_expires_at`) that no migration ever declared -- so a successful
-- Razorpay payment could 500 on write-back. This settles the shape.
--
-- `plan_status` wins over `subscription_status`: every reader in the codebase
-- already uses `plan_status` (AuthContext, TeamPage, types/supabase.ts, the
-- tenant views); only the two writers in payments.ts used the other name.
--
-- No behaviour change. Enforcement arrives in a later migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan             TEXT,
  ADD COLUMN IF NOT EXISTS plan_status      TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_limit       INTEGER,
  ADD COLUMN IF NOT EXISTS billing_cycle    TEXT;

-- ---------------------------------------------------------------------------
-- 2. Absorb and drop the duplicate columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'companies'
       AND column_name = 'subscription_status'
  ) THEN
    UPDATE public.companies
       SET plan_status = COALESCE(plan_status, subscription_status);
    ALTER TABLE public.companies DROP COLUMN subscription_status;
  END IF;

  -- member_limit was read by TeamPage but declared in no migration.
  -- organization_tenants_view depends on it, so drop the view first; it is
  -- recreated below.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'companies'
       AND column_name = 'member_limit'
  ) THEN
    UPDATE public.companies
       SET seat_limit = GREATEST(COALESCE(seat_limit, 0), COALESCE(member_limit, 0));
    DROP VIEW IF EXISTS public.organization_tenants_view;
    ALTER TABLE public.companies DROP COLUMN member_limit;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Normalise values
-- ---------------------------------------------------------------------------

-- Plan ids drifted into four spellings: 'Growth' (AuthContext hardcoded it with
-- a capital G), plus the dead 'essential'/'professional'/'team'/'enterprise'
-- tiers from src/lib/subscriptionLimits.ts, which never existed in pricing.ts.
UPDATE public.companies
   SET plan = CASE LOWER(TRIM(COALESCE(plan, '')))
     WHEN 'starter'        THEN 'starter'
     WHEN 'growth'         THEN 'growth'
     WHEN 'pro'            THEN 'pro'
     WHEN 'trial'          THEN 'trial'
     WHEN 'essential'      THEN 'starter'
     WHEN 'team essential' THEN 'starter'
     WHEN 'solo'           THEN 'starter'
     WHEN 'professional'   THEN 'growth'
     WHEN 'team'           THEN 'growth'
     WHEN 'enterprise'     THEN 'pro'
     ELSE 'trial'
   END;

UPDATE public.companies
   SET plan_status = CASE LOWER(TRIM(COALESCE(plan_status, '')))
     WHEN 'active'    THEN 'active'
     WHEN 'trialing'  THEN 'trialing'
     WHEN 'trial'     THEN 'trialing'
     WHEN 'past_due'  THEN 'past_due'
     WHEN 'expired'   THEN 'expired'
     WHEN 'cancelled' THEN 'cancelled'
     WHEN 'canceled'  THEN 'cancelled'
     WHEN 'paused'    THEN 'past_due'
     ELSE CASE WHEN plan = 'trial' THEN 'trialing' ELSE 'active' END
   END;

UPDATE public.companies
   SET billing_cycle = COALESCE(NULLIF(LOWER(TRIM(billing_cycle)), ''), 'monthly');

UPDATE public.companies
   SET seat_limit = COALESCE(NULLIF(seat_limit, 0), 1);

UPDATE public.companies
   SET trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '7 days')
 WHERE plan = 'trial';

-- ---------------------------------------------------------------------------
-- 4. Defaults and NOT NULL (applied after backfill so existing rows survive)
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies
  ALTER COLUMN plan          SET DEFAULT 'trial',
  ALTER COLUMN plan_status   SET DEFAULT 'trialing',
  ALTER COLUMN seat_limit    SET DEFAULT 1,
  ALTER COLUMN billing_cycle SET DEFAULT 'monthly';

ALTER TABLE public.companies
  ALTER COLUMN plan          SET NOT NULL,
  ALTER COLUMN plan_status   SET NOT NULL,
  ALTER COLUMN seat_limit    SET NOT NULL,
  ALTER COLUMN billing_cycle SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Constraints
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_plan_chk;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_chk
  CHECK (plan IN ('trial', 'starter', 'growth', 'pro'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_plan_status_chk;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_status_chk
  CHECK (plan_status IN ('trialing', 'active', 'past_due', 'expired', 'cancelled'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_billing_cycle_chk;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_billing_cycle_chk
  CHECK (billing_cycle IN ('monthly', 'annual'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_seat_limit_chk;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_seat_limit_chk
  CHECK (seat_limit >= 1);

CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_plan_status ON public.companies(plan_status);

-- ---------------------------------------------------------------------------
-- 6. Rebuild organization_tenants_view
-- ---------------------------------------------------------------------------
-- Same shape as 20260718_tenants_view.sql minus member_limit, with two fixes:
--
--   * The MRR fallback matched plan names 'Enterprise'/'Professional'/'Basic'
--     which are not (and after step 3 cannot be) real plan values, so it only
--     ever produced invented revenue for rows that no longer exist. Dropped --
--     MRR is now the sum of paid invoices or zero, which is the truth.
--
--   * The view was granted to `anon`, meaning a logged-out visitor could list
--     every tenant, their user counts and their lead counts. Revoked.

DROP VIEW IF EXISTS public.organization_tenants_view;

CREATE VIEW public.organization_tenants_view AS
SELECT
  c.id,
  c.name,
  COALESCE(c.domain, LOWER(REGEXP_REPLACE(c.name, '\s+', '', 'g')) || '.com') AS domain,
  c.plan,
  c.plan_status AS status,
  COALESCE((SELECT COUNT(*)::int FROM public.users u WHERE u.company_id = c.id), 0) AS user_count,
  COALESCE((SELECT COUNT(*)::int FROM public.leads l WHERE l.company_id = c.id AND l.is_deleted = false), 0) AS lead_count,
  COALESCE((SELECT SUM(amount)::numeric FROM public.invoices i WHERE i.company_id = c.id AND i.status = 'paid'), 0)::numeric AS mrr,
  GREATEST(0, LEAST(100, COALESCE(c.health_score, 80))) AS health_score,
  c.seat_limit::int AS seat_limit
FROM public.companies c;

REVOKE ALL ON public.organization_tenants_view FROM anon;
GRANT SELECT ON public.organization_tenants_view TO authenticated;

COMMIT;
