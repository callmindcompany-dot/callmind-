-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- they carry Firestore-era
-- identifiers, not generated UUIDs. Declaring a UUID foreign key against them
-- fails at migration time with 42804 "Key columns are of incompatible types".
-- Same reason leads.id is TEXT.

-- ============================================================================
-- CALLMIND CRM — ENTERPRISE NOTIFICATION CENTER DATABASE SCHEMA (ENHANCED)
-- Migration: 20260801000000_enterprise_notification_center.sql
-- ============================================================================

-- 1. ENUMS FOR NOTIFICATION TYPES, CHANNELS, AND PRIORITIES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM (
            'lead_assigned',
            'lead_updated',
            'followup_reminder',
            'meeting_reminder',
            'task_reminder',
            'approval_required',
            'approval_completed',
            'workflow_completed',
            'workflow_failed',
            'payment_received',
            'invoice_generated',
            'ticket_assigned',
            'ticket_escalated',
            'renewal_reminder',
            'mention',
            'system_alert'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE public.notification_priority AS ENUM (
            'low',
            'medium',
            'high',
            'urgent'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_channel') THEN
        CREATE TYPE public.delivery_channel AS ENUM (
            'in_app',
            'mobile_push',
            'email',
            'whatsapp'
        );
    END IF;
END $$;

-- 2. NOTIFICATIONS MASTER TABLE (WITH EXPRIY & DEEP LINKING)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    priority public.notification_priority NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(512),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    delivery_status JSONB DEFAULT '{"in_app": "delivered", "mobile_push": "pending", "email": "pending", "whatsapp": "pending", "retries": 0}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER & ROLE LEVEL NOTIFICATION PREFERENCES (WITH QUIET HOURS / DND)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    role_scope VARCHAR(50), -- Null for user-level, populated for role-default
    is_company_default BOOLEAN NOT NULL DEFAULT FALSE,
    type public.notification_type NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mobile_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dnd_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dnd_start TIME DEFAULT '22:00:00',
    dnd_end TIME DEFAULT '08:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_pref_user_type UNIQUE (company_id, user_id, type)
);

-- 4. NOTIFICATION TEMPLATES TABLE (ADMIN CUSTOMIZABLE)
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL for system default
    type public.notification_type NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    default_priority public.notification_priority NOT NULL DEFAULT 'medium',
    default_action_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_company_template_type UNIQUE (company_id, type)
);

-- 5. HIGH PERFORMANCE INDEXES FOR 100,000+ ROWS PER TENANT
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_feed 
ON public.notifications(company_id, user_id, is_archived, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_unread 
ON public.notifications(company_id, user_id) 
WHERE is_read = FALSE AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_pinned 
ON public.notifications(company_id, user_id) 
WHERE is_pinned = TRUE AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_expiry 
ON public.notifications(expires_at) 
WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin 
ON public.notifications USING gin (metadata);

-- 6. ROW-LEVEL SECURITY (RLS) POLICIES & TELECALLER FINANCE MASKING
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Notifications RLS: Telecaller restricted from financial notifications
DROP POLICY IF EXISTS "Users view own tenant notifications" ON public.notifications;
CREATE POLICY "Users view own tenant notifications" ON public.notifications
    FOR SELECT USING (
        company_id = public.get_my_company_id() 
        AND user_id = auth.uid()
        AND (
            -- Telecallers cannot view financial notifications (payment/invoice/renewal)
            public.get_my_role() != 'telecaller' 
            OR type NOT IN ('payment_received', 'invoice_generated', 'renewal_reminder')
        )
    );

DROP POLICY IF EXISTS "Users update own tenant notifications" ON public.notifications;
CREATE POLICY "Users update own tenant notifications" ON public.notifications
    FOR UPDATE USING (
        company_id = public.get_my_company_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users delete own tenant notifications" ON public.notifications;
CREATE POLICY "Users delete own tenant notifications" ON public.notifications
    FOR DELETE USING (
        company_id = public.get_my_company_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Service Role full access notifications" ON public.notifications;
CREATE POLICY "Service Role full access notifications" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);

-- 7. AUTO EXPIRY & CLEANUP FUNCTION (Cron Runner)
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS VOID AS $$
BEGIN
    -- Delete notifications older than 90 days or past explicit expires_at
    DELETE FROM public.notifications
    WHERE expires_at < NOW() OR (created_at < NOW() - INTERVAL '90 days' AND is_pinned = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. REALTIME PUBLICATION ENABLEMENT
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
