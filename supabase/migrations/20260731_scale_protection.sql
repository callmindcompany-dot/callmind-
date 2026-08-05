-- 1. Enable pg_trgm extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Trigram Indexes on leads table for Name and Phone
-- These indexes will allow instant searches using ILIKE '%...%' even on 5 Lakh rows
CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON public.leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm ON public.leads USING gin (phone gin_trgm_ops);

-- 3. Create a Dashboard Stats RPC
-- This prevents the frontend from fetching 5 Lakh rows just to calculate counts
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_company_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_leads INTEGER;
    v_leads_today INTEGER;
    v_unassigned_leads INTEGER;
    v_converted_leads INTEGER;
    v_followups_due INTEGER;
    v_result jsonb;
BEGIN
    -- Fast Counts
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE company_id = p_company_id AND is_deleted = false;
    
    SELECT COUNT(*) INTO v_leads_today FROM public.leads 
    WHERE company_id = p_company_id AND is_deleted = false AND created_at >= CURRENT_DATE;

    SELECT COUNT(*) INTO v_unassigned_leads FROM public.leads 
    WHERE company_id = p_company_id AND is_deleted = false AND (assigned_to IS NULL OR assigned_to = '');

    SELECT COUNT(*) INTO v_converted_leads FROM public.leads 
    WHERE company_id = p_company_id AND is_deleted = false AND status = 'Converted';

    SELECT COUNT(*) INTO v_followups_due FROM public.leads 
    WHERE company_id = p_company_id AND is_deleted = false AND status = 'Call Back';

    -- Build the JSON response
    v_result := jsonb_build_object(
        'totalLeads', COALESCE(v_total_leads, 0),
        'leadsToday', COALESCE(v_leads_today, 0),
        'unassignedLeads', COALESCE(v_unassigned_leads, 0),
        'convertedLeads', COALESCE(v_converted_leads, 0),
        'followupsDue', COALESCE(v_followups_due, 0)
    );

    RETURN v_result;
END;
$$;
