-- =============================================================================
-- Close the remaining tenant-isolation gaps.
--
-- WHY
-- The marketing site states that every query is scoped to your workspace and
-- that cross-tenant leaks are not possible. An audit of what the browser
-- actually queries with the anon key (59 tables/views) against what the repo
-- declares found three gaps that make that claim untrue today:
--
--   1. Seven tables the browser reads have no RLS declared anywhere in the
--      repo. They were created by hand in the dashboard and never covered by
--      20260718_secure_tenant_isolation.sql. Any authenticated user of any
--      company can read every company's rows in these tables.
--
--   2. Seven views the browser reads have no security_invoker. In Postgres a
--      view runs with the *owner's* privileges by default, so RLS on the
--      underlying tables is evaluated as the owner, not the caller. Perfect
--      RLS on `calls` and `leads` still leaks through `agent_performance`.
--      platform_stats_view and organization_tenants_view are platform-wide.
--
--   3. billing_intents, invoices and subscriptions have RLS enabled but the
--      policy is USING (true) — i.e. every authenticated user can read every
--      company's invoices. RLS looks "on" while isolating nothing.
--
-- SAFETY
-- Everything below is idempotent and defensive: each block checks that the
-- table/view and the company_id column exist before touching it, so running
-- this against a database whose shape differs from the repo is a no-op for the
-- parts that do not apply rather than a hard failure.
--
-- Reuses public.get_my_company_id() and the tenant_<action>_<table> naming
-- convention established in 20260718_secure_tenant_isolation.sql.
--
-- VERIFY BEFORE AND AFTER with the query at the bottom of this file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables with no RLS at all.
--
-- All seven are already filtered by company_id in the frontend hooks, so a
-- company_id policy matches how the app reads them and should not change any
-- legitimate query's results.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  gap_tables text[] := ARRAY[
    'lead_notes',
    'comm_logs',
    'activity_stream',
    'lead_activity_log',
    'custom_field_definitions',
    'export_files',
    'report_schedules'
  ];
BEGIN
  FOREACH t IN ARRAY gap_tables LOOP
    -- Skip if the table does not exist here.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Skipping %: table not present', t;
      CONTINUE;
    END IF;

    -- Skip if it has no company_id to scope on; a wrong policy here would
    -- silently break reads, which is worse than the gap it closes.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      RAISE WARNING 'Skipping %: no company_id column - needs a hand-written policy', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_delete_' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (company_id = public.get_my_company_id())',
      'tenant_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (company_id = public.get_my_company_id())',
      'tenant_insert_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id())',
      'tenant_update_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (company_id = public.get_my_company_id())',
      'tenant_delete_' || t, t);

    RAISE NOTICE 'Secured %', t;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Views must run as the caller, not the owner.
--
-- Without security_invoker a view is a hole straight through RLS. Requires
-- Postgres 15+ (Supabase is on 15+).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v text;
  gap_views text[] := ARRAY[
    'agent_performance',
    'conversion_funnel',
    'hourly_call_density',
    'lead_source_yield',
    'company_stats_view',
    'platform_stats_view',
    'organization_tenants_view'
  ];
BEGIN
  FOREACH v IN ARRAY gap_views LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = v
    ) THEN
      RAISE NOTICE 'Skipping view %: not present', v;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
    RAISE NOTICE 'security_invoker enabled on view %', v;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Replace USING (true) on the financial tables.
--
-- 20260706_billing.sql created "Users can view their company X" policies whose
-- body was USING (true), so they never restricted anything. Invoices and
-- billing intents are per-company financial records.
--
-- Writes are intentionally NOT granted to the browser here: the payment flow
-- writes these rows server-side with the service role (src/routes/payments.ts),
-- which bypasses RLS. Only the read path needs a policy.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  money_tables text[] := ARRAY['billing_intents', 'invoices', 'subscriptions'];
BEGIN
  FOREACH t IN ARRAY money_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Skipping %: table not present', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      RAISE WARNING 'Skipping %: no company_id column', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop the permissive policies from 20260706_billing.sql by name.
    -- %I (identifier), not %L: these names contain spaces and must be quoted
    -- as identifiers, otherwise the generated statement is invalid SQL.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   'Users can view their company subscriptions', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   'Users can view and insert their company billing intents', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   'Users can view their company invoices', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_select_' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (company_id = public.get_my_company_id())',
      'tenant_select_' || t, t);

    RAISE NOTICE 'Tightened % to company scope (read-only for clients)', t;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION — run this separately, before and after.
--
-- Any row where rls_enabled is false, or permissive_policies > 0, is still a
-- cross-tenant read risk. views_without_invoker should come back empty.
-- =============================================================================
--
-- -- Tables: RLS state and whether any policy is unrestricted
-- select
--   c.relname                                              as table_name,
--   c.relrowsecurity                                       as rls_enabled,
--   count(distinct p.polname)                              as policies,
--   count(distinct p.polname) filter (
--     where pg_get_expr(p.polqual, p.polrelid) = 'true'
--   )                                                      as permissive_policies
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- left join pg_policy p on p.polrelid = c.oid
-- where n.nspname = 'public' and c.relkind = 'r'
-- group by c.relname, c.relrowsecurity
-- order by c.relrowsecurity, permissive_policies desc, c.relname;
--
-- -- Views still running as owner (each one bypasses RLS)
-- select table_name as views_without_invoker
-- from information_schema.views v
-- where v.table_schema = 'public'
--   and not exists (
--     select 1 from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname = 'public' and c.relname = v.table_name
--       and c.reloptions::text like '%security_invoker=true%'
--   )
-- order by 1;
-- =============================================================================
