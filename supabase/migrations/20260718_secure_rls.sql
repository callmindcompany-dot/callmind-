-- Migration: Secure RLS Policies
-- Created: 2026-07-18
-- Framework: Elite Software Audit Council v2 (Post-Remediation Check)

BEGIN;

-- Helper functions to resolve company_id and role while preventing RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt()->'app_metadata'->>'company_id';
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt()->'app_metadata'->>'role';
$$;

-- Atomic increment function to avoid round-robin lead assignment race conditions
CREATE OR REPLACE FUNCTION public.increment_routing_index(
  p_company_id TEXT,
  p_source TEXT,
  p_agent_count INTEGER
)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_next_index INTEGER;
BEGIN
  IF p_agent_count <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.routing_state (id, company_id, source, last_assigned_index, updated_at)
  VALUES (p_company_id || '_' || p_source, p_company_id, p_source, 0, now())
  ON CONFLICT (id) DO UPDATE
  SET last_assigned_index = (routing_state.last_assigned_index + 1) % p_agent_count,
      updated_at = now()
  RETURNING last_assigned_index INTO v_next_index;
  
  RETURN v_next_index;
END;
$$;

-- ----------------- 1. TABLES WITH COMPANY_ID -----------------

-- leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_leads_policy" ON public.leads;
DROP POLICY IF EXISTS "tenant_select_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_insert_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_update_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_delete_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_policy" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_select" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_insert" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_update" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads_delete" ON public.leads;

CREATE POLICY "tenant_leads_select" ON public.leads FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_leads_insert" ON public.leads FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_leads_update" ON public.leads FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_leads_delete" ON public.leads FOR DELETE USING (company_id = public.get_my_company_id());

-- calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_calls_policy" ON public.calls;
DROP POLICY IF EXISTS "tenant_select_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_insert_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_update_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_delete_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_calls_policy" ON public.calls;
DROP POLICY IF EXISTS "tenant_calls_select" ON public.calls;
DROP POLICY IF EXISTS "tenant_calls_insert" ON public.calls;
DROP POLICY IF EXISTS "tenant_calls_update" ON public.calls;
DROP POLICY IF EXISTS "tenant_calls_delete" ON public.calls;

CREATE POLICY "tenant_calls_select" ON public.calls FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_calls_insert" ON public.calls FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_calls_update" ON public.calls FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_calls_delete" ON public.calls FOR DELETE USING (company_id = public.get_my_company_id());

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_users_policy" ON public.users;
DROP POLICY IF EXISTS "tenant_select_users" ON public.users;
DROP POLICY IF EXISTS "tenant_insert_users" ON public.users;
DROP POLICY IF EXISTS "tenant_update_users" ON public.users;
DROP POLICY IF EXISTS "tenant_delete_users" ON public.users;
DROP POLICY IF EXISTS "tenant_users_policy" ON public.users;
DROP POLICY IF EXISTS "tenant_users_select" ON public.users;
DROP POLICY IF EXISTS "tenant_users_insert" ON public.users;
DROP POLICY IF EXISTS "tenant_users_update" ON public.users;
DROP POLICY IF EXISTS "tenant_users_delete" ON public.users;

CREATE POLICY "tenant_users_select" ON public.users FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_users_insert" ON public.users FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_users_update" ON public.users FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_users_delete" ON public.users FOR DELETE USING (company_id = public.get_my_company_id());
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users FOR SELECT USING (id = auth.uid()::text);

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_audit_logs_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_insert_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_update_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_delete_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_audit_logs_delete" ON public.audit_logs;

CREATE POLICY "tenant_audit_logs_select" ON public.audit_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_audit_logs_update" ON public.audit_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_audit_logs_delete" ON public.audit_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- sequences
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_sequences_policy" ON public.sequences;
DROP POLICY IF EXISTS "tenant_select_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_insert_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_update_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_delete_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_sequences_policy" ON public.sequences;
DROP POLICY IF EXISTS "tenant_sequences_select" ON public.sequences;
DROP POLICY IF EXISTS "tenant_sequences_insert" ON public.sequences;
DROP POLICY IF EXISTS "tenant_sequences_update" ON public.sequences;
DROP POLICY IF EXISTS "tenant_sequences_delete" ON public.sequences;

