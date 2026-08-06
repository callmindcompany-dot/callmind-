-- Migration: 20260813000000_lead_sources.sql
-- Description: Creates lead_sources table with RLS, credential encryption helpers, and adds hold_outbound_trigger column to leads table

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Create lead_sources table
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  credentials JSONB DEFAULT '{}'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  automation_rules JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for tenant query performance
CREATE INDEX IF NOT EXISTS idx_lead_sources_company ON public.lead_sources(company_id);

-- 3. Enable RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- 4. Tenant RLS policies (following tenant_<action>_<table> convention)
DROP POLICY IF EXISTS tenant_select_lead_sources ON public.lead_sources;
CREATE POLICY tenant_select_lead_sources ON public.lead_sources
  FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS tenant_insert_lead_sources ON public.lead_sources;
CREATE POLICY tenant_insert_lead_sources ON public.lead_sources
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS tenant_update_lead_sources ON public.lead_sources;
CREATE POLICY tenant_update_lead_sources ON public.lead_sources
  FOR UPDATE USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS tenant_delete_lead_sources ON public.lead_sources;
CREATE POLICY tenant_delete_lead_sources ON public.lead_sources
  FOR DELETE USING (company_id = public.get_my_company_id());

-- 5. Helper functions for pgcrypto symmetric encryption of sensitive API credentials
CREATE OR REPLACE FUNCTION public.encrypt_credentials(payload text, secret text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(pgp_sym_encrypt(payload, secret), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.decrypt_credentials(encrypted_payload text, secret text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT pgp_sym_decrypt(decode(encrypted_payload, 'hex'), secret);
$$;

-- 6. Add hold_outbound_trigger column to leads table for Night Hold Release cron in src/routes/leads.ts
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hold_outbound_trigger BOOLEAN DEFAULT FALSE;
