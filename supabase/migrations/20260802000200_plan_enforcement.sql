-- Plan enforcement in the database.
--
-- Until now every limit lived in React, and React is not a security boundary:
-- the browser holds an authenticated supabase-js client, so anyone who opened
-- devtools could insert past any cap. These triggers make the limits real.
--
-- Every function here is SECURITY DEFINER. That is required, not decorative:
-- the seat and lead counts must be authoritative, and under SECURITY INVOKER
-- the count would run as the caller's `authenticated` role and be filtered by
-- the very RLS the trigger is trying to back up. `SET search_path = public` is
-- equally required -- without it a user-writable schema earlier on the path
-- could shadow `plan_limits` and serve fake limits to a DEFINER function.
--
-- Everything keys off NEW.company_id rather than public.get_my_company_id(),
-- because that helper reads the JWT (20260718_secure_rls.sql:8-16) and there
-- is no JWT on service-role or webhook writes -- it would resolve to NULL and
-- silently wave those through.

BEGIN;

-- ===========================================================================
-- 1. Shared limit resolver
-- ===========================================================================

-- A company whose subscription lapsed drops to trial entitlements rather than
-- being locked out of its own data. They keep read access and can still work
-- at trial scale; they just cannot keep growing until they pay.
CREATE OR REPLACE FUNCTION public.get_company_limits(p_company_id TEXT)
RETURNS public.plan_limits
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pl.*
  FROM public.companies c
  JOIN public.plan_limits pl
    ON pl.id = CASE
                 WHEN c.plan_status IN ('expired', 'cancelled') THEN 'trial'
                 ELSE c.plan
               END
  WHERE c.id = p_company_id;
$$;

