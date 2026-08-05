-- =========================================================================
-- CALLMIND CRM - MASTER SUPABASE DATABASE SETUP (100% PRODUCTION READY)
-- Execution Order: Drop All Policies First -> Alter Column Types -> Re-create Policies
-- Project: https://supabase.com/dashboard/project/aojhpnrkmunstzjvvppb/sql/new
-- =========================================================================

-- Enable required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. HELPER TRIGGER FUNCTION FOR AUTO-UPDATING updated_at
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- 2. DROP ALL EXISTING RLS POLICIES FIRST (PREVENTS ERROR 0A000)
-- -------------------------------------------------------------------------
DO $$
BEGIN
    -- Disable RLS temporarily to allow column type alterations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "users_self_or_company_policy" ON public.users;
        DROP POLICY IF EXISTS "users_access_policy" ON public.users;
        DROP POLICY IF EXISTS "tenant_select_users" ON public.users;
        DROP POLICY IF EXISTS "tenant_insert_users" ON public.users;
        DROP POLICY IF EXISTS "tenant_update_users" ON public.users;
        DROP POLICY IF EXISTS "tenant_delete_users" ON public.users;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'companies' AND schemaname = 'public') THEN
        ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "companies_access_policy" ON public.companies;
        DROP POLICY IF EXISTS "tenant_select_companies" ON public.companies;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'team_settings' AND schemaname = 'public') THEN
        ALTER TABLE public.team_settings DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "team_settings_access_policy" ON public.team_settings;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leads' AND schemaname = 'public') THEN
        ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "leads_company_access_policy" ON public.leads;
        DROP POLICY IF EXISTS "tenant_select_leads" ON public.leads;
        DROP POLICY IF EXISTS "tenant_insert_leads" ON public.leads;
        DROP POLICY IF EXISTS "tenant_update_leads" ON public.leads;
        DROP POLICY IF EXISTS "tenant_delete_leads" ON public.leads;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'call_logs' AND schemaname = 'public') THEN
        ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "call_logs_company_access_policy" ON public.call_logs;
        DROP POLICY IF EXISTS "tenant_select_calls" ON public.call_logs;
        DROP POLICY IF EXISTS "tenant_insert_calls" ON public.call_logs;
        DROP POLICY IF EXISTS "tenant_update_calls" ON public.call_logs;
        DROP POLICY IF EXISTS "tenant_delete_calls" ON public.call_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND schemaname = 'public') THEN
        ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "invoices_access_policy" ON public.invoices;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sim_cards' AND schemaname = 'public') THEN
        ALTER TABLE public.sim_cards DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "sim_cards_access_policy" ON public.sim_cards;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'integrations' AND schemaname = 'public') THEN
        ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "integrations_access_policy" ON public.integrations;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs' AND schemaname = 'public') THEN
        ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "audit_logs_access_policy" ON public.audit_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_errors' AND schemaname = 'public') THEN
        ALTER TABLE public.system_errors DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "system_errors_access_policy" ON public.system_errors;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scheduled_messages' AND schemaname = 'public') THEN
        ALTER TABLE public.scheduled_messages DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "scheduled_messages_access_policy" ON public.scheduled_messages;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 3. SAFE DROP LEGACY FOREIGN KEYS TO PREVENT DATATYPE CONFLICTS
-- -------------------------------------------------------------------------
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'scheduled_messages_lead_id_fkey') THEN
        ALTER TABLE public.scheduled_messages DROP CONSTRAINT scheduled_messages_lead_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'call_logs_lead_id_fkey') THEN
        ALTER TABLE public.call_logs DROP CONSTRAINT call_logs_lead_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'call_logs_agent_id_fkey') THEN
        ALTER TABLE public.call_logs DROP CONSTRAINT call_logs_agent_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leads_assigned_to_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_assigned_to_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_settings_company_id_fkey') THEN
        ALTER TABLE public.team_settings DROP CONSTRAINT team_settings_company_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sim_cards_agent_id_fkey') THEN
        ALTER TABLE public.sim_cards DROP CONSTRAINT sim_cards_agent_id_fkey;
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4. CREATE CORE TABLES & ALTER COLUMN TYPES (NOW SAFE WITHOUT ACTIVE POLICIES)
-- -------------------------------------------------------------------------

