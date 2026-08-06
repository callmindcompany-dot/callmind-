-- Security remediation: remove legacy permissive policies and enforce tenant isolation.
-- This migration is intentionally additive: it corrects policy drift caused by older
-- migrations without rewriting migration history.

BEGIN;

-- The public (anon) database role must never have blanket table or sequence access.
-- Public content, if any, should be exposed through a narrowly scoped SELECT policy.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Catch any similarly named policy drift left by historical migrations. This
-- deliberately removes only unrestricted FOR ALL policies; public read-only
-- policies are left intact and must be reviewed table by table.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'ALL'
      AND COALESCE(qual, '') IN ('true', '(true)')
      AND COALESCE(with_check, '') IN ('true', '(true)')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END;
$$;

-- Remove the legacy policies that grant unrestricted CRUD. RLS combines permissive
-- policies with OR, so one USING (true) policy defeats every tenant policy.
DROP POLICY IF EXISTS "Allow all access to sequences" ON public.sequences;
DROP POLICY IF EXISTS "Allow all access to ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "Allow all access to ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all access to announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow all access to announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Allow all on founder_tests" ON public.founder_tests;
DROP POLICY IF EXISTS "Allow all on founder_test_logs" ON public.founder_test_logs;
DROP POLICY IF EXISTS "Allow all on resources" ON public.resources;
DROP POLICY IF EXISTS "Allow all on whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Enable all access for authenticated users on feature_roadmap" ON public.feature_roadmap;
DROP POLICY IF EXISTS "Enable all access for authenticated users on feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Enable all access for company users on cofounders" ON public.cofounders;

-- Remove the unsafe policies created by full_master_supabase_setup.sql. In particular,
-- those policies allowed auth.role() = 'anon' and were applied TO public.
DROP POLICY IF EXISTS "users_access_policy" ON public.users;
DROP POLICY IF EXISTS "leads_company_access_policy" ON public.leads;
DROP POLICY IF EXISTS "companies_access_policy" ON public.companies;
DROP POLICY IF EXISTS "team_settings_access_policy" ON public.team_settings;
DROP POLICY IF EXISTS "invoices_access_policy" ON public.invoices;
DROP POLICY IF EXISTS "audit_logs_access_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "system_errors_access_policy" ON public.system_errors;
DROP POLICY IF EXISTS "scheduled_messages_access_policy" ON public.scheduled_messages;

-- Replace broad user-management policies. A standard user may update only their
-- own profile; founders may manage profiles in their tenant. A trigger below
-- additionally protects identity and authorization fields from self-escalation.
DROP POLICY IF EXISTS "users_select_own_company" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "tenant_select_users" ON public.users;
DROP POLICY IF EXISTS "tenant_insert_users" ON public.users;
DROP POLICY IF EXISTS "tenant_update_users" ON public.users;
DROP POLICY IF EXISTS "tenant_delete_users" ON public.users;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_users_read_tenant" ON public.users FOR SELECT TO authenticated
  USING (company_id::text = public.get_my_company_id());
CREATE POLICY "security_users_update_self_or_founder" ON public.users FOR UPDATE TO authenticated
  USING (
    id::text = auth.uid()::text
    OR (
      company_id::text = public.get_my_company_id()
      AND public.get_my_role() IN ('founder', 'super_admin')
    )
  )
  WITH CHECK (company_id::text = public.get_my_company_id());

CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side service-role operations remain available for provisioning.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.role IS DISTINCT FROM OLD.role)
     AND public.get_my_role() NOT IN ('founder', 'super_admin') THEN
    RAISE EXCEPTION 'Only founders may change a user role or company';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_user_privilege_escalation() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_user_identity_fields ON public.users;
CREATE TRIGGER enforce_user_identity_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- Restore tenant-safe policies for tables previously reopened by legacy migrations.
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_sequences_tenant" ON public.sequences FOR ALL TO authenticated
  USING (company_id::text = public.get_my_company_id())
  WITH CHECK (company_id::text = public.get_my_company_id());