REVOKE ALL ON FUNCTION public.get_company_limits(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_limits(TEXT) TO authenticated, service_role;

-- Raises a limit breach in a shape the UI can act on. `MESSAGE` is shown to
-- the user as-is; `DETAIL` carries machine-readable JSON that
-- src/lib/planErrors.ts parses to open the upgrade modal on the right metric.
CREATE OR REPLACE FUNCTION public.raise_plan_limit(
  p_metric  TEXT,
  p_used    BIGINT,
  p_limit   BIGINT,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = p_message,
    DETAIL  = json_build_object(
      'code',   'PLAN_LIMIT',
      'metric', p_metric,
      'used',   p_used,
      'limit',  p_limit
    )::text;
END;
$$;

-- ===========================================================================
-- 2. Nobody may sell themselves an upgrade
-- ===========================================================================

-- `companies_access_policy` (full_master_supabase_setup.sql:493) is
-- FOR ALL ... USING (id = get_my_company_id() OR ...) with no separate
-- WITH CHECK, so for UPDATE the USING expression is reused -- meaning any
-- signed-in user can UPDATE their own company row, `plan` and `seat_limit`
-- included. Without this trigger every limit below is one supabase-js call
-- away from being irrelevant.
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the server (service role) settles billing, and it does so from
  -- src/routes/payments.ts after verifying the Razorpay signature.
  IF current_setting('request.jwt.claims', true) IS NULL
     OR COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.plan            IS DISTINCT FROM OLD.plan
     OR NEW.plan_status  IS DISTINCT FROM OLD.plan_status
     OR NEW.seat_limit   IS DISTINCT FROM OLD.seat_limit
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
     OR NEW.trial_ends_at   IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.billing_cycle   IS DISTINCT FROM OLD.billing_cycle
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Subscription details can only be changed by completing a payment.',
      DETAIL  = '{"code":"PLAN_LIMIT","metric":"billing","used":0,"limit":0}';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_billing_columns ON public.companies;
CREATE TRIGGER trg_protect_billing_columns
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- ===========================================================================
-- 3. Seats
-- ===========================================================================

-- Fires on UPDATE as well as INSERT. Re-enabling a disabled member consumes a
-- seat, so an INSERT-only guard would be bypassable by disabling someone,
-- inviting a replacement, then flipping the first one back to active.
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits    public.plan_limits;
  v_seat_cap  INTEGER;
  v_used      BIGINT;
  v_admin_cap INTEGER;
  v_admins    BIGINT;
  v_active    BOOLEAN;
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

  v_limits := public.get_company_limits(NEW.company_id);
  IF v_limits.id IS NULL THEN
    RETURN NEW; -- company row not created yet (signup); nothing to enforce against
  END IF;

  -- The purchased seat count is what the company paid for; the plan cap is the
  -- ceiling that purchase is allowed to reach. The stricter of the two wins.
  SELECT LEAST(c.seat_limit, v_limits.max_seats) INTO v_seat_cap
  FROM public.companies c WHERE c.id = NEW.company_id;

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

DROP TRIGGER IF EXISTS trg_enforce_seat_limit ON public.users;
CREATE TRIGGER trg_enforce_seat_limit
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();

-- ===========================================================================
-- 4. Leads
-- ===========================================================================

-- Statement-level, not row-level. SmartImportModal inserts in chunks of
-- hundreds to thousands; a per-row trigger would run the same COUNT once per
-- row. With a transition table the check runs once per statement, and because
-- it raises inside the statement the whole chunk rolls back -- no half-imported
-- file.
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
      v_limits   public.plan_limits;
      v_existing BIGINT;
    BEGIN
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

DROP TRIGGER IF EXISTS trg_enforce_lead_limit ON public.leads;
CREATE TRIGGER trg_enforce_lead_limit
  AFTER INSERT ON public.leads
  REFERENCING NEW TABLE AS inserted
  FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_lead_limit();

-- ===========================================================================
-- 5. Automation rules
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.enforce_automation_rule_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits public.plan_limits;
  v_used   BIGINT;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_enforce_automation_rule_limit ON public.automation_rules;
CREATE TRIGGER trg_enforce_automation_rule_limit
  BEFORE INSERT ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_automation_rule_limit();

-- ===========================================================================
-- 6. Team targets (a boolean entitlement, enforced where rows are written)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.enforce_team_targets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits public.plan_limits;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_enforce_team_targets ON public.targets;
CREATE TRIGGER trg_enforce_team_targets
  BEFORE INSERT ON public.targets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_targets();

-- ===========================================================================
-- 7. AI credits
-- ===========================================================================

-- Replaces the check in src/routes/ai.ts, which read a Firestore-style
-- `app_config/features` document that no migration ever created, and derived
-- the plan from `plan_status` (a status, defaulting to the string
-- "Team Essential") rather than from the plan.
--
-- `ai_usage` is keyed (company_id, date); the monthly figure is a sum over the
-- current month, which keeps daily rows for analytics.
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
  v_limits public.plan_limits;
  v_cap    INTEGER;
  v_used   BIGINT;
BEGIN
  v_limits := public.get_company_limits(p_company_id);
  IF v_limits.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_company');
  END IF;

  -- WhatsApp drafts are metered against the draft allowance; everything else
  -- (summaries, report queries, column mapping) draws on AI credits.
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

REVOKE ALL ON FUNCTION public.consume_ai_credit(TEXT, TEXT) FROM PUBLIC;
-- Server-side only: if the browser could call this it could also decline to.
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(TEXT, TEXT) TO service_role;

-- ===========================================================================
-- 8. Retire the join-code path's own plan guessing
-- ===========================================================================

-- validate_join_request (20260718_join_rebuild.sql:75-105) inferred a seat cap
-- from LIKE '%enterprise%' style matching on the plan name. seat_limit is now
-- NOT NULL and plan_limits is authoritative, so that branch is dead weight and
-- a second place for limits to drift. The seat trigger above is the real gate;
-- this function only needs to produce a friendly pre-flight message.
CREATE OR REPLACE FUNCTION public.company_seat_capacity(p_company_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_limits public.plan_limits;
  v_cap    INTEGER;
  v_used   BIGINT;
BEGIN
  v_limits := public.get_company_limits(p_company_id);
  IF v_limits.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT LEAST(c.seat_limit, v_limits.max_seats) INTO v_cap
  FROM public.companies c WHERE c.id = p_company_id;

  SELECT COUNT(*) INTO v_used
  FROM public.users u
  WHERE u.company_id = p_company_id
    AND LOWER(COALESCE(u.status, 'active')) NOT IN ('disabled', 'removed');

  RETURN jsonb_build_object(
    'found', true, 'used', v_used, 'limit', v_cap, 'hasRoom', v_used < v_cap);
END;
$$;

REVOKE ALL ON FUNCTION public.company_seat_capacity(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_seat_capacity(TEXT) TO authenticated, service_role;

COMMIT;
