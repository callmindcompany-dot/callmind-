-- Migration: Secure Tenant Isolation Policies
-- Created: 2026-07-18
-- Framework: Elite Software Audit Council v2

BEGIN;

-- Helper functions to resolve company_id and role while preventing RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::text;
$$;

-- Drop prior policies if they exist, enable RLS, and add 4 policies (SELECT, INSERT, UPDATE, DELETE) for each table

-- ----------------- 1. TABLES WITH COMPANY_ID -----------------

-- leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_insert_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_update_leads" ON public.leads;
DROP POLICY IF EXISTS "tenant_delete_leads" ON public.leads;
CREATE POLICY "tenant_select_leads" ON public.leads FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_leads" ON public.leads FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_leads" ON public.leads FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_leads" ON public.leads FOR DELETE USING (company_id = public.get_my_company_id());

-- calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_insert_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_update_calls" ON public.calls;
DROP POLICY IF EXISTS "tenant_delete_calls" ON public.calls;
CREATE POLICY "tenant_select_calls" ON public.calls FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_calls" ON public.calls FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_calls" ON public.calls FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_calls" ON public.calls FOR DELETE USING (company_id = public.get_my_company_id());

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_users" ON public.users;
DROP POLICY IF EXISTS "tenant_insert_users" ON public.users;
DROP POLICY IF EXISTS "tenant_update_users" ON public.users;
DROP POLICY IF EXISTS "tenant_delete_users" ON public.users;
CREATE POLICY "tenant_select_users" ON public.users FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_users" ON public.users FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_users" ON public.users FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_users" ON public.users FOR DELETE USING (company_id = public.get_my_company_id());

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_insert_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_update_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_delete_audit_logs" ON public.audit_logs;
CREATE POLICY "tenant_select_audit_logs" ON public.audit_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_audit_logs" ON public.audit_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_audit_logs" ON public.audit_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- sequences
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_insert_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_update_sequences" ON public.sequences;
DROP POLICY IF EXISTS "tenant_delete_sequences" ON public.sequences;
CREATE POLICY "tenant_select_sequences" ON public.sequences FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_sequences" ON public.sequences FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_sequences" ON public.sequences FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_sequences" ON public.sequences FOR DELETE USING (company_id = public.get_my_company_id());

-- ai_config
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_insert_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_update_ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "tenant_delete_ai_config" ON public.ai_config;
CREATE POLICY "tenant_select_ai_config" ON public.ai_config FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_ai_config" ON public.ai_config FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_ai_config" ON public.ai_config FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_ai_config" ON public.ai_config FOR DELETE USING (company_id = public.get_my_company_id());

-- ai_faqs
ALTER TABLE public.ai_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_insert_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_update_ai_faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "tenant_delete_ai_faqs" ON public.ai_faqs;
CREATE POLICY "tenant_select_ai_faqs" ON public.ai_faqs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_ai_faqs" ON public.ai_faqs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_ai_faqs" ON public.ai_faqs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_ai_faqs" ON public.ai_faqs FOR DELETE USING (company_id = public.get_my_company_id());

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_insert_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_update_announcements" ON public.announcements;
DROP POLICY IF EXISTS "tenant_delete_announcements" ON public.announcements;
CREATE POLICY "tenant_select_announcements" ON public.announcements FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_announcements" ON public.announcements FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_announcements" ON public.announcements FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_announcements" ON public.announcements FOR DELETE USING (company_id = public.get_my_company_id());

-- announcement_reads
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_insert_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_update_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "tenant_delete_announcement_reads" ON public.announcement_reads;
CREATE POLICY "tenant_select_announcement_reads" ON public.announcement_reads FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_announcement_reads" ON public.announcement_reads FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_announcement_reads" ON public.announcement_reads FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_announcement_reads" ON public.announcement_reads FOR DELETE USING (company_id = public.get_my_company_id());

-- user_acceptances
ALTER TABLE public.user_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_insert_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_update_user_acceptances" ON public.user_acceptances;
DROP POLICY IF EXISTS "tenant_delete_user_acceptances" ON public.user_acceptances;
CREATE POLICY "tenant_select_user_acceptances" ON public.user_acceptances FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_user_acceptances" ON public.user_acceptances FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_user_acceptances" ON public.user_acceptances FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_user_acceptances" ON public.user_acceptances FOR DELETE USING (company_id = public.get_my_company_id());

-- company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_insert_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_update_company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "tenant_delete_company_settings" ON public.company_settings;
CREATE POLICY "tenant_select_company_settings" ON public.company_settings FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_company_settings" ON public.company_settings FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_company_settings" ON public.company_settings FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_company_settings" ON public.company_settings FOR DELETE USING (company_id = public.get_my_company_id());

-- help_faqs
ALTER TABLE public.help_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_insert_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_update_help_faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "tenant_delete_help_faqs" ON public.help_faqs;
CREATE POLICY "tenant_select_help_faqs" ON public.help_faqs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_help_faqs" ON public.help_faqs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_help_faqs" ON public.help_faqs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_help_faqs" ON public.help_faqs FOR DELETE USING (company_id = public.get_my_company_id());

