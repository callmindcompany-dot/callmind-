-- Six more report functions that raised on every call.
--
-- Same fault as get_agent_tat: p_company_id is declared UUID and compared to
-- leads.company_id, which is TEXT, so every call raised 42883 -- operator does
-- not exist: text = uuid. Together with the three fixed in
-- 20260820000200, nine report features in this product have never once
-- returned a row, and none of them looked broken, because ReportsPage rendered
-- the empty result as an ordinary quiet report.
--
-- Affected: Geographical Analytics, Lost Reasons, Lead Status Pipeline,
-- Source Conversions, Revenue Pipeline, Detailed Churn.
--
-- Three further changes, applied to all six.
--
-- They take a date window. Without one these charts would keep answering for
-- all time under a lit period button, which is the same fault the views had.
-- NULL bounds mean unbounded, so a caller that genuinely wants everything can
-- still ask for it, explicitly.
--
-- They exclude deleted leads. None of them did, so a company that cleaned up
-- its list saw the deleted rows still counted in every one of these charts.
--
-- "Converted" stops meaning lower(status) = 'converted'. leads.status has no
-- CHECK constraint and stage names are per company -- a company using "Closed"
-- or "Deal Done" scored zero conversions here for ever, with no error. It now
-- counts leads carrying a deal_value, the same definition lead_source_yield
-- uses, so the two cannot disagree on the same screen.
--
-- Likewise "lost" stops being "status not in this hardcoded list of six
-- words". It is a lead with a lost_reason recorded -- a fact somebody entered
-- rather than a guess about what a stage name means.


-- ---------------------------------------------------------------------------
-- Leads and deals by city.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_geographic_distribution(UUID);
DROP FUNCTION IF EXISTS public.get_geographic_distribution(TEXT);
DROP FUNCTION IF EXISTS public.get_geographic_distribution(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_geographic_distribution(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (city TEXT, lead_count INTEGER, conversions INTEGER, deal_value NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.city), ''), 'Unknown')                       AS city,
         COUNT(*)::INTEGER                                                   AS lead_count,
         COUNT(*) FILTER (WHERE COALESCE(l.deal_value, 0) > 0)::INTEGER      AS conversions,
         COALESCE(SUM(l.deal_value) FILTER (WHERE l.deal_value > 0), 0)::NUMERIC AS deal_value
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.city), ''), 'Unknown')
  ORDER BY 2 DESC
  LIMIT 20;
$$;


-- ---------------------------------------------------------------------------
-- Why leads were lost.
--
-- get_lost_reasons returned l.status under a column called "reason", which is
-- a stage name, not a reason. Both this and get_detailed_churn now read
-- lost_reason, so the two agree; they differ only in that this one keeps the
-- leads whose reason was never filled in visible as their own bucket rather
-- than hiding them.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_lost_reasons(UUID);
DROP FUNCTION IF EXISTS public.get_lost_reasons(TEXT);
DROP FUNCTION IF EXISTS public.get_lost_reasons(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_lost_reasons(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (reason TEXT, count INTEGER)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.lost_reason), ''), 'No reason recorded') AS reason,
         COUNT(*)::INTEGER                                              AS count
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND l.lost_reason IS NOT NULL
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.lost_reason), ''), 'No reason recorded')
  ORDER BY 2 DESC;
$$;


DROP FUNCTION IF EXISTS public.get_detailed_churn(UUID);
DROP FUNCTION IF EXISTS public.get_detailed_churn(TEXT);
DROP FUNCTION IF EXISTS public.get_detailed_churn(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_detailed_churn(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (reason TEXT, count INTEGER, lost_value NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.lost_reason), ''), 'No reason recorded') AS reason,
         COUNT(*)::INTEGER                                              AS count,
         COALESCE(SUM(l.estimated_budget) FILTER (WHERE l.estimated_budget > 0), 0)::NUMERIC
           AS lost_value
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND l.lost_reason IS NOT NULL
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.lost_reason), ''), 'No reason recorded')
  ORDER BY 2 DESC;
$$;


-- ---------------------------------------------------------------------------
-- Leads per stage.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_lead_status_pipeline(UUID);
DROP FUNCTION IF EXISTS public.get_lead_status_pipeline(TEXT);
DROP FUNCTION IF EXISTS public.get_lead_status_pipeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_lead_status_pipeline(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (status TEXT, count INTEGER)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown') AS status,
         COUNT(*)::INTEGER                               AS count
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown')
  ORDER BY 2 DESC;
$$;


-- ---------------------------------------------------------------------------
-- Leads and deals by channel.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_source_conversions(UUID);
DROP FUNCTION IF EXISTS public.get_source_conversions(TEXT);
DROP FUNCTION IF EXISTS public.get_source_conversions(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_source_conversions(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (source TEXT, lead_count INTEGER, conversions INTEGER)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown')                  AS source,
         COUNT(*)::INTEGER                                                AS lead_count,
         COUNT(*) FILTER (WHERE COALESCE(l.deal_value, 0) > 0)::INTEGER   AS conversions
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown')
  ORDER BY 2 DESC;
$$;


-- ---------------------------------------------------------------------------
-- What the pipeline is worth, by stage.
--
-- Committed and estimated are returned separately and never added, for the
-- reason recorded on the pipeline_value view: deal_value is money somebody
-- committed and estimated_budget is what the caller guessed, and one number
-- made of both is a forecast built on a hope.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_revenue_pipeline(UUID);
DROP FUNCTION IF EXISTS public.get_revenue_pipeline(TEXT);
DROP FUNCTION IF EXISTS public.get_revenue_pipeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.get_revenue_pipeline(
  p_company_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (status TEXT, total_value NUMERIC, estimated_value NUMERIC, lead_count INTEGER)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown')                        AS status,
         COALESCE(SUM(l.deal_value)       FILTER (WHERE l.deal_value > 0), 0)::NUMERIC       AS total_value,
         COALESCE(SUM(l.estimated_budget) FILTER (WHERE l.estimated_budget > 0), 0)::NUMERIC AS estimated_value,
         COUNT(*)::INTEGER                                                      AS lead_count
  FROM public.leads l
  WHERE l.company_id = p_company_id
    AND l.is_deleted = false
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to   IS NULL OR l.created_at <  p_to)
  GROUP BY COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown')
  ORDER BY 2 DESC;
$$;


GRANT EXECUTE ON FUNCTION public.get_geographic_distribution(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lost_reasons(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_detailed_churn(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_status_pipeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_source_conversions(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_pipeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)        TO authenticated;
