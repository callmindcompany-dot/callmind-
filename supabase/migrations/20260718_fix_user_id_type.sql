-- Make user_acceptances.user_id TEXT, matching users.id.
--
-- Both statements here could only ever succeed once, and the file has now been
-- run more than once.
--
-- The type change fails with 0A000, "cannot alter type of a column used in a
-- policy definition". That is not a data problem: the column is already TEXT,
-- and 20260706_legal_pages.sql now puts real policies on this table which
-- reference user_id. Postgres refuses to retype a column any policy depends on,
-- even when the retype is a no-op. Previously the only policy was
-- FOR ALL USING (true), which mentions no column, so nothing objected.
--
-- Dropping the policies to retype and recreating them afterwards would leave
-- the table briefly unprotected mid-migration, and this is the consent-record
-- table. Checking the type first is both safer and honest about what is
-- actually needed.

BEGIN;

  ALTER TABLE user_acceptances
  DROP CONSTRAINT IF EXISTS user_acceptances_user_id_fkey;

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'user_acceptances'
         AND column_name  = 'user_id'
         AND data_type   <> 'text'
    ) THEN
      -- Only reachable on a database where the column is still UUID. There the
      -- policies do not exist yet either, so nothing blocks the retype.
      ALTER TABLE user_acceptances
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;
  END $$;

  -- Postgres has no ADD CONSTRAINT IF NOT EXISTS; without this guard the second
  -- run raises 42P07.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname   = 'user_acceptances_user_id_fkey'
         AND conrelid  = 'public.user_acceptances'::regclass
    ) THEN
      ALTER TABLE user_acceptances
        ADD CONSTRAINT user_acceptances_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END $$;

COMMIT;
