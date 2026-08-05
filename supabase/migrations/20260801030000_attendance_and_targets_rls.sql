-- Migration: 20260801030000_attendance_and_targets_rls.sql
-- Goal: Create attendance_logs and targets tables with Row Level Security (RLS) and company-scoped tenant policies.

--------------------------------------------------------------------------------
-- 1. attendance_logs
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT,
    type TEXT CHECK (type IN ('punch_in', 'punch_out')),
    location TEXT,
    device_info TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_attendance_logs ON public.attendance_logs;
DROP POLICY IF EXISTS tenant_insert_attendance_logs ON public.attendance_logs;
DROP POLICY IF EXISTS tenant_update_attendance_logs ON public.attendance_logs;
DROP POLICY IF EXISTS tenant_delete_attendance_logs ON public.attendance_logs;

CREATE POLICY tenant_select_attendance_logs ON public.attendance_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_attendance_logs ON public.attendance_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_attendance_logs ON public.attendance_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_attendance_logs ON public.attendance_logs FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_attendance_logs_company_id ON public.attendance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON public.attendance_logs(timestamp);

--------------------------------------------------------------------------------
-- 2. targets
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.targets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    label TEXT NOT NULL,
    target_value INTEGER DEFAULT 0,
    current_value INTEGER DEFAULT 0,
    type TEXT DEFAULT 'custom' CHECK (type IN ('calls', 'leads', 'conversions', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_targets ON public.targets;
DROP POLICY IF EXISTS tenant_insert_targets ON public.targets;
DROP POLICY IF EXISTS tenant_update_targets ON public.targets;
DROP POLICY IF EXISTS tenant_delete_targets ON public.targets;

CREATE POLICY tenant_select_targets ON public.targets FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_targets ON public.targets FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_targets ON public.targets FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_targets ON public.targets FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_targets_company_id ON public.targets(company_id);