-- support_chat_history
ALTER TABLE public.support_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_support_chat" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_insert_support_chat" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_update_support_chat" ON public.support_chat_history;
DROP POLICY IF EXISTS "tenant_delete_support_chat" ON public.support_chat_history;
CREATE POLICY "tenant_select_support_chat" ON public.support_chat_history FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_support_chat" ON public.support_chat_history FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_support_chat" ON public.support_chat_history FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_support_chat" ON public.support_chat_history FOR DELETE USING (company_id = public.get_my_company_id());

-- cleanup_settings
ALTER TABLE public.cleanup_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_insert_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_update_cleanup_settings" ON public.cleanup_settings;
DROP POLICY IF EXISTS "tenant_delete_cleanup_settings" ON public.cleanup_settings;
CREATE POLICY "tenant_select_cleanup_settings" ON public.cleanup_settings FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_cleanup_settings" ON public.cleanup_settings FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_cleanup_settings" ON public.cleanup_settings FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_cleanup_settings" ON public.cleanup_settings FOR DELETE USING (company_id = public.get_my_company_id());

-- cleanup_logs
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_insert_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_update_cleanup_logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "tenant_delete_cleanup_logs" ON public.cleanup_logs;
CREATE POLICY "tenant_select_cleanup_logs" ON public.cleanup_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_cleanup_logs" ON public.cleanup_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_cleanup_logs" ON public.cleanup_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_cleanup_logs" ON public.cleanup_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_insert_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_update_whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "tenant_delete_whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "tenant_select_whatsapp_messages" ON public.whatsapp_messages FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_whatsapp_messages" ON public.whatsapp_messages FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_whatsapp_messages" ON public.whatsapp_messages FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_whatsapp_messages" ON public.whatsapp_messages FOR DELETE USING (company_id = public.get_my_company_id());

-- callbacks
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_insert_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_update_callbacks" ON public.callbacks;
DROP POLICY IF EXISTS "tenant_delete_callbacks" ON public.callbacks;
CREATE POLICY "tenant_select_callbacks" ON public.callbacks FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_callbacks" ON public.callbacks FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_callbacks" ON public.callbacks FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_callbacks" ON public.callbacks FOR DELETE USING (company_id = public.get_my_company_id());

-- join_requests
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_insert_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_update_join_requests" ON public.join_requests;
DROP POLICY IF EXISTS "tenant_delete_join_requests" ON public.join_requests;
CREATE POLICY "tenant_select_join_requests" ON public.join_requests FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_join_requests" ON public.join_requests FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_join_requests" ON public.join_requests FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_join_requests" ON public.join_requests FOR DELETE USING (company_id = public.get_my_company_id());

-- invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_insert_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_update_invites" ON public.invites;
DROP POLICY IF EXISTS "tenant_delete_invites" ON public.invites;
CREATE POLICY "tenant_select_invites" ON public.invites FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_invites" ON public.invites FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_invites" ON public.invites FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_invites" ON public.invites FOR DELETE USING (company_id = public.get_my_company_id());

-- import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_insert_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_update_import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "tenant_delete_import_logs" ON public.import_logs;
CREATE POLICY "tenant_select_import_logs" ON public.import_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_import_logs" ON public.import_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_import_logs" ON public.import_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_import_logs" ON public.import_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_insert_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_update_webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_delete_webhook_logs" ON public.webhook_logs;
CREATE POLICY "tenant_select_webhook_logs" ON public.webhook_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_webhook_logs" ON public.webhook_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_webhook_logs" ON public.webhook_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_webhook_logs" ON public.webhook_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- automation_rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_insert_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_update_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "tenant_delete_automation_rules" ON public.automation_rules;
CREATE POLICY "tenant_select_automation_rules" ON public.automation_rules FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_automation_rules" ON public.automation_rules FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_automation_rules" ON public.automation_rules FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_automation_rules" ON public.automation_rules FOR DELETE USING (company_id = public.get_my_company_id());

-- automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_insert_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_update_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "tenant_delete_automation_logs" ON public.automation_logs;
CREATE POLICY "tenant_select_automation_logs" ON public.automation_logs FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_automation_logs" ON public.automation_logs FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_automation_logs" ON public.automation_logs FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_automation_logs" ON public.automation_logs FOR DELETE USING (company_id = public.get_my_company_id());

-- message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_insert_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_update_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "tenant_delete_message_templates" ON public.message_templates;
CREATE POLICY "tenant_select_message_templates" ON public.message_templates FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_message_templates" ON public.message_templates FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_message_templates" ON public.message_templates FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_message_templates" ON public.message_templates FOR DELETE USING (company_id = public.get_my_company_id());

-- scheduled_messages
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_insert_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_update_scheduled_messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "tenant_delete_scheduled_messages" ON public.scheduled_messages;
CREATE POLICY "tenant_select_scheduled_messages" ON public.scheduled_messages FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_scheduled_messages" ON public.scheduled_messages FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_scheduled_messages" ON public.scheduled_messages FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_scheduled_messages" ON public.scheduled_messages FOR DELETE USING (company_id = public.get_my_company_id());

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant_delete_notifications" ON public.notifications;
CREATE POLICY "tenant_select_notifications" ON public.notifications FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_update_notifications" ON public.notifications FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_delete_notifications" ON public.notifications FOR DELETE USING (company_id = public.get_my_company_id());


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
