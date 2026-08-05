-- Migration: 20260806000000_call_idempotency.sql
-- Goal: Add idempotency_key to public.calls to prevent duplicate call log inserts during offline sync retries

ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index per company to ensure idempotent retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_company_idempotency 
ON public.calls (company_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
