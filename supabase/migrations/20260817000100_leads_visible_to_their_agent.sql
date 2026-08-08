-- Renamed from 20260817000000, which collided with
-- 20260817000000_company_ai_toggle.sql. Two files at the same timestamp sort
-- by filename, so they happened to run in a workable order -- but only by
-- accident, and a runner that sorts differently would not.

-- Scope leads to the agent they are assigned to.
--
-- The product rule, from the founder's own specification: "टेलिकॉलरला फक्त तेच
-- लीड्स दिसतात जे ॲडमिनने त्यांना दिले आहेत... ते दुसऱ्या एजंटचे लीड्स बघू
-- शकत नाहीत." A telecaller sees the leads assigned to them, not the company's
-- whole book.
--
-- The database did not enforce it. Every policy on `leads` tested company_id
-- and nothing else, so the restriction lived only in the queries the app
-- happens to send. Any telecaller could read every lead in their company --
-- including other agents' -- straight from the browser console or by editing
-- the mobile app's request. For a CRM whose customers are competing sales
-- teams inside one company, that is the difference between a rule and a wish.
--
-- Three separate company-wide SELECT policies existed at once, from three
-- migrations. Postgres ORs permissive policies, so adding a narrower one
-- alongside them would have changed nothing at all -- the same trap that made
-- announcements readable across tenants. They are dropped, not supplemented.

-- ---------------------------------------------------------------------------
-- Who may see a lead
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_see_lead(p_company_id TEXT, p_assigned_to TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_company_id IS NOT DISTINCT FROM public.get_my_company_id()
    AND (
      -- Admin-tier roles see the whole company book. `founder` is included
      -- because it is the tenant role the company creator holds -- it is not a
      -- platform privilege, and is not treated as one anywhere else.
      lower(coalesce(public.get_my_role(), '')) IN ('founder', 'admin', 'sub_admin')
      -- A telecaller sees what is assigned to them.
      OR p_assigned_to = auth.uid()::text
      -- And leads nobody has been given yet stay visible to admins only, which
      -- the branch above already covers. An unassigned lead is not "everyone's".
    );
$$;

COMMENT ON FUNCTION public.can_see_lead IS
  'Row visibility for leads: admin-tier roles see the company, telecallers see their own assignments.';

-- ---------------------------------------------------------------------------
-- Replace every company-wide policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_select_own_company" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_select"      ON public.leads;
DROP POLICY IF EXISTS "tenant_select_leads"      ON public.leads;

DROP POLICY IF EXISTS "leads_update_own_company" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_update"      ON public.leads;
DROP POLICY IF EXISTS "tenant_update_leads"      ON public.leads;

DROP POLICY IF EXISTS "leads_delete_own_company" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_delete"      ON public.leads;
DROP POLICY IF EXISTS "tenant_delete_leads"      ON public.leads;

-- A leftover from a schema this product no longer has: it keys on
-- organization_id and a `profiles` table, neither of which carries data here.
-- It grants nothing today and only makes the policy list harder to read.
DROP POLICY IF EXISTS "Tenant Leads Access Policy" ON public.leads;

DROP POLICY IF EXISTS "tenant_leads_select" ON public.leads;
CREATE POLICY "tenant_leads_select" ON public.leads
  FOR SELECT USING (public.can_see_lead(company_id, assigned_to));

-- Update is deliberately wider than select on one point: a telecaller must be
-- able to work a lead that has just been assigned to them, and reassignment is
-- an admin action that runs through the service role.
DROP POLICY IF EXISTS "tenant_leads_update" ON public.leads;
CREATE POLICY "tenant_leads_update" ON public.leads
  FOR UPDATE USING (public.can_see_lead(company_id, assigned_to))
          WITH CHECK (company_id = public.get_my_company_id());

-- Deleting is an admin action. A telecaller working a lead should not be able
-- to remove it from the company's records.
DROP POLICY IF EXISTS "tenant_leads_delete" ON public.leads;
CREATE POLICY "tenant_leads_delete" ON public.leads
  FOR DELETE USING (
    company_id = public.get_my_company_id()
    AND lower(coalesce(public.get_my_role(), '')) IN ('founder', 'admin', 'sub_admin')
  );

-- Insert stays company-scoped: a telecaller may add a lead of their own, and
-- the import path runs as the service role.
DROP POLICY IF EXISTS "leads_insert_own_company" ON public.leads;
DROP POLICY IF EXISTS "tenant_insert_leads"      ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_insert"      ON public.leads;
CREATE POLICY "tenant_leads_insert" ON public.leads
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

-- Telecallers filter by assignment on every screen; this is now the shape of
-- the policy too.
CREATE INDEX IF NOT EXISTS idx_leads_company_assigned
  ON public.leads (company_id, assigned_to);
