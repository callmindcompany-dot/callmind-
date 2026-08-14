-- Three report functions that have never once returned a row.
--
-- ReportsPage checks isError nowhere, so each of these throws, the hook's error
-- is dropped, and the module renders as empty. "No neglected leads" is what an
-- owner has been reading off a query that cannot run.
--
--   get_stale_leads    selects l.last_contacted_at. The column is
--                      last_contact_at. Every call raises 42703.
--
--   get_agent_tat      declares p_company_id UUID and compares it to
--                      calls.company_id, which is TEXT. Every call raises
--                      42883, operator does not exist: text = uuid. The
--                      turnaround column in Agent Performance has always been
--                      blank for this reason, not because nobody was slow.
--
--   get_comparison_metrics  does not exist at all. The Compare Period tickbox
--                      has never had anything to call.
--
-- companies.id is TEXT throughout this schema. It currently happens to hold
-- uuid-shaped strings, which is why the UUID signature was not noticed sooner:
-- the cast at the call site succeeded and the failure moved inside the
-- function. The parameters below are TEXT, matching the columns they are
-- compared against.


-- ---------------------------------------------------------------------------
-- Leads nobody has come back to.
--
-- The cutoff is a parameter rather than a buried '7 days', so the page can say
-- which number it used instead of the caller having to trust the prose.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_stale_leads(UUID);
DROP FUNCTION IF EXISTS public.get_stale_leads(TEXT);
DROP FUNCTION IF EXISTS public.get_stale_leads(TEXT, INTEGER);

CREATE FUNCTION public.get_stale_leads(p_company_id TEXT, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  phone TEXT,
  source TEXT,
  status TEXT,
  assigned_to TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER          -- RLS on leads decides what the caller may see
SET search_path = public
AS $$
  SELECT l.id, l.name, l.phone, l.source, l.status, l.assigned_to,
         l.last_contact_at, l.created_at
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND (l.last_contact_at IS NULL
         OR l.last_contact_at < now() - make_interval(days => p_days))
  -- Never contacted first: those are the ones actually being lost.
  ORDER BY l.last_contact_at ASC NULLS FIRST, l.created_at ASC;
$$;


-- ---------------------------------------------------------------------------
-- How long a lead waits for its first call.
--
-- Same computation as before, with the parameter typed to match the columns.
-- The agent name falls back through display_name, name, email rather than
-- returning NULL when only display_name is unset.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_agent_tat(UUID);
DROP FUNCTION IF EXISTS public.get_agent_tat(TEXT);

CREATE FUNCTION public.get_agent_tat(p_company_id TEXT)
RETURNS TABLE (
  agent_id TEXT,
  agent_name TEXT,
  avg_tat_minutes NUMERIC,
  leads_measured INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH first_calls AS (
    SELECT c.lead_id, MIN(c.timestamp) AS first_call_time
    FROM public.calls c
    WHERE c.company_id = p_company_id AND c.lead_id IS NOT NULL
    GROUP BY c.lead_id
  )
  SELECT l.assigned_to AS agent_id,
         MAX(COALESCE(u.display_name, u.name, u.email)) AS agent_name,
         ROUND(AVG(EXTRACT(EPOCH FROM (fc.first_call_time - l.created_at)) / 60)::NUMERIC, 1)
           AS avg_tat_minutes,
         COUNT(*)::INTEGER AS leads_measured
  FROM public.leads l
  JOIN first_calls fc ON fc.lead_id = l.id
  LEFT JOIN public.users u ON u.id = l.assigned_to AND u.company_id = l.company_id
  WHERE l.company_id = p_company_id
    AND l.assigned_to IS NOT NULL
    AND l.is_deleted = false
    -- A call logged before the lead existed means an imported backdated row.
    -- Averaging a negative wait in would drag the figure below zero and make
    -- the whole column untrustworthy.
    AND fc.first_call_time >= l.created_at
  GROUP BY l.assigned_to;
$$;


-- ---------------------------------------------------------------------------
-- This period against the one before it.
--
-- Both windows are half-open, [start, end), and the caller supplies both --
-- src/lib/reportFilters.ts derives them from the same button so the two cannot
-- describe different spans.
--
-- Connect rate is a percentage of dials, returned as 0 when there were no
-- dials. Returning NULL would render as an empty cell that reads the same as a
-- genuine zero.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_comparison_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_comparison_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_comparison_metrics(
  p_company_id     TEXT,
  p_current_start  TIMESTAMPTZ,
  p_current_end    TIMESTAMPTZ,
  p_previous_start TIMESTAMPTZ,
  p_previous_end   TIMESTAMPTZ
)
RETURNS TABLE (
  current_leads           INTEGER,
  previous_leads          INTEGER,
  current_calls           INTEGER,
  previous_calls          INTEGER,
  current_conversions     INTEGER,
  previous_conversions    INTEGER,
  current_connect_rate    NUMERIC,
  previous_connect_rate   NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH l AS (
    SELECT
      COUNT(*) FILTER (WHERE created_at >= p_current_start  AND created_at < p_current_end)  AS cur,
      COUNT(*) FILTER (WHERE created_at >= p_previous_start AND created_at < p_previous_end) AS prev
    FROM public.leads
    WHERE company_id = p_company_id AND is_deleted = false
  ),
  c AS (
    SELECT
      COUNT(*) FILTER (WHERE timestamp >= p_current_start  AND timestamp < p_current_end)  AS cur,
      COUNT(*) FILTER (WHERE timestamp >= p_previous_start AND timestamp < p_previous_end) AS prev,
      COUNT(*) FILTER (WHERE outcome = 'Connected'
                         AND timestamp >= p_current_start  AND timestamp < p_current_end)  AS cur_conn,
      COUNT(*) FILTER (WHERE outcome = 'Connected'
                         AND timestamp >= p_previous_start AND timestamp < p_previous_end) AS prev_conn,
      -- A conversion is a call the person said yes on. leads.status has no
      -- CHECK constraint and stage names differ per company, so deriving this
      -- from a "won" status would be a guess printed as a number.
      COUNT(*) FILTER (WHERE interest = 'Interested'
                         AND timestamp >= p_current_start  AND timestamp < p_current_end)  AS cur_int,
      COUNT(*) FILTER (WHERE interest = 'Interested'
                         AND timestamp >= p_previous_start AND timestamp < p_previous_end) AS prev_int
    FROM public.calls
    WHERE company_id = p_company_id
  )
  SELECT l.cur::INTEGER, l.prev::INTEGER,
         c.cur::INTEGER, c.prev::INTEGER,
         c.cur_int::INTEGER, c.prev_int::INTEGER,
         COALESCE(ROUND(100.0 * c.cur_conn  / NULLIF(c.cur, 0),  1), 0)::NUMERIC,
         COALESCE(ROUND(100.0 * c.prev_conn / NULLIF(c.prev, 0), 1), 0)::NUMERIC
  FROM l, c;
$$;


GRANT EXECUTE ON FUNCTION public.get_stale_leads(TEXT, INTEGER)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_tat(TEXT)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comparison_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
