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

-- This was FOR ALL USING (true) WITH CHECK (true). legal_pages_history is the
-- audit trail of who changed a legal document and when -- the record you would
-- reach for to show which version a customer actually accepted. Wide open, any
-- logged-in customer could rewrite or delete that history, which is the one
-- thing an audit trail must not allow.
--
-- Read is global, matching legal_pages itself: the documents are public and so
-- is their revision history. Writes go through the service role.
DROP POLICY IF EXISTS "Allow all access to legal_pages_history" ON legal_pages_history;
DROP POLICY IF EXISTS "Authenticated users can view legal history" ON legal_pages_history;
DROP POLICY IF EXISTS "global_select_legal_pages_history" ON legal_pages_history;
CREATE POLICY "global_select_legal_pages_history" ON legal_pages_history FOR SELECT USING (true);

-- Add status column to legal_pages if not exists
ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Drop old unique constraint (slug, language)
ALTER TABLE legal_pages DROP CONSTRAINT IF EXISTS legal_pages_slug_language_key;

-- Add new unique constraint (slug, language, status)
--
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so on the second run this
-- raised 42P07 and stopped the file. Same shape as the CREATE POLICY problem
-- fixed earlier: a statement that can only ever succeed once, in a set that
-- gets run more than once.
--
-- Guarded rather than DROP + ADD. Dropping a unique constraint and re-adding it
-- re-validates the whole table, and would fail outright if duplicates had crept
-- in while it was absent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'legal_pages_slug_language_status_key'
       AND conrelid = 'public.legal_pages'::regclass
  ) THEN
    ALTER TABLE legal_pages
      ADD CONSTRAINT legal_pages_slug_language_status_key UNIQUE (slug, language, status);
  END IF;
END $$;
