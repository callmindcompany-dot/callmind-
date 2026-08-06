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

-- The four policies that used to be here are gone rather than fixed. Postgres
-- ORs permissive policies together, so each of them cancelled the tenant-scoped
-- policies created one migration earlier in 20260718_secure_rls.sql:
--
--   "Company users can view announcements"  USING (is_published = true)
--       No company_id anywhere in it. Every tenant could read every other
--       tenant's announcements.
--
--   "Admins can manage announcements"  FOR ALL TO authenticated
--       USING (true) WITH CHECK (true)
--       Its own comment said "service role can do full CRUD", but it was
--       granted TO authenticated. Any logged-in customer could edit or delete
--       any other company's announcements.
--
--   "Users can manage own reads"  USING (user_id = auth.uid()::text)
--       announcement_reads.user_id is UUID, so this compares uuid to text and
--       fails with 42883. This migration could never have applied.
--
--   "Users can view read stats"  USING (true)
--       Every read receipt on the platform, visible to everyone.
--
-- 20260718_secure_rls.sql already covers both tables correctly: announcements
-- by company_id, announcement_reads transitively through the announcement it
-- points at. Adding a second set here could only widen it.
--
-- The DROPs above stay, so a database that already has the wide-open 20260706
-- policies is cleaned up. These two are dropped for the same reason.
DROP POLICY IF EXISTS "Company users can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can manage own reads" ON announcement_reads;
DROP POLICY IF EXISTS "Users can view read stats" ON announcement_reads;

COMMENT ON TABLE announcements IS
  'Company-wide broadcast posts. Pinned posts appear first. Scheduled posts auto-publish when scheduled_at <= now().';

COMMENT ON TABLE announcement_reads IS
  'Tracks which users have seen each announcement. Used for New badges and Seen by X counters.';
