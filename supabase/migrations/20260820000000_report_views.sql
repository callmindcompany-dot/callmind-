-- The four report sources that were queried but never created.
--
-- ReportsPage has always had modules for Agent Performance, Conversion Funnel,
-- Calling Performance and Source Quality. Their hooks select from
-- agent_performance, conversion_funnel, hourly_call_density and
-- lead_source_yield -- none of which existed. The hooks throw correctly; the
-- page drops the error and renders an empty chart, so four broken reports have
-- been passing as four quiet ones.
--
-- Views rather than tables: every figure is derivable from leads, calls and
-- users, and a table would need a job to keep it fresh. There is no scheduler
-- for that (pg_cron was only installed last week, for polling), and a stale
-- report is worse than a slow one.
--
-- security_invoker = on is mandatory. Without it a view runs as its owner and
-- returns every tenant's rows to whoever asks -- the RLS on the base tables
-- stops applying, which is exactly the hole these reports would open.
--
-- Column names and types are taken from src/types/reports.ts, which is what the
-- components already destructure. Renaming anything here means changing the UI.


-- ---------------------------------------------------------------------------
-- When calls happen, by hour of day.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.hourly_call_density;
CREATE VIEW public.hourly_call_density
WITH (security_invoker = on) AS
  SELECT c.company_id,
         EXTRACT(HOUR FROM c.timestamp)::INTEGER AS hour,
         COUNT(*)::INTEGER                       AS call_count,
         c.timestamp::DATE                       AS date
  FROM public.calls c
  WHERE c.timestamp IS NOT NULL
  GROUP BY c.company_id, EXTRACT(HOUR FROM c.timestamp), c.timestamp::DATE;


-- ---------------------------------------------------------------------------
-- How many leads sit at each stage.
--
-- Deleted leads are excluded; a funnel that counts them describes a pipeline
-- the company does not have.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.conversion_funnel;
CREATE VIEW public.conversion_funnel
WITH (security_invoker = on) AS
  SELECT l.company_id,
         COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown') AS status,
         COUNT(*)::INTEGER                               AS count
  FROM public.leads l
  WHERE l.is_deleted = false
  GROUP BY l.company_id, COALESCE(NULLIF(TRIM(l.status), ''), 'Unknown');


-- ---------------------------------------------------------------------------
-- What each telecaller did, per day.
--
-- calls.duration is TEXT, so the average is guarded: only all-digit values are
-- cast, anything else counts as zero rather than raising 22P02 and taking the
-- whole report down with it. If the mobile app ever writes "2:35" this keeps
-- working and simply does not count it.
--
-- 'connected' and 'converted' follow the outcome vocabulary the mobile app
-- writes (mobile/src/services/callOutcome.ts): outcome 'Connected', and
-- interest 'Interested'.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.agent_performance;
CREATE VIEW public.agent_performance
WITH (security_invoker = on) AS
  SELECT c.company_id,
         c.agent_id,
         MAX(COALESCE(u.display_name, u.name))                       AS agent_name,
         COUNT(*)::INTEGER                                           AS total_dials,
         COUNT(*) FILTER (WHERE c.outcome = 'Connected')::INTEGER    AS connected,
         COUNT(*) FILTER (WHERE c.interest = 'Interested')::INTEGER  AS conversions,
         COALESCE(AVG(
           CASE WHEN c.duration ~ '^[0-9]+$' THEN c.duration::NUMERIC ELSE 0 END
         ), 0)::NUMERIC(10,2)                                        AS talk_time_avg,
         c.timestamp::DATE                                           AS date
  FROM public.calls c
  LEFT JOIN public.users u
         ON u.id = c.agent_id AND u.company_id = c.company_id
  WHERE c.timestamp IS NOT NULL AND c.agent_id IS NOT NULL
  GROUP BY c.company_id, c.agent_id, c.timestamp::DATE;


-- ---------------------------------------------------------------------------
-- What each acquisition channel returns.
--
-- conversion_rate counts leads with a deal value recorded, deliberately rather
-- than a "won" status. leads.status has no CHECK constraint and the stage names
-- are per company (team_settings.leads_statuses), so any mapping of status to
-- "won" would be a guess printed as a percentage -- and a percentage is
-- believed. A deal value is a fact somebody typed.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.lead_source_yield;
CREATE VIEW public.lead_source_yield
WITH (security_invoker = on) AS
  SELECT l.company_id,
         COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown') AS source,
         COUNT(*)::INTEGER                               AS lead_count,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE COALESCE(l.deal_value, 0) > 0)
                 / NULLIF(COUNT(*), 0)
         , 1)::NUMERIC(5,1)                              AS conversion_rate
  FROM public.leads l
  WHERE l.is_deleted = false
  GROUP BY l.company_id, COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown');


GRANT SELECT ON public.hourly_call_density TO authenticated;
GRANT SELECT ON public.conversion_funnel   TO authenticated;
GRANT SELECT ON public.agent_performance   TO authenticated;
GRANT SELECT ON public.lead_source_yield   TO authenticated;
