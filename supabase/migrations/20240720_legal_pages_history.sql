-- Migration: Create legal_pages_history table
-- Tracks previous versions of legal documents before a publish overwrites them.
-- This is a safe migration — uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS legal_pages_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug   TEXT NOT NULL CHECK (page_slug IN ('privacy', 'terms', 'refund')),
  version     INTEGER NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  language    TEXT NOT NULL DEFAULT 'English' CHECK (language IN ('English', 'Hindi', 'Marathi')),
  edited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by slug + language (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_legal_pages_history_slug_lang
  ON legal_pages_history (page_slug, language, version DESC);

-- Row Level Security: read-only for authenticated users, insert via service role only
ALTER TABLE legal_pages_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read history (for version history modal)
CREATE POLICY IF NOT EXISTS "Authenticated users can view legal history"
  ON legal_pages_history FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert (enforced via useLegalPage hook mutations)
-- No INSERT policy for anon/authenticated — inserts happen server-side only.

COMMENT ON TABLE legal_pages_history IS
  'Stores archived versions of legal pages before each publish. Populated by the usePublishLegalUpdate hook before overwriting the live record.';
