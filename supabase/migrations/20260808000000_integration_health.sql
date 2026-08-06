-- Migration: 20260808000000_integration_health.sql
-- Goal: Create tenant-isolated integration_health tracking table and audit logging for system integrations

CREATE TABLE IF NOT EXISTS public.integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  provider_name TEXT NOT NULL, -- IndiaMART, JustDial, TradeIndia, Meta Ads, Google Ads, WhatsApp, Email, Razorpay, Telephony
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, warning, error
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  safe_error_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_company_provider UNIQUE (company_id, provider_name)
);

ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Company Admins & Founders can view & update integration health
DROP POLICY IF EXISTS "Tenant admin integration health view" ON public.integration_health;
CREATE POLICY "Tenant admin integration health view"
ON public.integration_health
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

DROP POLICY IF EXISTS "Tenant admin integration health modify" ON public.integration_health;
CREATE POLICY "Tenant admin integration health modify"
ON public.integration_health
FOR ALL
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

CREATE INDEX IF NOT EXISTS idx_integration_health_company ON public.integration_health(company_id, status);
