-- Migration: 20260731_leads_analytics_expansion.sql

-- 1. Alter Leads Table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value numeric DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;

-- 2. Turnaround Time (TAT) RPC
-- Calculates average speed-to-lead in minutes per agent
CREATE OR REPLACE FUNCTION get_agent_tat(p_company_id uuid)
RETURNS TABLE (
    agent_id text,
    agent_name text,
    avg_tat_minutes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH first_calls AS (
        SELECT 
            c.lead_id,
            MIN(c.timestamp) as first_call_time
        FROM calls c
        WHERE c.company_id = p_company_id
        GROUP BY c.lead_id
    )
    SELECT 
        l.assigned_to as agent_id,
        MAX(u.display_name) as agent_name, -- using max just to get the name safely
        ROUND(AVG(EXTRACT(EPOCH FROM (fc.first_call_time - l.created_at))/60)::numeric, 1) as avg_tat_minutes
    FROM leads l
    JOIN first_calls fc ON l.id = fc.lead_id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.company_id = p_company_id AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to;
END;
$$;

-- 3. Revenue Pipeline RPC
CREATE OR REPLACE FUNCTION get_revenue_pipeline(p_company_id uuid)
RETURNS TABLE (
    status text,
    total_value numeric,
    lead_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(l.status, 'New'),
        SUM(COALESCE(l.deal_value, 0)) as total_value,
        COUNT(*) as lead_count
    FROM leads l
    WHERE l.company_id = p_company_id
    GROUP BY COALESCE(l.status, 'New')
    ORDER BY total_value DESC;
END;
$$;

-- 4. Detailed Churn RPC
CREATE OR REPLACE FUNCTION get_detailed_churn(p_company_id uuid)
RETURNS TABLE (
    reason text,
    count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(l.lost_reason, 'No Reason Given') as reason,
        COUNT(*) as count
    FROM leads l
    WHERE l.company_id = p_company_id 
      AND lower(l.status) NOT IN ('new', 'follow-up', 'converted', 'meeting', 'interested')
    GROUP BY COALESCE(l.lost_reason, 'No Reason Given')
    ORDER BY count DESC;
END;
$$;
