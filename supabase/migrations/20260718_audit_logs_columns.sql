-- Migration: reconcile audit_logs with what the code actually reads and writes.
--
-- Three different naming schemes were in use at once, and none of them matched
-- the live table, so every audit event has been failing silently:
--
--   live table          id, company_id, user_id, user_email, action, details,
--                       ip_address, created_at
--   audit.service.ts    actor_id, actor_email, timestamp
--   useAuditLogs.ts     timestamp, category, user_name
--   types/supabase.ts   category, target, target_id, user_name, timestamp
--
-- The original version of this migration assumed a `timestamp` column already
-- existed and tried to copy it into created_at, which failed with 42703.
--
-- Resolution: keep `created_at` as the real column, add the fields the readers
-- need, and add `timestamp` as a generated mirror so the existing queries work
-- without every call site having to change in the same commit.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name  TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS category   TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target     TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id  TEXT;

-- audit.service.ts writes these two names.
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id    TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;

-- Readers order and filter by `timestamp`. Rather than rewrite every query in
-- this migration, mirror created_at under that name. A plain column would
-- drift; this cannot.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'audit_logs'
       AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD COLUMN "timestamp" TIMESTAMPTZ GENERATED ALWAYS AS (created_at) STORED;
  END IF;
END $$;

UPDATE public.audit_logs SET created_at = NOW() WHERE created_at IS NULL;

-- The audit trail is read constantly on the audit page and is append-only, so
-- it grows without bound. Both filters there are company plus recency.
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON public.audit_logs (company_id, created_at DESC);
