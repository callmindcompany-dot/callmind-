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
    -- There is no subscriptions.mrr. The original version selected it and
    -- failed with 42703.
    --
    -- Adding the column would repeat the active_members_count mistake: nothing
    -- in the product would write to it, so it would read zero forever. Revenue
    -- is already fully determined by plan, seat count and billing cycle, and
    -- the prices for those live in plan_limits (generated from
    -- src/config/pricing.ts by `npm run gen:plans`).
    --
    -- plan_limits does not exist yet at this point in the migration order, so
    -- the real expression is installed by 20260802000300_organization_tenants_mrr.sql
    -- once it does. NULL here means "not computed", which the UI renders as a
    -- dash -- it does not mean zero revenue.
    NULL::numeric AS mrr
FROM public.companies c;

-- health_score was `85::integer AS health_score` -- the same fabricated number
-- for every tenant on the platform, regardless of their actual usage. Nothing
-- rendered it except a CSV column. Removed rather than faked; a real health
-- score needs inputs this product does not collect yet.
