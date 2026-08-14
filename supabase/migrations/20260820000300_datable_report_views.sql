-- Give conversion_funnel and lead_source_yield a date, so the period button
-- can actually reach them.
--
-- These two were the reports that ignored the filter bar. It was not that the
-- hooks forgot to pass the period -- there was nothing to pass it to. Both
-- views grouped by company and status or source and nothing else, so every
-- possible query returned the same all-time answer. Pressing Today and reading
-- a lifetime figure under a lit Today button is worse than having no filter.
--
-- The grain becomes one row per (company, dimension, day). Callers sum over
-- the days in the window.
--
-- lead_source_yield stops returning conversion_rate and returns
-- converted_count instead. A rate cannot be summed across days: adding 10% and
-- 40% gives 50%, and averaging them gives 25% when the true figure depends on
-- how many leads each day carried. The caller divides once, after summing.


-- ---------------------------------------------------------------------------
-- Leads per stage, per day they arrived.
--
-- The date is created_at -- when the lead came in -- not when it reached the
-- stage, which nothing records. So this answers "of the leads that arrived in
-- this period, where are they now", which is the question a funnel is for.
-- It is not a history of movement, and it is not drawn as one.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.conversion_funnel;
CREATE VIEW public.conversion_funnel
WITH (security_invoker = on) AS
  SELECT l.company_id,
         COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown') AS status,
         COUNT(*)::INTEGER                               AS count,
         l.created_at::DATE                              AS date
  FROM public.leads l
  WHERE l.is_deleted = false AND l.created_at IS NOT NULL
  GROUP BY l.company_id, COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown'), l.created_at::DATE;


-- ---------------------------------------------------------------------------
-- What each channel brought in, per day.
--
-- converted_count keeps counting leads with a deal value rather than a "won"
-- status, for the reason recorded when this view was created: leads.status has
-- no CHECK constraint and stage names are per company, so mapping a status to
-- "won" would be a guess printed as a percentage. A deal value is a fact
-- somebody typed.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.lead_source_yield;
CREATE VIEW public.lead_source_yield
WITH (security_invoker = on) AS
  SELECT l.company_id,
         COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown') AS source,
         COUNT(*)::INTEGER                               AS lead_count,
         COUNT(*) FILTER (WHERE COALESCE(l.deal_value, 0) > 0)::INTEGER AS converted_count,
         COALESCE(SUM(l.deal_value) FILTER (WHERE l.deal_value > 0), 0)::NUMERIC AS deal_value_total,
         l.created_at::DATE                              AS date
  FROM public.leads l
  WHERE l.is_deleted = false AND l.created_at IS NOT NULL
  GROUP BY l.company_id, COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown'), l.created_at::DATE;


GRANT SELECT ON public.conversion_funnel  TO authenticated;
GRANT SELECT ON public.lead_source_yield  TO authenticated;
