-- Migration: Update automation_rules table constraints and add logs table

-- 1. Drop check constraints if they exist
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS automation_rules_action_type_check;

-- 2. Add JSONB config columns
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS actions_config JSONB DEFAULT '[]'::jsonb;

-- 3. Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
    lead_id UUID,
    trigger_type TEXT,
    action_type TEXT,
    status TEXT,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
