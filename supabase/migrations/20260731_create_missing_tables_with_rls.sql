-- Migration: 20260731_create_missing_tables_with_rls.sql
-- Goal: Create missing application tables with Row Level Security (RLS) and company-scoped tenant policies.

-- Helper function check (assumes public.get_my_company_id() exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_company_id') THEN
        CREATE OR REPLACE FUNCTION public.get_my_company_id()
        RETURNS TEXT AS $func$
        BEGIN
            RETURN (
                SELECT company_id 
                FROM public.users 
                WHERE id = auth.uid()::text 
                LIMIT 1
            );
        END;
        $func$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 1. calls
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    agent_id TEXT,
    lead_name TEXT,
    phone TEXT NOT NULL,
    duration TEXT,
    notes TEXT,
    ai_summary TEXT,
    status TEXT DEFAULT 'completed',
    type TEXT DEFAULT 'outgoing',
    interest TEXT,
    outcome TEXT,
    created_by TEXT,
    recording_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_calls ON public.calls;
DROP POLICY IF EXISTS tenant_insert_calls ON public.calls;
DROP POLICY IF EXISTS tenant_update_calls ON public.calls;
DROP POLICY IF EXISTS tenant_delete_calls ON public.calls;

CREATE POLICY tenant_select_calls ON public.calls FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_calls ON public.calls FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_calls ON public.calls FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_calls ON public.calls FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_calls_company_id ON public.calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);

--------------------------------------------------------------------------------
-- 2. lead_notes
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id TEXT,
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_lead_notes ON public.lead_notes;
DROP POLICY IF EXISTS tenant_insert_lead_notes ON public.lead_notes;
DROP POLICY IF EXISTS tenant_update_lead_notes ON public.lead_notes;
DROP POLICY IF EXISTS tenant_delete_lead_notes ON public.lead_notes;

CREATE POLICY tenant_select_lead_notes ON public.lead_notes FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_lead_notes ON public.lead_notes FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_lead_notes ON public.lead_notes FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_lead_notes ON public.lead_notes FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_lead_notes_company_id ON public.lead_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);

--------------------------------------------------------------------------------
-- 3. lead_activity_log
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_lead_activity_log ON public.lead_activity_log;
DROP POLICY IF EXISTS tenant_insert_lead_activity_log ON public.lead_activity_log;
DROP POLICY IF EXISTS tenant_update_lead_activity_log ON public.lead_activity_log;
DROP POLICY IF EXISTS tenant_delete_lead_activity_log ON public.lead_activity_log;

CREATE POLICY tenant_select_lead_activity_log ON public.lead_activity_log FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_lead_activity_log ON public.lead_activity_log FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_lead_activity_log ON public.lead_activity_log FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_lead_activity_log ON public.lead_activity_log FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_company_id ON public.lead_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);

--------------------------------------------------------------------------------
-- 4. comm_logs
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    type TEXT NOT NULL,
    lead_name TEXT,
    contact TEXT,
    details TEXT,
    agent_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comm_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_comm_logs ON public.comm_logs;
DROP POLICY IF EXISTS tenant_insert_comm_logs ON public.comm_logs;
DROP POLICY IF EXISTS tenant_update_comm_logs ON public.comm_logs;
DROP POLICY IF EXISTS tenant_delete_comm_logs ON public.comm_logs;

CREATE POLICY tenant_select_comm_logs ON public.comm_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_comm_logs ON public.comm_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_comm_logs ON public.comm_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_comm_logs ON public.comm_logs FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_comm_logs_company_id ON public.comm_logs(company_id);

--------------------------------------------------------------------------------
-- 5. activity_stream
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    user_name TEXT,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_stream ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_activity_stream ON public.activity_stream;
DROP POLICY IF EXISTS tenant_insert_activity_stream ON public.activity_stream;
DROP POLICY IF EXISTS tenant_update_activity_stream ON public.activity_stream;
DROP POLICY IF EXISTS tenant_delete_activity_stream ON public.activity_stream;

CREATE POLICY tenant_select_activity_stream ON public.activity_stream FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_activity_stream ON public.activity_stream FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_activity_stream ON public.activity_stream FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_activity_stream ON public.activity_stream FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_activity_stream_company_id ON public.activity_stream(company_id);

--------------------------------------------------------------------------------
-- 6. custom_field_definitions
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    select_options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN DEFAULT false,
    validation_rule JSONB DEFAULT '{}'::jsonb,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_custom_field_definitions ON public.custom_field_definitions;
DROP POLICY IF EXISTS tenant_insert_custom_field_definitions ON public.custom_field_definitions;
DROP POLICY IF EXISTS tenant_update_custom_field_definitions ON public.custom_field_definitions;
DROP POLICY IF EXISTS tenant_delete_custom_field_definitions ON public.custom_field_definitions;

CREATE POLICY tenant_select_custom_field_definitions ON public.custom_field_definitions FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_custom_field_definitions ON public.custom_field_definitions FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_custom_field_definitions ON public.custom_field_definitions FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_custom_field_definitions ON public.custom_field_definitions FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_company_id ON public.custom_field_definitions(company_id);

--------------------------------------------------------------------------------
-- 7. report_schedules
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    frequency TEXT NOT NULL,
    recipients TEXT[] NOT NULL DEFAULT '{}',
    metrics TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_report_schedules ON public.report_schedules;
DROP POLICY IF EXISTS tenant_insert_report_schedules ON public.report_schedules;
DROP POLICY IF EXISTS tenant_update_report_schedules ON public.report_schedules;
DROP POLICY IF EXISTS tenant_delete_report_schedules ON public.report_schedules;

CREATE POLICY tenant_select_report_schedules ON public.report_schedules FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_report_schedules ON public.report_schedules FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_report_schedules ON public.report_schedules FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_report_schedules ON public.report_schedules FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_report_schedules_company_id ON public.report_schedules(company_id);

--------------------------------------------------------------------------------
-- 8. export_files
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.export_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.export_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_export_files ON public.export_files;
DROP POLICY IF EXISTS tenant_insert_export_files ON public.export_files;
DROP POLICY IF EXISTS tenant_update_export_files ON public.export_files;
DROP POLICY IF EXISTS tenant_delete_export_files ON public.export_files;

CREATE POLICY tenant_select_export_files ON public.export_files FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY tenant_insert_export_files ON public.export_files FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_update_export_files ON public.export_files FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY tenant_delete_export_files ON public.export_files FOR DELETE USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_export_files_company_id ON public.export_files(company_id);
CREATE INDEX IF NOT EXISTS idx_export_files_created_at ON public.export_files(created_at);

--------------------------------------------------------------------------------
-- 9. billing_intents
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    company_id TEXT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    seats INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    addons TEXT[] NOT NULL DEFAULT '{}',
    total_amount NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.billing_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_billing_intents ON public.billing_intents;
DROP POLICY IF EXISTS "Users can view and insert their company billing intents" ON public.billing_intents;

-- Billing intents: Client-side READ ONLY (Server service_role executes writes/updates)
CREATE POLICY tenant_select_billing_intents ON public.billing_intents FOR SELECT USING (company_id = public.get_my_company_id());

CREATE UNIQUE INDEX IF NOT EXISTS billing_intents_razorpay_payment_id_key
    ON public.billing_intents (razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_intents_company_status_idx
    ON public.billing_intents (company_id, status);
