-- In-app account deletion.
--
-- The Play Store requires an app that creates accounts to offer deletion from
-- inside the app. CallMind had no path at all: the privacy policy told people to
-- write to the grievance address, which is not enough to pass review, and the
-- mobile app had no screen.
--
-- The web app's handleDeleteAccount is not a model to copy. It fires six
-- .delete() calls and checks the result of none of them, then reports
-- "Workspace permanently deleted" whether or not a single row went. Row-level
-- security refuses most of those calls from a browser client, so the message was
-- usually false.
--
-- Three facts about this database shaped the design, all queried rather than
-- assumed:
--
--   * pg_cron is not installed and cron.job does not exist. So a "your account
--     will be deleted in 7 days" grace period would be a promise with nothing
--     behind it to keep it. Deletion here is immediate, and the screen asks the
--     user to type DELETE instead of relying on a timer nobody runs.
--
--   * Twenty-three tables carry a column naming a user. Seven of them already
--     cascade from public.users; the rest do not, and four are NOT NULL with no
--     foreign key, so they neither cascade nor block -- they would simply have
--     been left behind.
--
--   * legal_pages_history.edited_by references users ON DELETE NO ACTION. It is
--     nullable, and it is the one reference that would otherwise abort the
--     delete outright.
--
-- What happens to data is a three-way split, and 84_DeleteAccountScreen states
-- the same three groups to the user before they confirm:
--
--   deleted      the profile, and rows that exist only to serve this one person
--                -- notification preferences, notifications, saved and recent
--                searches, support chat, announcement read receipts, any
--                pending join request.
--
--   kept by the  leads, calls, call logs, lead activity, documents and SIM
--   company,     assignments. These are the employer's business records, not the
--   unlinked     individual's. Deleting a telecaller must never delete their
--                company's book of leads. The rows stay; the name comes off.
--
--   kept as      billing records and invoices, which Indian tax law requires be
--   law requires retained, and the audit log, whose purpose is defeated if the
--                subject can erase it. Both are anonymised where the column
--                allows and otherwise left with an id that no longer resolves.
--
-- attendance_logs already cascades, so an agent's own attendance history goes
-- with them. That is the schema as it stands rather than a decision made here;
-- the screen says so plainly so nobody is surprised.

-- ---------------------------------------------------------------------------
-- A record that a deletion happened, without keeping who it was.
-- ---------------------------------------------------------------------------
-- Needed to answer "did you actually delete my data?" after the fact. Storing
-- the email itself would defeat the deletion, so this keeps a SHA-256 of it: a
-- later enquiry can be matched by hashing the address again, and the table on
-- its own identifies nobody.