CREATE POLICY "tenant_sequences_select" ON public.sequences FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_sequences_insert" ON public.sequences FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_sequences_update" ON public.sequences FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_sequences_delete" ON public.sequences FOR DELETE USING (company_id = public.get_my_company_id());

-- ai_config
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_ai_config_policy" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_select_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_insert_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_update_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_delete_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_ai_config_policy" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_ai_config_select" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_ai_config_insert" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_ai_config_update" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_ai_config_delete" ON public.ai_config;

CREATE POLICY "tenant_ai_config_select" ON public.ai_config FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_config_insert" ON public.ai_config FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_config_update" ON public.ai_config FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_config_delete" ON public.ai_config FOR DELETE USING (company_id = public.get_my_company_id());

-- ai_faqs
ALTER TABLE public.ai_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_ai_faqs_policy" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_select_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_insert_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_update_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_delete_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_ai_faqs_policy" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_ai_faqs_select" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_ai_faqs_insert" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_ai_faqs_update" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_ai_faqs_delete" ON public.ai_faqs;

CREATE POLICY "tenant_ai_faqs_select" ON public.ai_faqs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_faqs_insert" ON public.ai_faqs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_faqs_update" ON public.ai_faqs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_ai_faqs_delete" ON public.ai_faqs FOR DELETE USING (company_id = public.get_my_company_id());

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_announcements_policy" ON public.announcements;
DROP POLICY IF EXISTS "tenant_select_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_insert_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_update_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_delete_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_announcements_policy" ON public.announcements;
DROP POLICY IF EXISTS "tenant_announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "tenant_announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "tenant_announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "tenant_announcements_delete" ON public.announcements;

CREATE POLICY "tenant_announcements_select" ON public.announcements FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_announcements_insert" ON public.announcements FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_announcements_update" ON public.announcements FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_announcements_delete" ON public.announcements FOR DELETE USING (company_id = public.get_my_company_id());

-- announcement_reads
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_announcement_reads_policy" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_select_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_insert_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_update_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_delete_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_announcement_reads_policy" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_announcement_reads_select" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_announcement_reads_insert" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_announcement_reads_update" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_announcement_reads_delete" ON public.announcement_reads;

-- announcement_reads has no company_id and does not need one. It is a join
-- table: a read receipt inherits its tenant from the announcement it points at.
-- The original policies here referenced company_id directly and failed with
-- 42703. Adding the column would be the third denormalised counter in this
-- migration set that nothing writes to -- see companies.active_members_count
-- and subscriptions.mrr.
--
-- Reads within the tenant are visible so the "seen by N people" count works;
-- writing a receipt is limited to the user it belongs to. user_id is UUID and
-- holds the auth uid (AnnouncementsPage passes user.uid), so auth.uid()
-- compares directly -- no ::text cast, unlike the TEXT ids on users/companies.
CREATE POLICY "tenant_announcement_reads_select" ON public.announcement_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_reads.announcement_id
        AND a.company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "tenant_announcement_reads_insert" ON public.announcement_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_reads.announcement_id
        AND a.company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "tenant_announcement_reads_update" ON public.announcement_reads
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_reads.announcement_id
        AND a.company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "tenant_announcement_reads_delete" ON public.announcement_reads
  FOR DELETE USING (user_id = auth.uid());

-- user_acceptances
ALTER TABLE public.user_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_user_acceptances_policy" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_select_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_insert_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_update_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_delete_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_user_acceptances_policy" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_user_acceptances_select" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_user_acceptances_insert" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_user_acceptances_update" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_user_acceptances_delete" ON public.user_acceptances;

CREATE POLICY "tenant_user_acceptances_select" ON public.user_acceptances FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_user_acceptances_insert" ON public.user_acceptances FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_user_acceptances_update" ON public.user_acceptances FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_user_acceptances_delete" ON public.user_acceptances FOR DELETE USING (company_id = public.get_my_company_id());