CREATE POLICY "security_ai_config_tenant" ON public.ai_config FOR ALL TO authenticated
  USING (company_id::text = public.get_my_company_id())
  WITH CHECK (company_id::text = public.get_my_company_id());
CREATE POLICY "security_ai_faqs_tenant" ON public.ai_faqs FOR ALL TO authenticated
  USING (company_id::text = public.get_my_company_id())
  WITH CHECK (company_id::text = public.get_my_company_id());
CREATE POLICY "security_whatsapp_messages_tenant" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (company_id::text = public.get_my_company_id())
  WITH CHECK (company_id::text = public.get_my_company_id());

-- Founder test configuration can contain vendor settings and must never be public.
ALTER TABLE public.founder_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_test_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_founder_tests_founder_only" ON public.founder_tests FOR ALL TO authenticated
  USING (public.get_my_role() IN ('founder', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));
CREATE POLICY "security_founder_test_logs_founder_only" ON public.founder_test_logs FOR ALL TO authenticated
  USING (public.get_my_role() IN ('founder', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- Roadmap and resources may be read by signed-in users; writes remain founder-only.
ALTER TABLE public.feature_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_feature_roadmap_read" ON public.feature_roadmap FOR SELECT TO authenticated USING (true);
CREATE POLICY "security_feature_roadmap_write" ON public.feature_roadmap FOR ALL TO authenticated
  USING (public.get_my_role() IN ('founder', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));
CREATE POLICY "security_feature_flags_read" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "security_feature_flags_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.get_my_role() IN ('founder', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));
CREATE POLICY "security_resources_read" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "security_resources_write" ON public.resources FOR ALL TO authenticated
  USING (public.get_my_role() IN ('founder', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- Cofounder records are tenant-scoped, and only founders may administer them.
ALTER TABLE public.cofounders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_cofounders_read" ON public.cofounders FOR SELECT TO authenticated
  USING (company_id::text = public.get_my_company_id());
CREATE POLICY "security_cofounders_write" ON public.cofounders FOR ALL TO authenticated
  USING (
    company_id::text = public.get_my_company_id()
    AND public.get_my_role() IN ('founder', 'super_admin')
  )
  WITH CHECK (
    company_id::text = public.get_my_company_id()
    AND public.get_my_role() IN ('founder', 'super_admin')
  );

COMMIT;

-- call_logs
-- Referenced by this migration but created by none, and no application
-- code touches it. Guarded so a database without it does not fail with
-- 42P01, while one that has it still gets the policies.
DO $call_logs$
BEGIN
  IF to_regclass('public.call_logs') IS NULL THEN
    RAISE NOTICE 'Skipping call_logs policies: table not present';
  ELSE
    EXECUTE $ddl$
    DROP POLICY IF EXISTS "call_logs_company_access_policy" ON public.call_logs;
    $ddl$;
  END IF;
END $call_logs$;

-- sim_cards
-- Referenced by this migration but created by none, and no application
-- code touches it. Guarded so a database without it does not fail with
-- 42P01, while one that has it still gets the policies.
DO $sim_cards$
BEGIN
  IF to_regclass('public.sim_cards') IS NULL THEN
    RAISE NOTICE 'Skipping sim_cards policies: table not present';
  ELSE
    EXECUTE $ddl$
    DROP POLICY IF EXISTS "sim_cards_access_policy" ON public.sim_cards;
    $ddl$;
  END IF;
END $sim_cards$;

-- integrations
-- Referenced by this migration but created by none, and no application
-- code touches it. Guarded so a database without it does not fail with
-- 42P01, while one that has it still gets the policies.
DO $integrations$
BEGIN
  IF to_regclass('public.integrations') IS NULL THEN
    RAISE NOTICE 'Skipping integrations policies: table not present';
  ELSE
    EXECUTE $ddl$
    DROP POLICY IF EXISTS "integrations_access_policy" ON public.integrations;
    $ddl$;
  END IF;
END $integrations$;
