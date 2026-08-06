-- Create four tables the application has always queried and no migration ever
-- created.
--
-- The symptom was 42P01 on `DROP POLICY IF EXISTS ... ON public.callbacks` in
-- 20260718_secure_rls.sql -- in Postgres, DROP POLICY IF EXISTS still requires
-- the table to exist; only the *policy* may be absent.
--
-- Checking the whole file rather than the one statement: secure_rls touches 37
-- tables, and four of them have no CREATE TABLE anywhere in the repository.
-- All four are used by shipped code, so four features have been failing at
-- runtime with "relation does not exist":
--
--   callbacks          the follow-up scheduler -- useCallbacks.ts, SchedulerPage,
--                      CallsPage, LeadDetail, and the log_manual_call RPC in
--                      20260718_calls_recording_url.sql, which inserts one
--                      whenever a call is logged with a scheduled time. In a
--                      telecalling CRM this is the core loop.
--   import_logs        CSV import history and integration health -- and the
--                      indiamart-poll and facebook-poll edge functions write to
--                      it on every sync. types/supabase.ts already declares the
--                      row shape, which is where the column list below comes
--                      from; this migration makes the declaration true.
--   message_templates  WhatsApp and email templates -- useMessageTemplates.ts.
--   webhook_logs       deleted by the data-cleanup-cron retention sweep.
--
-- Timestamped to run before 20260718_secure_rls.sql, which then attaches the
-- tenant policies. Nothing here seeds data.

-- ---------------------------------------------------------------------------
-- callbacks
-- ---------------------------------------------------------------------------
-- id is TEXT: CallsPage supplies crypto.randomUUID() and log_manual_call
-- supplies gen_random_uuid()::text, while useCreateCallbackReminder supplies
-- nothing and relies on the default. lead_id is TEXT because leads.id is TEXT.
CREATE TABLE IF NOT EXISTS public.callbacks (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id    TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    lead_id       TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    -- Holds an email today (CallsPage passes user.email, log_manual_call passes
    -- p_user_email). Left as free TEXT with no FK rather than pretending it is
    -- a user id.
    assigned_to   TEXT,
    reminder_date TIMESTAMPTZ NOT NULL,
    notes         TEXT,
    status        TEXT NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The status strings are capitalised because that is what the code writes and
-- filters on: 'Pending' (useCallbacks default and every insert), 'Completed'
-- (useCompleteCallback), 'Paused' (usePauseAllCallbacks / SchedulerPage resume).
ALTER TABLE public.callbacks DROP CONSTRAINT IF EXISTS callbacks_status_chk;
ALTER TABLE public.callbacks
  ADD CONSTRAINT callbacks_status_chk
  CHECK (status IN ('Pending', 'Completed', 'Paused'));

-- useCallbacks filters company + status and orders by reminder_date, and polls
-- every 10 seconds.
CREATE INDEX IF NOT EXISTS idx_callbacks_company_status_due
  ON public.callbacks (company_id, status, reminder_date);
CREATE INDEX IF NOT EXISTS idx_callbacks_lead
  ON public.callbacks (lead_id);

ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- import_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    row_count  INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No CHECK on status. The writers use 'completed', 'partial' and 'failed'
-- (indiamart-poll, facebook-poll, useIntegrationHealth), but a constraint that
-- rejects a value would abort a lead sync over a log row, which is the wrong
-- trade.
CREATE INDEX IF NOT EXISTS idx_import_logs_company_created
  ON public.import_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_company_status
  ON public.import_logs (company_id, status);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- message_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_templates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    content    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'whatsapp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MessageTemplate in useMessageTemplates.ts types this as 'whatsapp' | 'email'.
ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_type_chk;
ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_type_chk
  CHECK (type IN ('whatsapp', 'email'));

CREATE INDEX IF NOT EXISTS idx_message_templates_company_created
  ON public.message_templates (company_id, created_at DESC);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- webhook_logs
-- ---------------------------------------------------------------------------
-- Nothing writes this table yet -- the only reference in the codebase is the
-- retention sweep in data-cleanup-cron, which deletes rows older than 30 days.
-- It is created so that sweep stops erroring, and so the inbound webhook path
-- has somewhere to log when it is built. The columns are the two the sweep
-- uses plus a payload; do not add speculative ones.
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source     TEXT,
    status     TEXT,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_company_created
  ON public.webhook_logs (company_id, created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies are not defined here. 20260718_secure_rls.sql creates
-- tenant_<table>_<action> on all four, keyed on company_id, and it runs next.
-- RLS is enabled above so that if it does not run, these tables deny by default
-- rather than being readable by every tenant.
