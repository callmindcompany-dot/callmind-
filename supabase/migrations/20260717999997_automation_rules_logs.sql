-- Migration: Update automation_rules table constraints and add logs table

-- 1. Drop check constraints if they exist
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS automation_rules_action_type_check;

-- 2. Add JSONB config columns
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS actions_config JSONB DEFAULT '[]'::jsonb;

-- 3. Create automation_logs table
--
-- This file had no timestamp, so it sorted after every 2026* migration and the
-- runner's hand-written sequence left it out entirely. That is why
-- automation_logs did not exist while 20260718_secure_rls.sql expected it.
-- Renamed from automation_rules_migration.sql to run in dependency order:
-- ...996 creates automation_rules, this adds to it.
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rule_id      UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
    -- TEXT, not UUID. leads.id is TEXT, and execute-automation-rules inserts
    -- lead.id straight into this column -- as UUID every one of those inserts
    -- would have raised 22P02 the moment the table existed.
    lead_id      TEXT,
    trigger_type TEXT,
    action_type  TEXT,
    status       TEXT,
    error_message TEXT,
    executed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- The retention sweep in data-cleanup-cron filters on created_at, which the
    -- original definition did not have.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CREATE TABLE IF NOT EXISTS silently skips every column when the table already
-- exists, which is how companies.active_members_count came to be missing. State
-- the columns that matter explicitly so a partially-created table is repaired.
ALTER TABLE public.automation_logs ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.automation_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 20260718_secure_rls.sql keys tenant_automation_logs_* on company_id, and the
-- cleanup cron scopes its delete by it, so it has to be indexed.
CREATE INDEX IF NOT EXISTS idx_automation_logs_company_executed
  ON public.automation_logs (company_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_company_created
  ON public.automation_logs (company_id, created_at);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
