-- Migration: Reports and Analytics Views/Functions
-- Decouples Firestore and pre-aggregates calling and lead metrics on the database side.

-- 1. Hourly Call Density View
CREATE OR REPLACE VIEW hourly_call_density AS
SELECT 
  company_id,
  EXTRACT(HOUR FROM timestamp::timestamp) AS hour,
  COUNT(id) AS call_count,
  DATE(timestamp) AS date
FROM calls
GROUP BY company_id, hour, date
ORDER BY date DESC, hour ASC;

-- 2. Conversion Funnel View
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT 
  company_id,
  status,
  COUNT(id) AS count
FROM leads
GROUP BY company_id, status;

-- 3. Agent Performance View
CREATE OR REPLACE VIEW agent_performance AS
SELECT 
  c.company_id,
  c.created_by AS agent_id,
  u.display_name AS agent_name,
  COUNT(c.id) AS total_dials,
  COUNT(CASE WHEN c.outcome = 'Answered' OR c.status = 'completed' THEN 1 END) AS connected,
  COUNT(CASE WHEN l.status = 'converted' THEN 1 END) AS conversions,
  ROUND(AVG(
    CASE 
      WHEN c.duration LIKE '%m%s' THEN 
        (SUBSTRING(c.duration FROM '(\d+)m')::integer * 60) + SUBSTRING(c.duration FROM '(\d+)s')::integer
      ELSE COALESCE(NULLIF(REGEXP_REPLACE(c.duration, '\D', '', 'g'), '')::integer, 0)
    END
  )) AS talk_time_avg,
  DATE(c.timestamp) AS date
FROM calls c
LEFT JOIN users u ON u.id = c.created_by
LEFT JOIN leads l ON l.id = c.lead_id
GROUP BY c.company_id, c.created_by, u.display_name, date;

-- 4. Lead Source Yield View
CREATE OR REPLACE VIEW lead_source_yield AS
SELECT 
  company_id,
  source,
  COUNT(id) AS lead_count,
  ROUND(
    (COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / NULLIF(COUNT(id), 0)) * 100, 
    2
  ) AS conversion_rate
FROM leads
GROUP BY company_id, source;

-- 5. Comparison Metrics RPC Function
CREATE OR REPLACE FUNCTION get_comparison_metrics(
  p_company_id UUID,
  p_current_start TIMESTAMP WITH TIME ZONE,
  p_current_end TIMESTAMP WITH TIME ZONE,
  p_previous_start TIMESTAMP WITH TIME ZONE,
  p_previous_end TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  v_curr_leads INT;
  v_prev_leads INT;
  v_curr_calls INT;
  v_prev_calls INT;
  v_curr_conversions INT;
  v_prev_conversions INT;
  v_curr_connected INT;
  v_prev_connected INT;
  v_curr_connect_rate NUMERIC;
  v_prev_connect_rate NUMERIC;
BEGIN
  -- Current Period Leads
  SELECT COUNT(id) INTO v_curr_leads 
  FROM leads 
  WHERE company_id = p_company_id AND created_at >= p_current_start AND created_at <= p_current_end;

  -- Previous Period Leads
  SELECT COUNT(id) INTO v_prev_leads 
  FROM leads 
  WHERE company_id = p_company_id AND created_at >= p_previous_start AND created_at <= p_previous_end;

  -- Current Period Calls
  SELECT COUNT(id) INTO v_curr_calls 
  FROM calls 
  WHERE company_id = p_company_id AND timestamp >= p_current_start AND timestamp <= p_current_end;

  -- Previous Period Calls
  SELECT COUNT(id) INTO v_prev_calls 
  FROM calls 
  WHERE company_id = p_company_id AND timestamp >= p_previous_start AND timestamp <= p_previous_end;

  -- Current Period Conversions
  SELECT COUNT(id) INTO v_curr_conversions 
  FROM leads 
  WHERE company_id = p_company_id AND status = 'converted' AND updated_at >= p_current_start AND updated_at <= p_current_end;

  -- Previous Period Conversions
  SELECT COUNT(id) INTO v_prev_conversions 
  FROM leads 
  WHERE company_id = p_company_id AND status = 'converted' AND updated_at >= p_previous_start AND updated_at <= p_previous_end;

  -- Current Period Connected Calls
  SELECT COUNT(id) INTO v_curr_connected 
  FROM calls 
  WHERE company_id = p_company_id AND (outcome = 'Answered' OR status = 'completed') AND timestamp >= p_current_start AND timestamp <= p_current_end;

  -- Previous Period Connected Calls
  SELECT COUNT(id) INTO v_prev_connected 
  FROM calls 
  WHERE company_id = p_company_id AND (outcome = 'Answered' OR status = 'completed') AND timestamp >= p_previous_start AND timestamp <= p_previous_end;

  -- Rates
  v_curr_connect_rate := ROUND((v_curr_connected::numeric / NULLIF(v_curr_calls, 0)) * 100, 1);
  v_prev_connect_rate := ROUND((v_prev_connected::numeric / NULLIF(v_prev_calls, 0)) * 100, 1);

  RETURN json_build_object(
    'current_leads', COALESCE(v_curr_leads, 0),
    'previous_leads', COALESCE(v_prev_leads, 0),
    'current_calls', COALESCE(v_curr_calls, 0),
    'previous_calls', COALESCE(v_prev_calls, 0),
    'current_conversions', COALESCE(v_curr_conversions, 0),
    'previous_conversions', COALESCE(v_prev_conversions, 0),
    'current_connect_rate', COALESCE(v_curr_connect_rate, 0.0),
    'previous_connect_rate', COALESCE(v_prev_connect_rate, 0.0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL,
  metrics TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
