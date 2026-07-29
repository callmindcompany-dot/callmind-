-- CallMind Supabase Database Initialization Schema
-- This script creates all required PostgreSQL tables, indexes, constraints,
-- and auto-updating timestamp triggers.
-- Copy and run this script in the Supabase SQL Editor.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- 1. TRIGGER FUNCTION FOR AUTO-UPDATING updated_at
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------
-- 2. USERS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Maps to Firebase UID / Supabase Auth ID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    designation TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('founder', 'tester', 'user')),
    onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'completed')),
    company_id TEXT,
    plan_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching user email and company mapping quickly
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 3. LEADS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, -- Custom generated lead ID / Firestore ID
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Call Back', 'Not Required', 'Converted', 'Rejected', 'Not Interested')),
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    source TEXT,
    priority TEXT,
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

-- Optimization indices for frequently searched and filtered CRM properties
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TRIGGER trigger_update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 4. FOUNDER CONFIGS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS founder_configs (
    id TEXT PRIMARY KEY, -- Typically 'founder_config' or company-specific key
    plan TEXT DEFAULT 'Growth',
    trial_end TIMESTAMPTZ,
    status TEXT DEFAULT 'Active',
    company_id TEXT,
    role TEXT,
    assignment_rule TEXT DEFAULT 'RoundRobin',
    routing_exclude_inactive BOOLEAN DEFAULT TRUE,
    routing_overflow_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_configs_company_id ON founder_configs(company_id);

CREATE TRIGGER trigger_update_founder_configs_updated_at
BEFORE UPDATE ON founder_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 5. LEAD SOURCES TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_sources (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    credentials JSONB DEFAULT '{}'::jsonb,
    field_mapping JSONB DEFAULT '{}'::jsonb,
    automation_rules JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_company_id ON lead_sources(company_id);

CREATE TRIGGER trigger_update_lead_sources_updated_at
BEFORE UPDATE ON lead_sources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 6. AUTOMATIONS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    runs_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_company_id ON automations(company_id);

CREATE TRIGGER trigger_update_automations_updated_at
BEFORE UPDATE ON automations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 7. SEQUENCES TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS sequences (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    steps JSONB DEFAULT '[]'::jsonb,
    last_modified TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_company_id ON sequences(company_id);

CREATE TRIGGER trigger_update_sequences_updated_at
BEFORE UPDATE ON sequences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 8. TRIAL EVENTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS trial_events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_events_company_id ON trial_events(company_id);

-- ----------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    category TEXT,
    target TEXT,
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ----------------------------------------------------
-- 10. CALLS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    lead_id TEXT,
    lead_name TEXT,
    phone TEXT NOT NULL,
    duration TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'busy', 'failed')),
    ai_summary TEXT,
    type TEXT DEFAULT 'outgoing' CHECK (type IN ('incoming', 'outgoing')),
    interest TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_by ON calls(created_by);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

CREATE TRIGGER trigger_update_calls_updated_at
BEFORE UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 11. ATTENDANCE LOGS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    type TEXT CHECK (type IN ('punch_in', 'punch_out')),
    location TEXT,
    device_info TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_company_id ON attendance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON attendance_logs(user_id);

-- ----------------------------------------------------
-- 12. TARGETS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    label TEXT NOT NULL,
    target_value INTEGER DEFAULT 0,
    current_value INTEGER DEFAULT 0,
    type TEXT DEFAULT 'custom' CHECK (type IN ('calls', 'leads', 'conversions', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_targets_company_id ON targets(company_id);

CREATE TRIGGER trigger_update_targets_updated_at
BEFORE UPDATE ON targets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 13. ANNOUNCEMENTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled')),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON announcements(company_id);

CREATE TRIGGER trigger_update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 14. JOIN REQUESTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT,
    language TEXT,
    requested_via TEXT,
    join_code TEXT,
    token TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    processed_at TIMESTAMPTZ,
    processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_company_id ON join_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);

-- ----------------------------------------------------
-- 15. INVITES TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    token TEXT,
    join_code TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'revoked_member_removed', 'revoked_plan_downgrade', 'revoked_by_new_qr')),
    used_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_company_id ON invites(company_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);

CREATE TRIGGER trigger_update_invites_updated_at
BEFORE UPDATE ON invites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 16. AGENT STATUS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_status (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    company_id TEXT NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('active', 'on_call', 'offline')),
    location TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_status_company_id ON agent_status(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);

CREATE TRIGGER trigger_update_agent_status_updated_at
BEFORE UPDATE ON agent_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------
-- 17. ROUTING STATE TABLE FOR ATOMIC ROUND ROBIN
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS routing_state (
    id TEXT PRIMARY KEY, -- company_id + '_' + source
    company_id TEXT NOT NULL,
    source TEXT NOT NULL,
    last_assigned_index INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_state_company_id ON routing_state(company_id);

-- RPC Function for Atomic Round-Robin Routing Index Increment
CREATE OR REPLACE FUNCTION increment_routing_index(
    p_company_id TEXT,
    p_source TEXT,
    p_agent_count INT
) RETURNS INT AS $$
DECLARE
    v_next_index INT;
BEGIN
    IF p_agent_count <= 0 THEN
        RETURN 0;
    END IF;

    INSERT INTO routing_state (id, company_id, source, last_assigned_index, updated_at)
    VALUES (p_company_id || '_' || p_source, p_company_id, p_source, 0, NOW())
    ON CONFLICT (id) DO UPDATE
    SET last_assigned_index = (routing_state.last_assigned_index + 1) % p_agent_count,
        updated_at = NOW()
    RETURNING last_assigned_index INTO v_next_index;

    RETURN v_next_index;
END;
$$ LANGUAGE plpgsql;

