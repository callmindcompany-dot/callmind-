-- Data sources for the five charts the founder asked for first.
--
--   1. Lead conversion funnel      -> conversion_funnel      (already exists)
--   2. Call outcome donut          -> call_outcome_summary   (here)
--   3. Calls per agent             -> agent_performance      (already exists)
--   4. Follow-up status            -> followup_status        (here)
--   5. Pipeline value              -> pipeline_value         (here)
--
-- security_invoker = on on all three. Without it a view runs as its owner and
-- returns every tenant's rows to whoever asks.


-- ---------------------------------------------------------------------------
-- 2. How calls ended.
--
-- The request listed Answered / Not Answered / Busy / Callback / Interested /
-- Not Interested. Those are two different questions and the app records them in
-- two different columns: `outcome` says whether the phone was picked up, and
-- `interest` says what the person said once it was. Folding them into one ring
-- would double-count -- a connected call has both.
--
-- So this returns both, tagged, and the chart can show either or stack them as
-- two rings. Neither column has a CHECK constraint, so whatever the app writes
-- is what appears; the vocabulary the Expo app currently uses is
-- Connected / No Answer / Busy / Invalid Number / Wrong Number and
-- Interested / Not Interested / Call Back Later.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.call_outcome_summary;
CREATE VIEW public.call_outcome_summary
WITH (security_invoker = on) AS
  SELECT company_id,
         'outcome'::TEXT AS kind,
         COALESCE(NULLIF(TRIM(outcome), ''), 'Not recorded') AS label,
         COUNT(*)::INTEGER AS count,
         timestamp::DATE AS date
  FROM public.calls
  WHERE timestamp IS NOT NULL
  GROUP BY company_id, COALESCE(NULLIF(TRIM(outcome), ''), 'Not recorded'), timestamp::DATE

  UNION ALL

  SELECT company_id,
         'interest'::TEXT AS kind,
         COALESCE(NULLIF(TRIM(interest), ''), 'Not recorded') AS label,
         COUNT(*)::INTEGER AS count,
         timestamp::DATE AS date
  FROM public.calls
  WHERE timestamp IS NOT NULL
    -- Interest is only meaningful on a call that connected; counting "Not
    -- Interested" against a phone that never rang would inflate rejection.
    AND outcome = 'Connected'
  GROUP BY company_id, COALESCE(NULLIF(TRIM(interest), ''), 'Not recorded'), timestamp::DATE;


-- ---------------------------------------------------------------------------
-- 4. Follow-ups: what is due, what is late, what is done.
--
-- The request asked for Pending / Overdue / Completed / Missed. The table only
-- permits three statuses -- CHECK (status IN ('Pending','Completed','Paused')) --
-- so Overdue is not a status anybody can set. It is a Pending callback whose
-- reminder_date has gone by, and it has to be computed. "Missed" is the same
-- thing under a different name, so it is not a separate bucket here; inventing
-- one would mean two columns for one fact that could disagree.
--
-- Paused is real and is kept, because a deliberately paused follow-up is not
-- the same as a forgotten one.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.followup_status;
CREATE VIEW public.followup_status
WITH (security_invoker = on) AS
  SELECT company_id,
         assigned_to,
         CASE
           WHEN status = 'Completed' THEN 'Completed'
           WHEN status = 'Paused'    THEN 'Paused'
           WHEN reminder_date < now() THEN 'Overdue'
           ELSE 'Due'
         END AS bucket,
         COUNT(*)::INTEGER AS count,
         MIN(reminder_date) AS oldest
  FROM public.callbacks
  GROUP BY company_id, assigned_to,
           CASE
             WHEN status = 'Completed' THEN 'Completed'
             WHEN status = 'Paused'    THEN 'Paused'
             WHEN reminder_date < now() THEN 'Overdue'
             ELSE 'Due'
           END;


-- ---------------------------------------------------------------------------
-- 5. What the pipeline is worth, by stage.
--
-- Two figures, deliberately not added together. deal_value is money somebody
-- committed to a lead; estimated_budget is what the caller guessed the customer
-- might spend. Summing them into one "pipeline value" would mix a fact with a
-- hope, and forecasting off that number is how a sales forecast becomes
-- fiction -- which is exactly what `budgetVal = parseFloat(...) || 500` did in
-- this codebase before it was removed.
--
-- The chart stacks them as separate series so the committed part is visible
-- inside the estimated whole.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.pipeline_value;
CREATE VIEW public.pipeline_value
WITH (security_invoker = on) AS
  SELECT company_id,
         COALESCE(NULLIF(TRIM(status), ''), 'Unknown') AS status,
         COUNT(*)::INTEGER AS lead_count,
         COALESCE(SUM(deal_value)       FILTER (WHERE deal_value > 0), 0)::NUMERIC       AS committed_value,
         COALESCE(SUM(estimated_budget) FILTER (WHERE estimated_budget > 0), 0)::NUMERIC AS estimated_value
  FROM public.leads
  WHERE is_deleted = false
  GROUP BY company_id, COALESCE(NULLIF(TRIM(status), ''), 'Unknown');


GRANT SELECT ON public.call_outcome_summary TO authenticated;
GRANT SELECT ON public.followup_status      TO authenticated;
GRANT SELECT ON public.pipeline_value       TO authenticated;
