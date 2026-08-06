-- Supabase Migration Script for Scheduled Messages, Opt-outs, and Rules
-- Run this in your Supabase SQL Editor.

-- Create scheduled_messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    content TEXT NOT NULL,
    subject TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for quick scheduled polls
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status, scheduled_for);

-- Add opted_out column to leads if it does not exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT FALSE;

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'no_reply')),
    trigger_keywords TEXT[] DEFAULT '{}',
    trigger_hours INTEGER DEFAULT 24,
    action_type TEXT DEFAULT 'send_template' CHECK (action_type IN ('send_template')),
    action_template_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
