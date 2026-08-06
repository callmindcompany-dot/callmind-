-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Create legal_pages_history table
CREATE TABLE IF NOT EXISTS legal_pages_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  edited_by TEXT REFERENCES users(id),
  edited_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE legal_pages_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to legal_pages_history" ON legal_pages_history;
CREATE POLICY "Allow all access to legal_pages_history" ON legal_pages_history FOR ALL USING (true) WITH CHECK (true);

-- Add status column to legal_pages if not exists
ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Drop old unique constraint (slug, language)
ALTER TABLE legal_pages DROP CONSTRAINT IF EXISTS legal_pages_slug_language_key;

-- Add new unique constraint (slug, language, status)
ALTER TABLE legal_pages ADD CONSTRAINT legal_pages_slug_language_status_key UNIQUE (slug, language, status);
