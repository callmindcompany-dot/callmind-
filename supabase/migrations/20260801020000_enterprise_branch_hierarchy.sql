-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- they carry Firestore-era
-- identifiers, not generated UUIDs. Declaring a UUID foreign key against them
-- fails at migration time with 42804, "Key columns are of incompatible types".
-- leads.id is TEXT for the same reason.

-- ============================================================================
-- CALLMIND CRM — ENTERPRISE BRANCH / REGION HIERARCHY SCHEMA
-- Migration: 20260801020000_enterprise_branch_hierarchy.sql
-- ============================================================================

-- 1. ADD FEATURE TOGGLE TO COMPANIES TABLE
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS enable_branch_management BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS default_branch_id UUID;

-- 2. REGIONS TABLE
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_region_company_name UNIQUE (company_id, name)
);

-- 3. STATES HIERARCHY TABLE
CREATE TABLE IF NOT EXISTS public.states_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_state_company_name UNIQUE (company_id, name)
);

-- 4. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    state_id UUID REFERENCES public.states_hierarchy(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30),
    city VARCHAR(100),
    address TEXT,
    is_main_branch BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_branch_company_name UNIQUE (company_id, name)
);

-- 5. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_department_branch_name UNIQUE (company_id, branch_id, name)
);

-- 6. ADD HIERARCHY FOREIGN KEYS TO EXISTING CORE TABLES
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states_hierarchy(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- `teams` and `tasks` are not altered here. Neither table exists in this
-- database, no migration creates one, and nothing in src/ or
-- supabase/functions/ queries either -- they were assumed rather than built.
-- ALTER TABLE has no IF EXISTS for the table itself, so referencing them fails
-- the whole migration with 42P01.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states_hierarchy(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 7. PERFORMANCE INDEXES FOR 100,000+ LEADS & FAST FILTERING
CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_hierarchy ON public.users(company_id, branch_id, department_id);
CREATE INDEX IF NOT EXISTS idx_leads_hierarchy ON public.leads(company_id, branch_id, region_id, department_id);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(company_id, city);

-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own company regions" ON public.regions;
CREATE POLICY "Users view own company regions" ON public.regions
    FOR ALL USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users view own company states" ON public.states_hierarchy;
CREATE POLICY "Users view own company states" ON public.states_hierarchy
    FOR ALL USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users view own company branches" ON public.branches;
CREATE POLICY "Users view own company branches" ON public.branches
    FOR ALL USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Users view own company departments" ON public.departments;
CREATE POLICY "Users view own company departments" ON public.departments
    FOR ALL USING (company_id = public.get_my_company_id());

-- 9. DATA BACKFILL & MIGRATION TRIGGER FOR EXISTING COMPANIES
CREATE OR REPLACE FUNCTION public.migrate_existing_company_branches()
RETURNS VOID AS $$
DECLARE
    comp RECORD;
    new_branch_id UUID;
BEGIN
    FOR comp IN SELECT id, name FROM public.companies LOOP
        -- Create default "Main Branch" if company has no default branch
        IF NOT EXISTS (SELECT 1 FROM public.branches WHERE company_id = comp.id AND is_main_branch = TRUE) THEN
            INSERT INTO public.branches (company_id, name, code, is_main_branch, is_active)
            VALUES (comp.id, 'Main Branch', 'MAIN', TRUE, TRUE)
            RETURNING id INTO new_branch_id;

            UPDATE public.companies SET default_branch_id = new_branch_id WHERE id = comp.id;

            -- Assign existing unassigned users and leads to default main branch
            UPDATE public.users SET branch_id = new_branch_id WHERE company_id = comp.id AND branch_id IS NULL;
            UPDATE public.leads SET branch_id = new_branch_id WHERE company_id = comp.id AND branch_id IS NULL;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute migration function immediately
SELECT public.migrate_existing_company_branches();