CREATE TABLE IF NOT EXISTS public.account_deletion_log (
    id            BIGSERIAL PRIMARY KEY,
    email_sha256  TEXT NOT NULL,
    company_id    TEXT,
    role          TEXT,
    leads_unassigned  INTEGER NOT NULL DEFAULT 0,
    deleted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_log_hash
    ON public.account_deletion_log (email_sha256);

ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies. RLS on with none means nobody reaches it through an
-- authenticated client; only service-role and the definer functions below can.
-- Fail closed: an unset rule means nobody, not everybody.

-- ---------------------------------------------------------------------------
-- What deletion would do, before the user commits to it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.account_deletion_preview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    TEXT;
    v_user   public.users%ROWTYPE;
    v_leads  INTEGER := 0;
    v_calls  INTEGER := 0;
    v_days   INTEGER := 0;
    v_other_members INTEGER := 0;
    v_other_admins  INTEGER := 0;
    v_blocked TEXT := NULL;
BEGIN
    v_uid := auth.uid()::text;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not signed in.'
            USING ERRCODE = 'P0001', DETAIL = '{"code":"NO_SESSION"}';
    END IF;

    SELECT * INTO v_user FROM public.users WHERE id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No profile found for this sign-in.'
            USING ERRCODE = 'P0001', DETAIL = '{"code":"NO_PROFILE"}';
    END IF;

    SELECT count(*) INTO v_leads
      FROM public.leads
     WHERE assigned_to = v_uid AND COALESCE(is_deleted, false) = false;

    SELECT count(*) INTO v_calls
      FROM public.calls WHERE agent_id = v_uid;

    SELECT count(*) INTO v_days
      FROM public.attendance_logs WHERE user_id = v_uid;

    SELECT count(*) INTO v_other_members
      FROM public.users
     WHERE company_id = v_user.company_id AND id <> v_uid
       AND COALESCE(status, 'active') <> 'disabled';

    SELECT count(*) INTO v_other_admins
      FROM public.users
     WHERE company_id = v_user.company_id AND id <> v_uid
       AND lower(COALESCE(role, '')) IN ('founder', 'admin', 'owner')
       AND COALESCE(status, 'active') <> 'disabled';

    -- The one case that must be refused rather than warned about: removing the
    -- only administrator leaves the rest of the team with a workspace nobody can
    -- approve joins for, reassign leads in, or pay for.
    IF lower(COALESCE(v_user.role, '')) IN ('founder', 'admin', 'owner')
       AND v_other_admins = 0 AND v_other_members > 0 THEN
        v_blocked := 'LAST_ADMIN';
    END IF;

    RETURN jsonb_build_object(
        'email',            v_user.email,
        'role',             v_user.role,
        'leads_to_return',  v_leads,
        'calls_kept',       v_calls,
        'attendance_days',  v_days,
        'other_members',    v_other_members,
        'blocked',          v_blocked
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- The deletion itself.
-- ---------------------------------------------------------------------------
-- p_confirm must be the literal 'DELETE'. The screen makes the user type it.
-- The check is here rather than only in the app so that the RPC cannot be fired
-- accidentally from a console with no argument.

CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirm TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    TEXT;
    v_uuid   UUID;
    v_user   public.users%ROWTYPE;
    v_leads  INTEGER := 0;
    v_other_members INTEGER := 0;
    v_other_admins  INTEGER := 0;
BEGIN
    IF p_confirm IS DISTINCT FROM 'DELETE' THEN
        RAISE EXCEPTION 'Type DELETE to confirm.'
            USING ERRCODE = 'P0001', DETAIL = '{"code":"CONFIRM_MISMATCH"}';
    END IF;

    v_uid := auth.uid()::text;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not signed in.'
            USING ERRCODE = 'P0001', DETAIL = '{"code":"NO_SESSION"}';
    END IF;
    v_uuid := auth.uid();

    SELECT * INTO v_user FROM public.users WHERE id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No profile found for this sign-in.'
            USING ERRCODE = 'P0001', DETAIL = '{"code":"NO_PROFILE"}';
    END IF;

    SELECT count(*) INTO v_other_members
      FROM public.users
     WHERE company_id = v_user.company_id AND id <> v_uid
       AND COALESCE(status, 'active') <> 'disabled';

    SELECT count(*) INTO v_other_admins
      FROM public.users
     WHERE company_id = v_user.company_id AND id <> v_uid
       AND lower(COALESCE(role, '')) IN ('founder', 'admin', 'owner')
       AND COALESCE(status, 'active') <> 'disabled';

    IF lower(COALESCE(v_user.role, '')) IN ('founder', 'admin', 'owner')
       AND v_other_admins = 0 AND v_other_members > 0 THEN
        RAISE EXCEPTION
            'You are the only administrator of a workspace with % other member(s). Make someone else an administrator first.',
            v_other_members
            USING ERRCODE = 'P0001', DETAIL = '{"code":"LAST_ADMIN"}';
    END IF;

    -- -----------------------------------------------------------------
    -- Company property: keep the row, take the name off it.
    -- -----------------------------------------------------------------
    UPDATE public.leads SET assigned_to = NULL WHERE assigned_to = v_uid;
    GET DIAGNOSTICS v_leads = ROW_COUNT;

    -- callbacks.assigned_to holds the agent's email, not their id. leads uses
    -- the id. Same column name, two different keys -- both are handled here
    -- because missing either leaves work assigned to somebody who is gone.
    UPDATE public.callbacks SET assigned_to = NULL WHERE assigned_to = v_user.email;

    UPDATE public.calls             SET agent_id    = NULL WHERE agent_id    = v_uid;
    UPDATE public.calls             SET created_by  = NULL WHERE created_by  = v_uid;
    UPDATE public.call_logs         SET agent_id    = NULL WHERE agent_id    = v_uid;
    UPDATE public.lead_activity_log SET created_by  = NULL WHERE created_by  = v_uid;
    UPDATE public.documents         SET uploaded_by = NULL WHERE uploaded_by = v_uid;
    UPDATE public.sim_cards         SET agent_id    = NULL WHERE agent_id    = v_uid;

    -- Would otherwise abort the delete: the only reference with ON DELETE NO
    -- ACTION.
    UPDATE public.legal_pages_history SET edited_by = NULL WHERE edited_by = v_uid;

    -- -----------------------------------------------------------------
    -- Kept because the law or the point of the record requires it.
    -- -----------------------------------------------------------------
    -- audit_logs exists to record who did what. Letting the subject erase their
    -- own entries defeats it, so the entries stay and the actor is unlinked.
    UPDATE public.audit_logs SET actor_id = NULL WHERE actor_id = v_uid;
    UPDATE public.audit_logs SET user_id  = NULL WHERE user_id  = v_uid;

    UPDATE public.system_errors SET user_id = NULL WHERE user_id = v_uid;
    UPDATE public.trial_events  SET user_id = NULL WHERE user_id = v_uid;

    -- billing_intents.user_id is NOT NULL and carries no foreign key, so it
    -- neither cascades nor blocks. Invoices must be retained under Indian tax
    -- law, which the privacy policy already states, so the rows are left as
    -- they are with an id that no longer resolves to a person.

    -- -----------------------------------------------------------------
    -- Personal: rows that exist only to serve this one person.
    -- -----------------------------------------------------------------
    -- These have no cascade, and announcement_reads and support_chat_history are
    -- NOT NULL with no foreign key, so nothing would have removed them.
    DELETE FROM public.announcement_reads   WHERE user_id = v_uuid;
    DELETE FROM public.support_chat_history WHERE user_id = v_uuid;
    DELETE FROM public.join_requests        WHERE user_id = v_uid;
    DELETE FROM public.agent_status         WHERE id = v_uid;

    -- profiles duplicates name, phone and email, and row-level security is off
    -- on it. Left behind, the personal data would survive the deletion.
    DELETE FROM public.profiles WHERE id = v_uuid;

    -- -----------------------------------------------------------------
    -- Record that this happened, without recording who.
    -- -----------------------------------------------------------------
    INSERT INTO public.account_deletion_log (email_sha256, company_id, role, leads_unassigned)
    VALUES (
        encode(sha256(convert_to(lower(COALESCE(v_user.email, '')), 'UTF8')), 'hex'),
        v_user.company_id,
        v_user.role,
        v_leads
    );

    -- -----------------------------------------------------------------
    -- The profile, then the sign-in itself.
    -- -----------------------------------------------------------------
    -- Removing public.users cascades to attendance_logs, notifications,
    -- notification_preferences, recent_searches, saved_searches,
    -- search_analytics_logs and user_acceptances.
    DELETE FROM public.users WHERE id = v_uid;

    -- Without this the account still signs in and lands on an empty app.
    DELETE FROM auth.users WHERE id = v_uuid;

    RETURN jsonb_build_object('deleted', true, 'leads_returned', v_leads);
END;
$$;

REVOKE ALL ON FUNCTION public.account_deletion_preview()      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account(TEXT)         FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_deletion_preview()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(TEXT)      TO authenticated;