-- company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_company_settings_policy" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_select_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_insert_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_update_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_delete_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_company_settings_policy" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_company_settings_select" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_company_settings_insert" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_company_settings_update" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_company_settings_delete" ON public.company_settings;

CREATE POLICY "tenant_company_settings_select" ON public.company_settings FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_company_settings_insert" ON public.company_settings FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_company_settings_update" ON public.company_settings FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_company_settings_delete" ON public.company_settings FOR DELETE USING (company_id = public.get_my_company_id());

-- help_faqs
ALTER TABLE public.help_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_help_faqs_policy" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_select_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_insert_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_update_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_delete_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_help_faqs_policy" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_help_faqs_select" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_help_faqs_insert" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_help_faqs_update" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_help_faqs_delete" ON public.help_faqs;

CREATE POLICY "tenant_help_faqs_select" ON public.help_faqs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_help_faqs_insert" ON public.help_faqs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_help_faqs_update" ON public.help_faqs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_help_faqs_delete" ON public.help_faqs FOR DELETE USING (company_id = public.get_my_company_id());

-- support_chat_history
ALTER TABLE public.support_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_support_chat_history_policy" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_select_support_chat_history" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_insert_support_chat_history" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_update_support_chat_history" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_delete_support_chat_history" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_support_chat_history_policy" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_support_chat_history_select" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_support_chat_history_insert" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_support_chat_history_update" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_support_chat_history_delete" ON public.support_chat_history;

CREATE POLICY "tenant_support_chat_history_select" ON public.support_chat_history FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_support_chat_history_insert" ON public.support_chat_history FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_support_chat_history_update" ON public.support_chat_history FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_support_chat_history_delete" ON public.support_chat_history FOR DELETE USING (company_id = public.get_my_company_id());

-- cleanup_settings
ALTER TABLE public.cleanup_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_cleanup_settings_policy" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_select_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_insert_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_update_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_delete_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_cleanup_settings_policy" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_cleanup_settings_select" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_cleanup_settings_insert" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_cleanup_settings_update" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_cleanup_settings_delete" ON public.cleanup_settings;

CREATE POLICY "tenant_cleanup_settings_select" ON public.cleanup_settings FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_settings_insert" ON public.cleanup_settings FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_settings_update" ON public.cleanup_settings FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_settings_delete" ON public.cleanup_settings FOR DELETE USING (company_id = public.get_my_company_id());

-- cleanup_logs
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_cleanup_logs_policy" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_select_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_insert_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_update_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_delete_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_cleanup_logs_policy" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_cleanup_logs_select" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_cleanup_logs_insert" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_cleanup_logs_update" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_cleanup_logs_delete" ON public.cleanup_logs;

CREATE POLICY "tenant_cleanup_logs_select" ON public.cleanup_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_logs_insert" ON public.cleanup_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_logs_update" ON public.cleanup_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_cleanup_logs_delete" ON public.cleanup_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_policy" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_select_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_insert_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_update_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_delete_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_policy" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_select" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_insert" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_update" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_whatsapp_messages_delete" ON public.whatsapp_messages;

CREATE POLICY "tenant_whatsapp_messages_select" ON public.whatsapp_messages FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_whatsapp_messages_insert" ON public.whatsapp_messages FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_whatsapp_messages_update" ON public.whatsapp_messages FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_whatsapp_messages_delete" ON public.whatsapp_messages FOR DELETE USING (company_id = public.get_my_company_id());

-- callbacks
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_callbacks_policy" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_select_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_insert_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_update_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_delete_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_callbacks_policy" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_callbacks_select" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_callbacks_insert" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_callbacks_update" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_callbacks_delete" ON public.callbacks;

CREATE POLICY "tenant_callbacks_select" ON public.callbacks FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_callbacks_insert" ON public.callbacks FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_callbacks_update" ON public.callbacks FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_callbacks_delete" ON public.callbacks FOR DELETE USING (company_id = public.get_my_company_id());

-- join_requests
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_join_requests_policy" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_select_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_insert_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_update_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_delete_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_join_requests_policy" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_join_requests_select" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_join_requests_insert" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_join_requests_update" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_join_requests_delete" ON public.join_requests;

