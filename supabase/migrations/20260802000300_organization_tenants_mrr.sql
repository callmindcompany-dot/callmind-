-- Give organization_tenants_view a real MRR.
--
-- 20260718_legal_and_tenants.sql defines the view with `NULL::numeric AS mrr`,
-- because the prices live in plan_limits and that table is not created until
-- 20260802000100_plan_limits_seed.sql. This runs after it and installs the
-- actual expression.
--
-- The number is derived, never stored. plan_limits is generated from
-- src/config/pricing.ts by `npm run gen:plans`, so a price change flows through
-- to this view with no migration -- which is the whole point of keeping prices
-- in one file.

DROP VIEW IF EXISTS public.organization_tenants_view;

CREATE VIEW public.organization_tenants_view AS
SELECT
    c.id,
    c.name,
    NULL::text AS domain,
    c.plan,
    c.plan_status AS status,
    c.seat_limit,
    (SELECT COUNT(*)::integer FROM public.users u WHERE u.company_id = c.id) AS user_count,
    (SELECT COUNT(*)::integer FROM public.leads l
      WHERE l.company_id = c.id AND l.is_deleted = false) AS lead_count,

    -- Monthly recurring revenue, in rupees.
    --
    -- Only tenants who are actually paying contribute. A trial, an expired
    -- account and a cancelled one all bill nothing this month, so they are 0 --
    -- a real zero, not a missing value.
    --
    -- annual_price in plan_limits is the per-seat *monthly* rate when billed
    -- annually (the discounted rate), not the yearly total, so both branches
    -- are already monthly and no division is needed.
    CASE
      WHEN c.plan_status <> 'active' THEN 0::numeric
      WHEN c.billing_cycle = 'annual' THEN (COALESCE(c.seat_limit, 0) * pl.annual_price)::numeric
      ELSE (COALESCE(c.seat_limit, 0) * pl.monthly_price)::numeric
    END AS mrr

FROM public.companies c
-- LEFT JOIN: a company whose plan is not in plan_limits still appears in the
-- list, with a NULL mrr. Dropping the tenant from the founder's own tenant list
-- because of a bad plan string would hide exactly the row worth investigating.
LEFT JOIN public.plan_limits pl ON pl.id = c.plan;

-- Without this the view runs as its owner and reads straight through RLS on
-- companies, users and leads -- every authenticated customer could list every
-- tenant on the platform. 20260730_rls_gap_closure.sql already sets this on the
-- view, but that migration runs before this one recreates it, so the setting
-- would be lost. Set it here too.
ALTER VIEW public.organization_tenants_view SET (security_invoker = true);
