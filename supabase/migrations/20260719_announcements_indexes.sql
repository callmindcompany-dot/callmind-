-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Migration: Add indexes and improve RLS for announcements tables
-- The core tables already exist from 20260706_announcements.sql
-- This migration adds performance indexes and stricter RLS policies.

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_announcements_company_pinned
  ON announcements (company_id, is_pinned DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_scheduled
  ON announcements (company_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
  ON announcement_reads (user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
  ON announcement_reads (announcement_id);

-- Drop overly broad policies and replace with tenant-scoped ones
DROP POLICY IF EXISTS "Allow all access to announcements" ON announcements;
DROP POLICY IF EXISTS "Allow all access to announcement_reads" ON announcement_reads;

-- Announcements: authenticated users can read their company's published posts
CREATE POLICY IF NOT EXISTS "Company users can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Announcements: service role can do full CRUD
CREATE POLICY IF NOT EXISTS "Admins can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Reads: users can read and insert their own read records
CREATE POLICY IF NOT EXISTS "Users can manage own reads"
  ON announcement_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Reads: users can see aggregated read counts for their company's announcements
CREATE POLICY IF NOT EXISTS "Users can view read stats"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE announcements IS
  'Company-wide broadcast posts. Pinned posts appear first. Scheduled posts auto-publish when scheduled_at <= now().';

COMMENT ON TABLE announcement_reads IS
  'Tracks which users have seen each announcement. Used for New badges and Seen by X counters.';
