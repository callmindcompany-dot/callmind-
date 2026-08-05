-- Migration: 20260805000000_lead_sla_reassignment.sql
-- Goal: Lead SLA Tracking & Auto-Reassignment System with RLS and Audit Triggers

-- 1. Add SLA tracking fields to public.leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS callback_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reassignment_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_manually_protected BOOLEAN DEFAULT FALSE;

-- Indexes for SLA query performance
CREATE INDEX IF NOT EXISTS idx_leads_sla_breached ON public.leads(company_id, sla_breached) WHERE sla_breached = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_callback_deadline ON public.leads(company_id, callback_deadline) WHERE callback_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON public.leads(company_id, last_contact_at);

--------------------------------------------------------------------------------
-- 2. Company SLA Settings Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_sla_settings (
    company_id TEXT PRIMARY KEY,
    new_lead_response_time_mins INT DEFAULT 15,
    overdue_callback_buffer_mins INT DEFAULT 30,
    stale_lead_threshold_days INT DEFAULT 7,
    auto_reassign_enabled BOOLEAN DEFAULT TRUE,
    reassign_rotation_mode TEXT DEFAULT 'round_robin',
    excluded_statuses TEXT[] DEFAULT ARRAY['Converted', 'Lost', 'Not Interested'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_sla_settings ENABLE ROW LEVEL SECURITY;

-- Tenant RLS Policies
DROP POLICY IF EXISTS tenant_select_company_sla_settings ON public.company_sla_settings;
DROP POLICY IF EXISTS tenant_insert_company_sla_settings ON public.company_sla_settings;
DROP POLICY IF EXISTS tenant_update_company_sla_settings ON public.company_sla_settings;
DROP POLICY IF EXISTS tenant_delete_company_sla_settings ON public.company_sla_settings;

CREATE POLICY tenant_select_company_sla_settings ON public.company_sla_settings
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY tenant_insert_company_sla_settings ON public.company_sla_settings
    FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY tenant_update_company_sla_settings ON public.company_sla_settings
    FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY tenant_delete_company_sla_settings ON public.company_sla_settings
    FOR DELETE USING (company_id = public.get_my_company_id());

--------------------------------------------------------------------------------
-- 3. Default SLA Settings Seed for existing companies
--------------------------------------------------------------------------------
INSERT INTO public.company_sla_settings (company_id)
SELECT DISTINCT company_id FROM public.users WHERE company_id IS NOT NULL AND company_id != ''
ON CONFLICT (company_id) DO NOTHING;