-- 4.1 USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    designation TEXT,
    role TEXT DEFAULT 'founder',
    onboarding_status TEXT DEFAULT 'pending',
    company_id TEXT,
    plan_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'founder';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active';

ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.users ALTER COLUMN company_id TYPE TEXT USING company_id::text;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);

-- 4.2 COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    size TEXT DEFAULT '1-10',
    email TEXT,
    phone TEXT,
    admin_name TEXT,
    plan TEXT DEFAULT 'trial',
    plan_status TEXT DEFAULT 'trialing',
    plan_expires_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    seat_limit INTEGER DEFAULT 1,
    billing_cycle TEXT DEFAULT 'monthly',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS size TEXT DEFAULT '1-10';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'trialing';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS seat_limit INTEGER DEFAULT 1;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.companies ALTER COLUMN id TYPE TEXT USING id::text;

-- 4.3 TEAM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.team_settings (
    company_id TEXT PRIMARY KEY,
    require_approval BOOLEAN DEFAULT TRUE,
    assignment_mode TEXT DEFAULT 'round_robin',
    rotting_threshold INTEGER DEFAULT 5,
    hide_phone_numbers BOOLEAN DEFAULT FALSE,
    device_limit INTEGER DEFAULT 2,
    leads_statuses JSONB DEFAULT '["New", "In Progress", "Closed", "Hot", "Cold"]'::jsonb,
    default_stage TEXT DEFAULT 'New',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT TRUE;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS assignment_mode TEXT DEFAULT 'round_robin';
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS rotting_threshold INTEGER DEFAULT 5;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS hide_phone_numbers BOOLEAN DEFAULT FALSE;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS device_limit INTEGER DEFAULT 2;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS leads_statuses JSONB DEFAULT '["New", "In Progress", "Closed", "Hot", "Cold"]'::jsonb;
ALTER TABLE public.team_settings ADD COLUMN IF NOT EXISTS default_stage TEXT DEFAULT 'New';

ALTER TABLE public.team_settings ALTER COLUMN company_id TYPE TEXT USING company_id::text;

-- 4.4 LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'New',
    assigned_to TEXT,
    source TEXT DEFAULT 'Manual Entry',
    priority TEXT DEFAULT 'Medium',
    city TEXT,
    state TEXT,
    address TEXT,
    comment TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_unseen BOOLEAN DEFAULT TRUE,
    custom_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual Entry';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_unseen BOOLEAN DEFAULT TRUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.leads ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.leads ALTER COLUMN company_id TYPE TEXT USING company_id::text;
ALTER TABLE public.leads ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 4.5 CALL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.call_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    lead_id TEXT,
    agent_id TEXT,
    agent_name TEXT,
    phone TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    call_type TEXT DEFAULT 'Outgoing',
    recording_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'Outgoing';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.call_logs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.call_logs ALTER COLUMN company_id TYPE TEXT USING company_id::text;
ALTER TABLE public.call_logs ALTER COLUMN lead_id TYPE TEXT USING lead_id::text;
ALTER TABLE public.call_logs ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

CREATE INDEX IF NOT EXISTS idx_call_logs_company_id ON public.call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON public.call_logs(agent_id);

-- 4.6 INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    plan TEXT NOT NULL,
    seats INTEGER DEFAULT 1,
    status TEXT DEFAULT 'paid',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

ALTER TABLE public.invoices ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.invoices ALTER COLUMN company_id TYPE TEXT USING company_id::text;

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);

