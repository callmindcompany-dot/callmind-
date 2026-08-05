-- Migration: 20260810000000_rbac_permissions.sql
-- Goal: Modular Role-Based Access Control (RBAC) permissions table and self-escalation triggers

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  role TEXT NOT NULL, -- founder, admin, manager, team_lead, telecaller
  module TEXT NOT NULL, -- leads, calls, users, billing, integrations, settings, whatsapp
  actions TEXT[] NOT NULL DEFAULT '{"view"}', -- view, create, update, delete, export, assign, approve
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_company_role_module UNIQUE (company_id, role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only Founder can modify role permissions
CREATE POLICY "Tenant role permissions view"
ON public.role_permissions
FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

CREATE POLICY "Tenant founder role permissions modify"
ON public.role_permissions
FOR ALL TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() = 'founder'
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() = 'founder'
);

-- Trigger: Prevent users from self-updating their role or company_id in public.users
CREATE OR REPLACE FUNCTION public.prevent_self_role_company_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is updating their own record and is not a founder, block role or company change
  IF (auth.uid() = OLD.id AND public.get_my_role() != 'founder') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Self role escalation is prohibited.';
    END IF;
    IF (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
      RAISE EXCEPTION 'Self company change is prohibited.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_company_escalation();

CREATE INDEX IF NOT EXISTS idx_role_perm_company ON public.role_permissions(company_id, role, module);
