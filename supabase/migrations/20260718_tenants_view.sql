-- Migration: Add domain and health_score columns, and create organization_tenants_view

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 80;

-- Create or replace view
CREATE OR REPLACE VIEW public.organization_tenants_view AS
SELECT
  c.id,
  c.name,
  COALESCE(c.domain, LOWER(REGEXP_REPLACE(c.name, '\s+', '', 'g')) || '.com') AS domain,
  COALESCE(c.plan, 'Trial') AS plan,
  COALESCE(c.plan_status, 'Active') AS status,
  COALESCE((SELECT COUNT(*)::int FROM public.users u WHERE u.company_id = c.id), 0) AS user_count,
  COALESCE((SELECT COUNT(*)::int FROM public.leads l WHERE l.company_id = c.id AND l.is_deleted = false), 0) AS lead_count,
  COALESCE((SELECT SUM(amount)::numeric FROM public.invoices i WHERE i.company_id = c.id AND i.status = 'paid'), 
           (CASE 
              WHEN c.plan = 'Enterprise' THEN 12000
              WHEN c.plan = 'Professional' THEN 4500
              WHEN c.plan = 'Basic' THEN 1500
              ELSE 0
            END))::numeric AS mrr,
  GREATEST(0, LEAST(100, COALESCE(c.health_score, 80))) AS health_score,
  COALESCE(c.seat_limit, c.member_limit, 10)::int AS seat_limit
FROM public.companies c;

-- Grant select access to authenticated roles
GRANT SELECT ON public.organization_tenants_view TO authenticated;
GRANT SELECT ON public.organization_tenants_view TO anon;
