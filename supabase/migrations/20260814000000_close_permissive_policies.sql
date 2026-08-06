-- Close the permissive policies that cancel tenant isolation.
--
-- Postgres ORs permissive policies together. One USING (true) beside a correct
-- company-scoped policy means the correct one never decides anything -- so a
-- table can look fully protected in the migration that scopes it and still be
-- readable by every tenant because an older file left a wide-open policy behind.
--
-- Surveying the whole set finds 25 permissive policies that no later migration
-- drops. Eleven of them are correct: SELECT-only on platform-wide reference
-- content (legal_pages, plan_limits, resources and similar) which has no
-- company_id and is meant to be readable by everyone. This file deals with the
-- other fourteen.
--
-- Nothing here invents a policy shape. Where a correct company-scoped policy
-- already exists in another migration, the permissive one is simply dropped.

-- ---------------------------------------------------------------------------
-- 1. Tenant tables that already have a correct policy elsewhere
-- ---------------------------------------------------------------------------
-- All five carry company_id and are covered by tenant_<table>_<action> in
-- 20260718_secure_rls.sql. Each also carried "Allow all access to <table>" as
-- FOR ALL USING (true) WITH CHECK (true) from its original 20260706 migration,
-- which made the scoped policies inoperative -- for both reads and writes.
DROP POLICY IF EXISTS "Allow all access to cleanup_logs"         ON public.cleanup_logs;
DROP POLICY IF EXISTS "Allow all access to cleanup_settings"     ON public.cleanup_settings;
DROP POLICY IF EXISTS "Allow all access to company_settings"     ON public.company_settings;
DROP POLICY IF EXISTS "Allow all access to help_faqs"            ON public.help_faqs;
DROP POLICY IF EXISTS "Allow all access to support_chat_history" ON public.support_chat_history;

-- ---------------------------------------------------------------------------
-- 2. Tenant tables with no correct policy anywhere
-- ---------------------------------------------------------------------------
-- These four have company_id but nothing in the repository ever scoped them, so
-- dropping the permissive policy alone would leave them with RLS on and no
-- policy at all -- which denies everything and breaks the feature. They get a
-- real one here.

-- invoices: read-only to the browser. Every write comes from src/routes/payments.ts
-- through the service role, which bypasses RLS. useBilling.ts only selects.
DROP POLICY IF EXISTS "Users can view their company invoices" ON public.invoices;
DROP POLICY IF EXISTS "tenant_invoices_select" ON public.invoices;
CREATE POLICY "tenant_invoices_select" ON public.invoices
  FOR SELECT USING (company_id = public.get_my_company_id());

-- subscriptions: same. No src/ code writes this table at all.
DROP POLICY IF EXISTS "Users can view their company subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "tenant_subscriptions_select" ON public.subscriptions;
CREATE POLICY "tenant_subscriptions_select" ON public.subscriptions
  FOR SELECT USING (company_id = public.get_my_company_id());

-- support_tickets: customers raise and read their own. SettingsPage inserts,
-- useFounderHooks updates status. No DELETE policy -- nothing deletes tickets.
DROP POLICY IF EXISTS "Users can view their company support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "tenant_support_tickets_select" ON public.support_tickets;
DROP POLICY IF EXISTS "tenant_support_tickets_insert" ON public.support_tickets;
DROP POLICY IF EXISTS "tenant_support_tickets_update" ON public.support_tickets;
CREATE POLICY "tenant_support_tickets_select" ON public.support_tickets
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_support_tickets_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_support_tickets_update" ON public.support_tickets
  FOR UPDATE USING (company_id = public.get_my_company_id())
          WITH CHECK (company_id = public.get_my_company_id());

-- cofounders: useRoadmapCofounder selects, inserts, updates and deletes, all
-- within one company.
DROP POLICY IF EXISTS "Allow all access to cofounders" ON public.cofounders;
DROP POLICY IF EXISTS "tenant_cofounders_all" ON public.cofounders;
CREATE POLICY "tenant_cofounders_all" ON public.cofounders
  FOR ALL USING (company_id = public.get_my_company_id())
          WITH CHECK (company_id = public.get_my_company_id());

-- ---------------------------------------------------------------------------
-- 3. notifications
-- ---------------------------------------------------------------------------
-- The policy is called "Service Role full access notifications" but was created
-- with no TO clause, so it applied to every role including authenticated --
-- FOR ALL USING (true) WITH CHECK (true) on a table that carries company_id.
-- The same mistake as "Admins can manage announcements", and the name is why
-- neither was noticed.
--
-- service_role bypasses RLS entirely, so this policy was never needed for it to
-- work. Kept and scoped rather than deleted, so the intent stays legible.
DROP POLICY IF EXISTS "Service Role full access notifications" ON public.notifications;
CREATE POLICY "Service Role full access notifications" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. Platform-wide content that customers could write
-- ---------------------------------------------------------------------------
-- These four have no company_id: they are platform content, and a global SELECT
-- is right. But each also had FOR ALL USING (true) WITH CHECK (true), so any
-- logged-in customer could edit or delete them for everyone.
--
-- feature_flags is the sharpest: whatever it gates, a customer could flip it
-- platform-wide.
--
-- Only the write halves go. The global_select_* policies from
-- 20260718_secure_tenant_isolation.sql remain and are what these tables should
-- have; editing happens through the service role.
DROP POLICY IF EXISTS "Allow all access to feature_flags"   ON public.feature_flags;
DROP POLICY IF EXISTS "Allow all access to feature_roadmap" ON public.feature_roadmap;
DROP POLICY IF EXISTS "Allow all access to pdf_guides"      ON public.pdf_guides;
DROP POLICY IF EXISTS "Allow all access to video_tutorials" ON public.video_tutorials;

-- ---------------------------------------------------------------------------
-- Consequence worth stating
-- ---------------------------------------------------------------------------
-- useFounderHooks.ts reads support_tickets with no company filter, and
-- organization_tenants_view is now security_invoker. Both were relying on the
-- absence of tenant scoping to work across tenants, so the Founder Hub will now
-- see only the operator's own company.
--
-- That is the correct database state. The Founder Hub is a platform-owner
-- surface and needs a server-side path that checks INTERNAL_TEAM_EMAILS and
-- reads through the service role -- the pattern already used by
-- supabase/functions/impersonate-company. Leaving the tables open to every
-- customer so that one screen keeps working is not a trade worth making.