CREATE POLICY "tenant_join_requests_select" ON public.join_requests FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_join_requests_insert" ON public.join_requests FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_join_requests_update" ON public.join_requests FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_join_requests_delete" ON public.join_requests FOR DELETE USING (company_id = public.get_my_company_id());

-- invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_invites_policy" ON public.invites;
DROP POLICY IF EXISTS "tenant_select_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_insert_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_update_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_delete_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_invites_policy" ON public.invites;
DROP POLICY IF EXISTS "tenant_invites_select" ON public.invites;
DROP POLICY IF EXISTS "tenant_invites_insert" ON public.invites;
DROP POLICY IF EXISTS "tenant_invites_update" ON public.invites;
DROP POLICY IF EXISTS "tenant_invites_delete" ON public.invites;

CREATE POLICY "tenant_invites_select" ON public.invites FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_invites_insert" ON public.invites FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_invites_update" ON public.invites FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_invites_delete" ON public.invites FOR DELETE USING (company_id = public.get_my_company_id());

-- import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_import_logs_policy" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_select_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_insert_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_update_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_delete_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_import_logs_policy" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_import_logs_select" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_import_logs_insert" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_import_logs_update" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_import_logs_delete" ON public.import_logs;

CREATE POLICY "tenant_import_logs_select" ON public.import_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_import_logs_insert" ON public.import_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_import_logs_update" ON public.import_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_import_logs_delete" ON public.import_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_webhook_logs_policy" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_select_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_insert_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_update_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_delete_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs_policy" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs_select" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs_insert" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs_update" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs_delete" ON public.webhook_logs;

CREATE POLICY "tenant_webhook_logs_select" ON public.webhook_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_webhook_logs_insert" ON public.webhook_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_webhook_logs_update" ON public.webhook_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_webhook_logs_delete" ON public.webhook_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- automation_rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_automation_rules_policy" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_select_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_insert_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_update_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_delete_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_automation_rules_policy" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_automation_rules_select" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_automation_rules_insert" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_automation_rules_update" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_automation_rules_delete" ON public.automation_rules;

CREATE POLICY "tenant_automation_rules_select" ON public.automation_rules FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_rules_insert" ON public.automation_rules FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_rules_update" ON public.automation_rules FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_rules_delete" ON public.automation_rules FOR DELETE USING (company_id = public.get_my_company_id());

-- automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_automation_logs_policy" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_select_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_insert_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_update_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_delete_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_automation_logs_policy" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_automation_logs_select" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_automation_logs_insert" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_automation_logs_update" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_automation_logs_delete" ON public.automation_logs;

CREATE POLICY "tenant_automation_logs_select" ON public.automation_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_logs_insert" ON public.automation_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_logs_update" ON public.automation_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_automation_logs_delete" ON public.automation_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_message_templates_policy" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_select_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_insert_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_update_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_delete_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_message_templates_policy" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_message_templates_select" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_message_templates_insert" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_message_templates_update" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_message_templates_delete" ON public.message_templates;

CREATE POLICY "tenant_message_templates_select" ON public.message_templates FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_message_templates_insert" ON public.message_templates FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_message_templates_update" ON public.message_templates FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_message_templates_delete" ON public.message_templates FOR DELETE USING (company_id = public.get_my_company_id());

-- scheduled_messages
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_scheduled_messages_policy" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_select_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_insert_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_update_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_delete_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_scheduled_messages_policy" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_scheduled_messages_select" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_scheduled_messages_insert" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_scheduled_messages_update" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_scheduled_messages_delete" ON public.scheduled_messages;

CREATE POLICY "tenant_scheduled_messages_select" ON public.scheduled_messages FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_scheduled_messages_insert" ON public.scheduled_messages FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_scheduled_messages_update" ON public.scheduled_messages FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_scheduled_messages_delete" ON public.scheduled_messages FOR DELETE USING (company_id = public.get_my_company_id());

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "tenant_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_delete_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "tenant_notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "tenant_notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "tenant_notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "tenant_notifications_delete" ON public.notifications;

