-- Give the pollers a scheduler, and make the UI's claim derivable instead of typed.
--
-- IntegrationHub renders "Live", "Auto-Sync Active" and "New enquiries syncing
-- automatically". docs/LEAD_WORKFLOW.md says the IndiaMART function "runs every
-- 10 mins". None of it was true: the four poll functions are invoked from
-- exactly one place each, a pollNowMutation behind a Sync Now button. There is
-- no scheduler anywhere -- pg_cron was not installed, the only GitHub workflow
-- has no schedule: trigger, and there is no Vercel or Netlify cron config in the
-- repository. A customer who connected IndiaMART and walked away received
-- nothing while the screen told them it was live.
--
-- pg_cron turned out to be available (1.6.4) and installable from this role,
-- along with pg_net (0.20.3), so the schedule can live in Postgres rather than
-- depending on an external service that would then also need watching.
--
-- THE SECRET
--
-- Calling an edge function needs the service role key. It is deliberately NOT
-- written into the cron command, because cron.job.command is stored in plain
-- text. run_integration_poll() reads it from Supabase Vault at run time, so the
-- key exists in exactly one place and the person who owns it is the only one
-- who ever types it. Setup is two statements, at the bottom of this file.
--
-- THE POINT OF integration_sync_status()
--
-- The reason the label lied is that it was a string somebody typed. The hub now
-- asks the database which providers actually have a schedule, so the claim is
-- derived from the fact. If the cron job is not there, the card says manual --
-- there is no way to type "Auto-Sync Active" back in.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- Fan a provider's poll out to every company that has it switched on.
--
-- SECURITY DEFINER because it reads Vault and integration_credentials, and
-- SET search_path is mandatory -- without it a user-writable schema could
-- shadow either one.
--
-- Not callable by customers: EXECUTE is revoked below. It would otherwise let
-- any signed-in user trigger every tenant's poll.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_integration_poll(p_provider TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url     TEXT;
  v_key     TEXT;
  v_company RECORD;
  v_count   INTEGER := 0;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Fail loudly. A poll that quietly does nothing is the fault this whole
  -- migration exists to remove.
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE EXCEPTION
      'Integration polling is not configured: vault secrets project_url and service_role_key must both exist'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_company IN
    SELECT company_id FROM public.integration_credentials
    WHERE provider = p_provider AND is_active
  LOOP
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/' || p_provider || '-poll',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer ' || v_key,
                   'Content-Type',  'application/json'
                 ),
      body    := jsonb_build_object('company_id', v_company.company_id)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.run_integration_poll(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_integration_poll(TEXT) FROM anon, authenticated;


-- ---------------------------------------------------------------------------
-- What the hub is allowed to claim.
--
-- Returns one row per pollable provider with the cron expression if a job
-- exists, and NULL if it does not. cron.job is not readable by `authenticated`,
-- hence SECURITY DEFINER -- but only the schedule is exposed, never the command,
-- which is what would carry a secret if anyone ever inlined one.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_sync_status()
RETURNS TABLE (provider TEXT, schedule TEXT, is_scheduled BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.provider,
         j.schedule,
         (j.jobid IS NOT NULL AND j.active) AS is_scheduled
  FROM (VALUES ('indiamart'), ('justdial'), ('tradeindia'), ('facebook')) AS p(provider)
  LEFT JOIN cron.job j ON j.jobname = 'poll-' || p.provider;
$$;

GRANT EXECUTE ON FUNCTION public.integration_sync_status() TO authenticated;


-- ---------------------------------------------------------------------------
-- Turn the schedule on, and off.
--
-- Separate from the migration so that applying this file changes no behaviour
-- on its own: a schedule that starts firing the moment a migration runs, before
-- the secrets exist, would produce a failing job every ten minutes.
--
-- Ten minutes for the three Indian marketplaces. Meta is fifteen, and should
-- stop needing a poll at all once it moves to the leadgen webhook.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_integration_polls()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url') THEN
    v_missing := v_missing || 'project_url ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    v_missing := v_missing || 'service_role_key ';
  END IF;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'Missing vault secret(s): %. See 20260819000200_integration_poll_schedule.sql', v_missing
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM cron.schedule('poll-indiamart',  '*/10 * * * *', $c$SELECT public.run_integration_poll('indiamart')$c$);
  PERFORM cron.schedule('poll-justdial',   '*/10 * * * *', $c$SELECT public.run_integration_poll('justdial')$c$);
  PERFORM cron.schedule('poll-tradeindia', '*/10 * * * *', $c$SELECT public.run_integration_poll('tradeindia')$c$);
  PERFORM cron.schedule('poll-facebook',   '*/15 * * * *', $c$SELECT public.run_integration_poll('facebook')$c$);

  RETURN 'Scheduled: indiamart, justdial, tradeindia every 10 min; facebook every 15 min.';
END;
$$;

CREATE OR REPLACE FUNCTION public.unschedule_integration_polls()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN ('poll-indiamart', 'poll-justdial', 'poll-tradeindia', 'poll-facebook');
  RETURN 'Polling schedule removed. The hub will show manual sync again.';
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_integration_polls()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unschedule_integration_polls() FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------------
-- TO SWITCH POLLING ON, run these three as the postgres role. The service key
-- is typed by whoever owns it and is never stored anywhere else:
--
--   SELECT vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   SELECT vault.create_secret('<service-role-key>',                'service_role_key');
--   SELECT public.schedule_integration_polls();
--
-- Confirm with:  SELECT * FROM public.integration_sync_status();
-- Turn off with: SELECT public.unschedule_integration_polls();
--
-- Until then every card in the hub says manual sync, which is the truth.
-- ---------------------------------------------------------------------------
