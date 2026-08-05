-- Geographic Distribution of Leads
CREATE OR REPLACE FUNCTION get_geographic_distribution(p_company_id uuid)
RETURNS TABLE (
    city text,
    lead_count bigint,
    conversions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(l.city, 'Unknown') as city,
        COUNT(*) as lead_count,
        SUM(CASE WHEN lower(l.status) = 'converted' THEN 1 ELSE 0 END) as conversions
    FROM leads l
    WHERE l.company_id = p_company_id
    GROUP BY COALESCE(l.city, 'Unknown')
    ORDER BY lead_count DESC
    LIMIT 20;
END;
$$;

-- Lost Reasons Analytics (Status distribution excluding positive statuses)
CREATE OR REPLACE FUNCTION get_lost_reasons(p_company_id uuid)
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
        l.status as reason,
        COUNT(*) as count
    FROM leads l
    WHERE l.company_id = p_company_id 
      AND lower(l.status) NOT IN ('new', 'follow-up', 'converted', 'meeting', 'interested')
    GROUP BY l.status
    ORDER BY count DESC;
END;
$$;

-- Lead Status Pipeline
CREATE OR REPLACE FUNCTION get_lead_status_pipeline(p_company_id uuid)
RETURNS TABLE (
    status text,
    count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.status,
        COUNT(*) as count
    FROM leads l
    WHERE l.company_id = p_company_id
    GROUP BY l.status
    ORDER BY count DESC;
END;
$$;

-- Lead Source Conversions (Yield)
CREATE OR REPLACE FUNCTION get_source_conversions(p_company_id uuid)
RETURNS TABLE (
    source text,
    lead_count bigint,
    conversions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(l.source, 'Unknown') as source,
        COUNT(*) as lead_count,
        SUM(CASE WHEN lower(l.status) = 'converted' THEN 1 ELSE 0 END) as conversions
    FROM leads l
    WHERE l.company_id = p_company_id
    GROUP BY COALESCE(l.source, 'Unknown')
    ORDER BY lead_count DESC;
END;
$$;
