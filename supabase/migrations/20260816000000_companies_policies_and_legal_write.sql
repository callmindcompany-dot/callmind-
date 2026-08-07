-- Two holes found by running the bypass proof against the live database, which
-- was only possible once every migration had applied.

-- ---------------------------------------------------------------------------
-- 1. companies has row-level security on and no policies at all
-- ---------------------------------------------------------------------------
-- RLS enabled with zero policies denies everything. So no signed-in user could
-- read their own company row: not the plan, not plan_status, not seat_limit,
-- not even the name. usePlan falls back to bundled defaults when the query
-- returns nothing, the billing page has nothing to show, and the sidebar cannot
-- load the company name.
--
-- It is not that the policy was wrong -- there was none. RLS was switched on
-- outside the migrations (no file in this repository enables it), and
-- 20260804000000_security_rls_remediation.sql drops `companies_access_policy`
-- without creating a replacement. Whatever that policy was, it was the only one.
--
-- A tenant reads its own row and may edit its own profile fields. It cannot
-- touch the billing columns: trg_protect_billing_columns already rejects any
-- change to plan, plan_status, seat_limit, plan_expires_at, trial_ends_at or
-- billing_cycle unless the caller is the service role. That trigger is what
-- makes an UPDATE policy safe here — without it this would hand every customer
-- their own plan upgrade.
--
-- No INSERT and no DELETE: companies are created by the signup flow through the
-- service role, and nothing in the product deletes one.

DROP POLICY IF EXISTS "tenant_companies_select" ON public.companies;
CREATE POLICY "tenant_companies_select" ON public.companies
  FOR SELECT USING (id = public.get_my_company_id());

DROP POLICY IF EXISTS "tenant_companies_update" ON public.companies;
CREATE POLICY "tenant_companies_update" ON public.companies
  FOR UPDATE USING (id = public.get_my_company_id())
          WITH CHECK (id = public.get_my_company_id());

-- ---------------------------------------------------------------------------
-- 2. Every customer could rewrite the terms of service
-- ---------------------------------------------------------------------------
-- 20260718_secure_tenant_isolation.sql created:
--
--   global_write_legal_pages  FOR ALL
--     USING (get_my_role() = ANY (ARRAY['founder','super_admin']))
--
-- `founder` is the tenant role assigned to whoever creates a company, so every
-- paying customer holds it. The bypass proof confirmed it: signed in as an
-- ordinary tenant founder, `UPDATE legal_pages SET content='defaced'` changed a
-- row. legal_pages holds the Privacy Policy, Terms of Service and Refund Policy
-- shown to every other customer, and legal_pages_history is the record of who
-- changed them.
--
-- This is the same mistake as `role === 'founder'` in the impersonation
-- function, written in SQL. Platform ownership is the INTERNAL_TEAM_EMAILS
-- allow-list, which the database has no notion of -- so the write does not
-- belong to any browser role. These documents are edited through the service
-- role, which bypasses RLS.
DROP POLICY IF EXISTS "global_write_legal_pages" ON public.legal_pages;

-- The same check, under four more names, on four more tables holding
-- platform-wide content. Found by asking pg_policy rather than guessing at
-- names -- the first version of this migration dropped a set of "global_write_*"
-- policies that mostly do not exist, and the bypass proof caught it: signed in
-- as an ordinary customer, `UPDATE feature_flags` still changed four rows.
--
-- feature_flags is the sharpest of these. Whatever it gates, a single customer
-- could turn it off for everyone on the platform.
DROP POLICY IF EXISTS "security_feature_flags_write"   ON public.feature_flags;
DROP POLICY IF EXISTS "security_feature_roadmap_write" ON public.feature_roadmap;
DROP POLICY IF EXISTS "security_resources_write"       ON public.resources;

-- legal_pages_history is the audit trail for the documents above: who changed
-- which version, and when. A customer being able to edit or delete it is worse
-- than being able to edit the documents, because it removes the evidence.
DROP POLICY IF EXISTS "global_all_legal_pages_history" ON public.legal_pages_history;
