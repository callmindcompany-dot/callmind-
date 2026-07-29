-- Migration: Cleanup Settings, Logs, and Schema Additions

-- Add is_archived to announcements if it doesn't exist
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create Cleanup Settings table
CREATE TABLE IF NOT EXISTS cleanup_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    chats_enabled BOOLEAN DEFAULT true,
    logs_enabled BOOLEAN DEFAULT true,
    leads_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    exports_enabled BOOLEAN DEFAULT true,
    trials_enabled BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Cleanup Logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    records_deleted INTEGER DEFAULT 0,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed'))
);

-- Enable RLS
ALTER TABLE cleanup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to cleanup_settings" ON cleanup_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cleanup_logs" ON cleanup_logs FOR ALL USING (true) WITH CHECK (true);