CREATE POLICY "tenant_notifications_select" ON public.notifications FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_notifications_insert" ON public.notifications FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_notifications_update" ON public.notifications FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_notifications_delete" ON public.notifications FOR DELETE USING (company_id = public.get_my_company_id());

-- routing_state
--
-- Created by 20260717999999_missing_core_tables.sql. It is written by
-- increment_routing_index above -- the round-robin lead assignment RPC called
-- from src/routes/leads.ts and src/lib/dbAdapter.ts -- but no migration had
-- ever created it, so every round-robin assignment was failing.
ALTER TABLE public.routing_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_routing_state_policy" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_select_routing_state" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_insert_routing_state" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_update_routing_state" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_delete_routing_state" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_routing_state_policy" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_routing_state_select" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_routing_state_insert" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_routing_state_update" ON public.routing_state;
DROP POLICY IF EXISTS "tenant_routing_state_delete" ON public.routing_state;
CREATE POLICY "tenant_routing_state_select" ON public.routing_state FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_routing_state_insert" ON public.routing_state FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_routing_state_update" ON public.routing_state FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_routing_state_delete" ON public.routing_state FOR DELETE USING (company_id = public.get_my_company_id());

-- ----------------- 2. GLOBAL / PLATFORM TABLES (NO COMPANY_ID) -----------------

-- legal_pages
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_legal_pages" ON public.legal_pages;
DROP POLICY IF EXISTS "global_write_legal_pages" ON public.legal_pages;
CREATE POLICY "global_select_legal_pages" ON public.legal_pages FOR SELECT USING (true);
CREATE POLICY "global_write_legal_pages" ON public.legal_pages FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- legal_pages_history
ALTER TABLE public.legal_pages_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_all_legal_pages_history" ON public.legal_pages_history;
CREATE POLICY "global_all_legal_pages_history" ON public.legal_pages_history FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- video_tutorials
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_video_tutorials" ON public.video_tutorials;
DROP POLICY IF EXISTS "global_write_video_tutorials" ON public.video_tutorials;
CREATE POLICY "global_select_video_tutorials" ON public.video_tutorials FOR SELECT USING (true);
CREATE POLICY "global_write_video_tutorials" ON public.video_tutorials FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- pdf_guides
ALTER TABLE public.pdf_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_pdf_guides" ON public.pdf_guides;
DROP POLICY IF EXISTS "global_write_pdf_guides" ON public.pdf_guides;
CREATE POLICY "global_select_pdf_guides" ON public.pdf_guides FOR SELECT USING (true);
CREATE POLICY "global_write_pdf_guides" ON public.pdf_guides FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- feature_roadmap
ALTER TABLE public.feature_roadmap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_feature_roadmap" ON public.feature_roadmap;
DROP POLICY IF EXISTS "global_write_feature_roadmap" ON public.feature_roadmap;
CREATE POLICY "global_select_feature_roadmap" ON public.feature_roadmap FOR SELECT USING (true);
CREATE POLICY "global_write_feature_roadmap" ON public.feature_roadmap FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "global_write_feature_flags" ON public.feature_flags;
CREATE POLICY "global_select_feature_flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "global_write_feature_flags" ON public.feature_flags FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- cofounders
ALTER TABLE public.cofounders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_all_cofounders" ON public.cofounders;
CREATE POLICY "global_all_cofounders" ON public.cofounders FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- founder_tests
ALTER TABLE public.founder_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_all_founder_tests" ON public.founder_tests;
CREATE POLICY "global_all_founder_tests" ON public.founder_tests FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- founder_test_logs
ALTER TABLE public.founder_test_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_all_founder_test_logs" ON public.founder_test_logs;
CREATE POLICY "global_all_founder_test_logs" ON public.founder_test_logs FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

-- resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_select_resources" ON public.resources;
DROP POLICY IF EXISTS "global_write_resources" ON public.resources;
CREATE POLICY "global_select_resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "global_write_resources" ON public.resources FOR ALL USING (public.get_my_role() IN ('founder', 'super_admin')) WITH CHECK (public.get_my_role() IN ('founder', 'super_admin'));

COMMIT;
