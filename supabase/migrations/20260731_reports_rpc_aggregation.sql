-- Drop functions if they already exist
DROP FUNCTION IF EXISTS get_reports_summary(uuid);
DROP FUNCTION IF EXISTS get_stale_leads(uuid);

-- Function: get_reports_summary
CREATE OR REPLACE FUNCTION get_reports_summary(p_company_id uuid)
RETURNS TABLE (
    total_leads bigint,
    total_calls bigint,
    conversions bigint,
    connects bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM leads WHERE company_id = p_company_id) as total_leads,
        (SELECT COUNT(*) FROM calls WHERE company_id = p_company_id) as total_calls,
        (SELECT COUNT(*) FROM leads WHERE company_id = p_company_id AND lower(status) = 'converted') as conversions,
        (SELECT COUNT(*) FROM calls WHERE company_id = p_company_id AND (outcome = 'Answered' OR status = 'completed')) as connects;
END;
$$;

-- Function: get_stale_leads
-- Returns leads that haven't been contacted in the last 7 days.
CREATE OR REPLACE FUNCTION get_stale_leads(p_company_id uuid)
RETURNS TABLE (
    id text,
    name text,
    phone text,
    source text,
    last_contacted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.phone,
        l.source,
        l.last_contacted_at
    FROM leads l
    WHERE l.company_id = p_company_id
      AND (
          l.last_contacted_at IS NULL OR 
          l.last_contacted_at < (now() - interval '7 days')
      )
    ORDER BY l.last_contacted_at NULLS FIRST;
END;
$$;
