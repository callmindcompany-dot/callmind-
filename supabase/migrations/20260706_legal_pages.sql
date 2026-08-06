-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Migration: Legal Pages and User Acceptances tables

-- Create Legal Pages table
CREATE TABLE IF NOT EXISTS legal_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL CHECK (slug IN ('privacy', 'terms', 'refund')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    language TEXT NOT NULL DEFAULT 'English' CHECK (language IN ('English', 'Hindi', 'Marathi')),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (slug, language)
);

-- Create User Acceptances table
CREATE TABLE IF NOT EXISTS user_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    page_slug TEXT NOT NULL,
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- The live table also has a `status` column, which useLegalCompliance.ts filters
-- on ("published"). CREATE TABLE IF NOT EXISTS above is a no-op against the
-- existing table, so state it rather than assume it -- the same way
-- companies.active_members_count came to be missing.
ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies
--
-- Both tables previously had FOR ALL USING (true) WITH CHECK (true). Postgres
-- ORs permissive policies, so those cancelled the tenant-scoped policies that
-- 20260718_secure_rls.sql creates on user_acceptances.
--
-- legal_pages is platform-wide published content, so a global read is correct.
-- A global *write* was not: any logged-in customer could rewrite the terms of
-- service every other customer sees.
DROP POLICY IF EXISTS "Allow all access to legal_pages" ON legal_pages;
DROP POLICY IF EXISTS "global_select_legal_pages" ON legal_pages;
CREATE POLICY "global_select_legal_pages" ON legal_pages FOR SELECT USING (true);
-- No insert/update/delete policy: these pages are edited through the service
-- role, never from the browser.

-- user_acceptances records who accepted which version of which document, with
-- their IP. It is consent evidence. Wide open, any user could read everyone
-- else's, forge one, or delete their own -- which is exactly the value the
-- record is supposed to have. Scoped to the acceptor.
DROP POLICY IF EXISTS "Allow all access to user_acceptances" ON user_acceptances;
DROP POLICY IF EXISTS "own_select_user_acceptances" ON user_acceptances;
DROP POLICY IF EXISTS "own_insert_user_acceptances" ON user_acceptances;
CREATE POLICY "own_select_user_acceptances" ON user_acceptances
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "own_insert_user_acceptances" ON user_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
-- Deliberately no UPDATE and no DELETE. An acceptance is a fact about a moment;
-- it is not editable and not erasable from the browser.

-- No seed content.
--
-- This file used to INSERT the Privacy Policy, Terms of Service and Refund
-- Policy as published rows. That is what raised the 42P10: the seeds say
-- ON CONFLICT (slug, language), and the live table's constraint is
-- (slug, language, status).
--
-- The constraint is not the reason they are gone. The text made specific
-- factual claims about this system that are not true, and unlike marketing copy
-- these are the documents a customer is shown and asked to accept:
--
--   "14-Layer Security (SQLCipher)" / "encrypted at rest using AES-256 with
--   SQLCipher 14-layer architectural boundaries"
--     SQLCipher appears nowhere in this codebase. It is a SQLite extension;
--     this product runs on Postgres and Cloudflare R2. "14-layer architectural
--     boundaries" does not describe anything.
--
--   "No cross-tenant bleeding"
--     Stated as a security guarantee in a privacy policy. It is the claim this
--     migration set has been disproving all week -- announcements readable by
--     every tenant, organization_tenants_view reading straight through RLS,
--     and a long list of USING (true) policies still open.
--
--   "audio streams are dropped post-analysis" / "purely in RAM"
--     calls.recording_url exists and holds a stored recording
--     (20260718_calls_recording_url.sql).
--
--   "heuristic monitors detect restricted actions"
--     No such monitor exists.
--
-- Publishing a privacy policy that overstates the security a product actually
-- provides is a misrepresentation, and this one would be presented to every
-- customer at signup. Correct text has to come from the founder, and for the
-- legal documents specifically it should be reviewed by someone qualified --
-- it is not something to reconstruct from the code.
--
-- Seeding them from a migration was also the wrong mechanism regardless of
-- content: legal documents get versioned and re-accepted, so they belong in an
-- editing flow, not in a file that runs on every deploy.
