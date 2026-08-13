-- Record what each integration actually did, every time it ran.
--
-- Lead ingestion has had no memory. processInboundLead maps the fields,
-- normalises the phone, deduplicates on a seven-day window and assigns an
-- owner -- and then the only trace left is the lead itself. So there was no way
-- to answer the question a customer actually asks, which is not "how many leads
-- do I have" but "why did that lead not arrive?".
--
-- It is also why every status on the integrations screen had to be invented.
-- "Live", "Auto-Sync Active", "0 failed syncs", "18ms": none of them had
-- anything to read, so they were typed instead. A row per attempt is the thing
-- that makes them answerable, and the status board, the six connection states,
-- the failure alert and the per-source lead list are all queries against this
-- one table.
--
-- Written by the four pollers and by webhook-receiver, through the service
-- role, so RLS is not in their way.

CREATE TABLE IF NOT EXISTS public.integration_runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT        NOT NULL,
  provider      TEXT        NOT NULL,

  -- How this run began. Worth keeping separate from the outcome: a source that
  -- only ever runs on 'manual' is not connected in any useful sense, however
  -- successful each of those runs was.
  trigger       TEXT        NOT NULL DEFAULT 'schedule',

  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,

  -- NULL while in flight. 'partial' means some leads landed and some did not,
  -- which is the common case with a marketplace API that rejects one row.
  outcome       TEXT,

  leads_created    INTEGER  NOT NULL DEFAULT 0,
  leads_duplicate  INTEGER  NOT NULL DEFAULT 0,

  -- The provider's own words. Truncated by the caller, because a vendor error
  -- body can be a whole HTML page.
  error         TEXT,

  CONSTRAINT integration_runs_provider_check CHECK (
    provider IN (
      'facebook', 'indiamart', 'justdial', 'tradeindia',
      'googleads', 'webhook', 'website', 'csv'
    )
  ),
  CONSTRAINT integration_runs_trigger_check CHECK (
    trigger IN ('schedule', 'manual', 'push')
  ),
  CONSTRAINT integration_runs_outcome_check CHECK (
    outcome IS NULL OR outcome IN ('success', 'partial', 'failed')
  )
);

COMMENT ON TABLE public.integration_runs IS
  'One row per ingestion attempt. Admin-only: the error column carries provider responses, which can contain a request URL and therefore a key.';

-- The two questions asked of this table: "what has this source been doing"
-- and "what is failing right now".
CREATE INDEX IF NOT EXISTS idx_integration_runs_company_provider
  ON public.integration_runs(company_id, provider, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_runs_failures
  ON public.integration_runs(company_id, started_at DESC)
  WHERE outcome = 'failed';

ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;

-- Admin-only, matching integration_credentials rather than team_settings. A
-- failed run's error text is the provider's raw response and can contain the
-- request URL, which for these vendors carries the API key in the query string.
-- The Integrations screen is already behind RoleGate requireAdmin, so this
-- costs nothing that is currently reachable.
DROP POLICY IF EXISTS "tenant_select_integration_runs" ON public.integration_runs;
CREATE POLICY "tenant_select_integration_runs"
ON public.integration_runs
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

-- No write policy. Runs are recorded by the ingestion functions through the
-- service role; a customer inventing a successful run would defeat the point.


-- ---------------------------------------------------------------------------
-- What each source has been doing lately.
--
-- One row per provider the company has configured, so the hub can render its
-- cards from a single query instead of one per source. Left as a function
-- rather than a view so the tenant scoping is explicit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_run_summary()
RETURNS TABLE (
  provider          TEXT,
  last_run_at       TIMESTAMPTZ,
  last_outcome      TEXT,
  last_error        TEXT,
  last_success_at   TIMESTAMPTZ,
  leads_24h         INTEGER,
  failures_24h      INTEGER,
  consecutive_fails INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT * FROM public.integration_runs
    WHERE company_id = public.get_my_company_id()
  ),
  latest AS (
    SELECT DISTINCT ON (provider)
           provider, started_at, outcome, error
    FROM scoped
    ORDER BY provider, started_at DESC
  ),
  -- How many runs have failed since the last one that did not. This is the
  -- number that separates "a blip" from "the key was revoked on Tuesday".
  streak AS (
    SELECT s.provider,
           COUNT(*)::INTEGER AS consecutive_fails
    FROM scoped s
    WHERE s.outcome = 'failed'
      AND s.started_at > COALESCE(
        (SELECT MAX(ok.started_at) FROM scoped ok
          WHERE ok.provider = s.provider AND ok.outcome <> 'failed'),
        '-infinity'::TIMESTAMPTZ
      )
    GROUP BY s.provider
  )
  SELECT l.provider,
         l.started_at,
         l.outcome,
         l.error,
         (SELECT MAX(started_at) FROM scoped ok
           WHERE ok.provider = l.provider AND ok.outcome = 'success'),
         COALESCE((SELECT SUM(leads_created)::INTEGER FROM scoped r
           WHERE r.provider = l.provider AND r.started_at > now() - INTERVAL '24 hours'), 0),
         COALESCE((SELECT COUNT(*)::INTEGER FROM scoped r
           WHERE r.provider = l.provider AND r.outcome = 'failed'
             AND r.started_at > now() - INTERVAL '24 hours'), 0),
         COALESCE(st.consecutive_fails, 0)
  FROM latest l
  LEFT JOIN streak st ON st.provider = l.provider;
$$;

GRANT EXECUTE ON FUNCTION public.integration_run_summary() TO authenticated;