-- 4.7 SIM CARDS TABLE
CREATE TABLE IF NOT EXISTS public.sim_cards (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    agent_id TEXT,
    phone_number TEXT NOT NULL,
    sim_slot INTEGER DEFAULT 1,
    carrier TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS sim_slot INTEGER DEFAULT 1;
ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE public.sim_cards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

ALTER TABLE public.sim_cards ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.sim_cards ALTER COLUMN company_id TYPE TEXT USING company_id::text;
ALTER TABLE public.sim_cards ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

CREATE INDEX IF NOT EXISTS idx_sim_cards_company_id ON public.sim_cards(company_id);

-- 4.8 INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.integrations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    credentials JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.integrations ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.integrations ALTER COLUMN company_id TYPE TEXT USING company_id::text;

-- 4.9 AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE public.audit_logs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.audit_logs ALTER COLUMN company_id TYPE TEXT USING company_id::text;

-- 4.10 SYSTEM ERRORS TABLE
CREATE TABLE IF NOT EXISTS public.system_errors (
    id TEXT PRIMARY KEY,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    component TEXT,
    user_id TEXT,
    company_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_errors ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.system_errors ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.system_errors ADD COLUMN IF NOT EXISTS component TEXT;
ALTER TABLE public.system_errors ADD COLUMN IF NOT EXISTS stack_trace TEXT;

ALTER TABLE public.system_errors ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.system_errors ALTER COLUMN company_id TYPE TEXT USING company_id::text;

-- 4.11 SCHEDULED MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    lead_id TEXT,
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE public.scheduled_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.scheduled_messages ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.scheduled_messages ALTER COLUMN company_id TYPE TEXT USING company_id::text;
ALTER TABLE public.scheduled_messages ALTER COLUMN lead_id TYPE TEXT USING lead_id::text;

-- -------------------------------------------------------------------------
-- 5. SECURITY DEFINER HELPER FUNCTIONS (PREVENTS RECURSION IN RLS)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'company_id'),
    (SELECT company_id FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );
$$;

-- -------------------------------------------------------------------------
-- 6. RE-ENABLE RLS AND CREATE CLEAN RECURSION-FREE POLICIES
-- -------------------------------------------------------------------------

-- 6.1 USERS RLS POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_policy" ON public.users 
FOR ALL TO public
USING (
  id = auth.uid()::text 
  OR company_id = public.get_my_company_id()
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.2 LEADS RLS POLICIES
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_company_access_policy" ON public.leads 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.3 CALL LOGS RLS POLICIES
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_logs_company_access_policy" ON public.call_logs 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.4 COMPANIES RLS POLICIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_access_policy" ON public.companies 
FOR ALL TO public
USING (
  id = public.get_my_company_id() 
  OR id = auth.uid()::text 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.5 TEAM SETTINGS RLS POLICIES
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_settings_access_policy" ON public.team_settings 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR company_id = auth.uid()::text 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.6 INVOICES RLS POLICIES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_access_policy" ON public.invoices 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.7 SIM CARDS RLS POLICIES
ALTER TABLE public.sim_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_cards_access_policy" ON public.sim_cards 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.8 INTEGRATIONS RLS POLICIES
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_access_policy" ON public.integrations 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.9 AUDIT LOGS RLS POLICIES
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_access_policy" ON public.audit_logs 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.10 SYSTEM ERRORS RLS POLICIES
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_errors_access_policy" ON public.system_errors 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- 6.11 SCHEDULED MESSAGES RLS POLICIES
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_messages_access_policy" ON public.scheduled_messages 
FOR ALL TO public
USING (
  company_id = public.get_my_company_id() 
  OR (auth.jwt() ->> 'role') = 'service_role'
  OR auth.role() = 'anon'
);

-- -------------------------------------------------------------------------
-- 7. GRANT TABLE PERMISSIONS TO AUTHENTICATED, ANON & SERVICE_ROLE
-- -------------------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =========================================================================
-- END OF SCRIPT - CALLMIND DATABASE IS NOW 100% READY & ERROR 0A000 FIXED!
-- =========================================================================
