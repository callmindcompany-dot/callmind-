import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

const sql = `
BEGIN;

-- 1. Expire trials function
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.companies
     SET plan_status = 'expired'
   WHERE plan_status = 'trialing'
     AND trial_ends_at IS NOT NULL
     AND trial_ends_at < NOW();
     
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_trials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role, authenticated;

-- 2. Update enforce_seat_limit
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits      public.plan_limits;
  v_plan_status TEXT;
  v_seat_cap    INTEGER;
  v_used        BIGINT;
  v_admin_cap   INTEGER;
  v_admins      BIGINT;
  v_active      BOOLEAN;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_active := LOWER(COALESCE(NEW.status, 'active')) NOT IN ('disabled', 'removed');

  -- Only additions to the active headcount need checking.
  IF TG_OP = 'UPDATE'
     AND (NOT v_active
          OR LOWER(COALESCE(OLD.status, 'active')) NOT IN ('disabled', 'removed'))
     AND NEW.role IS NOT DISTINCT FROM OLD.role
  THEN
    RETURN NEW;
  END IF;

  IF NOT v_active THEN
    RETURN NEW;
  END IF;

  SELECT c.plan_status, c.seat_limit INTO v_plan_status, v_seat_cap
  FROM public.companies c WHERE c.id = NEW.company_id;

  IF v_plan_status IN ('expired', 'cancelled') THEN
    PERFORM public.raise_plan_limit(
      'expired', 0, 0,
      'Your free trial has ended. Upgrade to continue adding data.');
  END IF;

  v_limits := public.get_company_limits(NEW.company_id);
  IF v_limits.id IS NULL THEN
    RETURN NEW; -- company row not created yet (signup); nothing to enforce against
  END IF;

  v_seat_cap := LEAST(COALESCE(v_seat_cap, v_limits.max_seats), v_limits.max_seats);

  SELECT COUNT(*) INTO v_used
  FROM public.users u
  WHERE u.company_id = NEW.company_id
    AND LOWER(COALESCE(u.status, 'active')) NOT IN ('disabled', 'removed')
    AND u.id IS DISTINCT FROM NEW.id;

  IF v_used >= v_seat_cap THEN
    PERFORM public.raise_plan_limit(
      'seats', v_used, v_seat_cap,
      format('Seat limit reached (%s of %s used). Upgrade your plan to add more team members.',
             v_used, v_seat_cap));
  END IF;

  IF LOWER(COALESCE(NEW.role, '')) IN ('admin', 'sub_admin', 'founder') THEN
    v_admin_cap := v_limits.max_admins;

    SELECT COUNT(*) INTO v_admins
    FROM public.users u
    WHERE u.company_id = NEW.company_id
      AND LOWER(COALESCE(u.status, 'active')) NOT IN ('disabled', 'removed')
      AND LOWER(COALESCE(u.role, '')) IN ('admin', 'sub_admin', 'founder')
      AND u.id IS DISTINCT FROM NEW.id;

    IF v_admins >= v_admin_cap THEN
      PERFORM public.raise_plan_limit(
        'admins', v_admins, v_admin_cap,
        format('Your plan allows %s admin%s. Upgrade to add another.',
               v_admin_cap, CASE WHEN v_admin_cap = 1 THEN '' ELSE 's' END));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update enforce_lead_limit
CREATE OR REPLACE FUNCTION public.enforce_lead_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT i.company_id, COUNT(*) AS added
    FROM inserted i
    WHERE i.company_id IS NOT NULL
    GROUP BY i.company_id
  LOOP
    DECLARE
      v_limits      public.plan_limits;
      v_plan_status TEXT;
      v_existing    BIGINT;
    BEGIN
      SELECT c.plan_status INTO v_plan_status
      FROM public.companies c WHERE c.id = r.company_id;

      IF v_plan_status IN ('expired', 'cancelled') THEN
        PERFORM public.raise_plan_limit(
          'expired', 0, 0,
          'Your free trial has ended. Upgrade to continue adding data.');
      END IF;

      v_limits := public.get_company_limits(r.company_id);
      CONTINUE WHEN v_limits.id IS NULL OR v_limits.lead_limit IS NULL; -- unlimited

      SELECT COUNT(*) INTO v_existing
      FROM public.leads l
      WHERE l.company_id = r.company_id
        AND COALESCE(l.is_deleted, false) = false;

      IF v_existing > v_limits.lead_limit THEN
        PERFORM public.raise_plan_limit(
          'leads', v_existing, v_limits.lead_limit,
          format('Lead limit reached (%s of %s). Upgrade your plan to add more leads.',
                 v_existing - r.added, v_limits.lead_limit));
      END IF;
    END;
  END LOOP;

  RETURN NULL;
END;
$$;

-- 4. Update enforce_automation_rule_limit
CREATE OR REPLACE FUNCTION public.enforce_automation_rule_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits      public.plan_limits;
  v_plan_status TEXT;
  v_used        BIGINT;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.plan_status INTO v_plan_status
  FROM public.companies c WHERE c.id = NEW.company_id;

  IF v_plan_status IN ('expired', 'cancelled') THEN
    PERFORM public.raise_plan_limit(
      'expired', 0, 0,
      'Your free trial has ended. Upgrade to continue adding data.');
  END IF;

  v_limits := public.get_company_limits(NEW.company_id);
  IF v_limits.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM public.automation_rules a
  WHERE a.company_id = NEW.company_id;

  IF v_used >= v_limits.automation_rules THEN
    PERFORM public.raise_plan_limit(
      'automationRules', v_used, v_limits.automation_rules,
      format('Your plan includes %s automation rule%s. Upgrade to add more.',
             v_limits.automation_rules,
             CASE WHEN v_limits.automation_rules = 1 THEN '' ELSE 's' END));
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update enforce_team_targets
CREATE OR REPLACE FUNCTION public.enforce_team_targets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits      public.plan_limits;
  v_plan_status TEXT;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.plan_status INTO v_plan_status
  FROM public.companies c WHERE c.id = NEW.company_id;

  IF v_plan_status IN ('expired', 'cancelled') THEN
    PERFORM public.raise_plan_limit(
      'expired', 0, 0,
      'Your free trial has ended. Upgrade to continue adding data.');
  END IF;

  v_limits := public.get_company_limits(NEW.company_id);
  IF v_limits.id IS NULL OR v_limits.team_targets THEN
    RETURN NEW;
  END IF;

  PERFORM public.raise_plan_limit(
    'teamTargets', 0, 0,
    'Team targets are available on the Growth plan and above.');
  RETURN NEW;
END;
$$;

-- 6. Update consume_ai_credit
CREATE OR REPLACE FUNCTION public.consume_ai_credit(
  p_company_id TEXT,
  p_kind       TEXT DEFAULT 'total'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits      public.plan_limits;
  v_plan_status TEXT;
  v_cap         INTEGER;
  v_used        BIGINT;
BEGIN
  SELECT c.plan_status INTO v_plan_status
  FROM public.companies c WHERE c.id = p_company_id;

  IF v_plan_status IN ('expired', 'cancelled') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'trial_expired',
      'metric', 'expired',
      'used', 0,
      'limit', 0,
      'message', 'Your free trial has ended. Upgrade to continue adding data.'
    );
  END IF;

  v_limits := public.get_company_limits(p_company_id);
  IF v_limits.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_company');
  END IF;

  v_cap := CASE WHEN p_kind = 'draft' THEN v_limits.ai_draft_limit
                ELSE v_limits.ai_credit_limit END;

  SELECT COALESCE(SUM(CASE WHEN p_kind = 'draft' THEN wa_drafts ELSE total END), 0)
    INTO v_used
  FROM public.ai_usage
  WHERE company_id = p_company_id
    AND date >= date_trunc('month', CURRENT_DATE);

  IF v_cap IS NOT NULL AND v_used >= v_cap THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'limit_reached',
      'metric', CASE WHEN p_kind = 'draft' THEN 'aiDrafts' ELSE 'aiCredits' END,
      'used', v_used, 'limit', v_cap);
  END IF;

  INSERT INTO public.ai_usage (company_id, date, total, wa_drafts)
  VALUES (p_company_id, CURRENT_DATE, 1, CASE WHEN p_kind = 'draft' THEN 1 ELSE 0 END)
  ON CONFLICT ON CONSTRAINT ai_usage_company_date_unique DO UPDATE
    SET total     = ai_usage.total + 1,
        wa_drafts = ai_usage.wa_drafts
                    + CASE WHEN p_kind = 'draft' THEN 1 ELSE 0 END;

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_cap);
END;
$$;

COMMIT;
`;

async function apply() {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query(sql);
  console.log("Database trial expiration & read-only triggers updated successfully!");
  await client.end();
}

apply().catch(err => {
  console.error(err);
  process.exit(1);
});
