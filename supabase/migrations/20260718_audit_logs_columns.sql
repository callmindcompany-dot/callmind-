-- Migration: Add columns to audit_logs table for schema alignment

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing rows so they have a valid created_at
UPDATE public.audit_logs SET created_at = COALESCE(created_at, timestamp, NOW()) WHERE created_at IS NULL;
