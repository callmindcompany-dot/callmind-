-- Migration: Create legal_pages_history table and organization_tenants_view view

-- 1. Create legal_pages_history table
CREATE TABLE IF NOT EXISTS public.legal_pages_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    edited_by TEXT,
    edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create organization_tenants_view view
CREATE OR REPLACE VIEW public.organization_tenants_view AS
SELECT 
    c.id,
    c.name,
    NULL::text AS domain,
    c.plan,
    c.plan_status AS status,
    c.seat_limit,
    (SELECT COUNT(*)::integer FROM public.users u WHERE u.company_id = c.id) AS user_count,
    (SELECT COUNT(*)::integer FROM public.leads l WHERE l.company_id = c.id AND l.is_deleted = false) AS lead_count,
    COALESCE((SELECT mrr FROM public.subscriptions s WHERE s.company_id = c.id ORDER BY s.created_at DESC LIMIT 1), 0) AS mrr,
    85::integer AS health_score
FROM public.companies c;
