-- ============================================================
-- CallMind RLS Policies Migration
-- F-01/F-12 FIX: Enable Row-Level Security on all multi-tenant tables
-- Run this in the Supabase SQL Editor after the base schema.
-- ============================================================

-- Helper: Get current user's company_id
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS TEXT AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_company"
  ON users FOR SELECT
  USING (company_id = auth_company_id() OR id = auth.uid()::text);

CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (id = auth.uid()::text);

-- ============================================================
-- LEADS
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_own_company"
  ON leads FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "leads_insert_own_company"
  ON leads FOR INSERT
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "leads_update_own_company"
  ON leads FOR UPDATE
  USING (company_id = auth_company_id());

CREATE POLICY "leads_delete_own_company"
  ON leads FOR DELETE
  USING (company_id = auth_company_id());

-- ============================================================
-- CALLS
-- ============================================================
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_select_own_company"
  ON calls FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "calls_insert_own_company"
  ON calls FOR INSERT
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "calls_update_own_company"
  ON calls FOR UPDATE
  USING (company_id = auth_company_id());

-- ============================================================
-- ATTENDANCE_LOGS
-- ============================================================
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_own_company"
  ON attendance_logs FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "attendance_insert_own_company"
  ON attendance_logs FOR INSERT
  WITH CHECK (company_id = auth_company_id());

-- ============================================================
-- TARGETS
-- ============================================================
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "targets_select_own_company"
  ON targets FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "targets_all_own_company"
  ON targets FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_own_company"
  ON announcements FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "announcements_all_own_company"
  ON announcements FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- AUTOMATIONS
-- ============================================================
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_select_own_company"
  ON automations FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "automations_all_own_company"
  ON automations FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- SEQUENCES
-- ============================================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequences_select_own_company"
  ON sequences FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "sequences_all_own_company"
  ON sequences FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- LEAD_SOURCES
-- ============================================================
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_sources_select_own_company"
  ON lead_sources FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "lead_sources_all_own_company"
  ON lead_sources FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own_company"
  ON audit_logs FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "audit_logs_insert_own_company"
  ON audit_logs FOR INSERT
  WITH CHECK (company_id = auth_company_id());

-- ============================================================
-- TRIAL_EVENTS
-- ============================================================
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_events_select_own_company"
  ON trial_events FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "trial_events_insert_own_company"
  ON trial_events FOR INSERT
  WITH CHECK (company_id = auth_company_id());

-- ============================================================
-- FOUNDER_CONFIGS
-- ============================================================
ALTER TABLE founder_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_configs_select_own_company"
  ON founder_configs FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "founder_configs_all_own_company"
  ON founder_configs FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- JOIN_REQUESTS
-- ============================================================
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "join_requests_select_own_company"
  ON join_requests FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "join_requests_all_own_company"
  ON join_requests FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- INVITES
-- ============================================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_own_company"
  ON invites FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "invites_all_own_company"
  ON invites FOR ALL
  USING (company_id = auth_company_id());

-- ============================================================
-- AGENT_STATUS
-- ============================================================
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_status_select_own_company"
  ON agent_status FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "agent_status_all_own_company"
  ON agent_status FOR ALL
  USING (company_id = auth_company_id());
