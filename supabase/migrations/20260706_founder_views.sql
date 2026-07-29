-- Supabase Rebuild Migration: Founder Dashboards and Support Management

-- 1. Create support_tickets table if not exists
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    company_name TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    user_designation TEXT,
    user_phone TEXT,
    title TEXT,
    description TEXT NOT NULL,
    steps TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
    client_health_score INTEGER DEFAULT 80,
    os_info TEXT,
    browser_info TEXT,
    network_latency TEXT,
    attachment_url TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for support_tickets queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 2. Alter announcements table to make company_id nullable for global announcements
ALTER TABLE announcements ALTER COLUMN company_id DROP NOT NULL;

-- 3. Create company_stats_view
CREATE OR REPLACE VIEW company_stats_view AS
SELECT 
  c.id,
  c.name,
  c.plan,
  c.plan_status AS status,
  COALESCE((SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id AND l.is_deleted = false), 0) AS leads_count,
  COALESCE((SELECT COUNT(*) FROM users u WHERE u.company_id = c.id), 0) AS agents_count,
  CASE 
    WHEN c.plan = 'Enterprise' THEN 1200
    WHEN c.plan = 'Professional' THEN 450
    WHEN c.plan = 'Basic' THEN 150
    ELSE 0
  END AS mrr,
  GREATEST(0, LEAST(100, 100 - (SELECT COUNT(*) FROM support_tickets t WHERE t.company_id = c.id AND t.status = 'open')::int * 15)) AS health_score,
  ROUND(COALESCE((SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id AND l.is_deleted = false)::numeric * 0.0012, 0) + 0.8, 2) AS storage_used,
  CASE 
    WHEN c.plan = 'Enterprise' THEN 10.0
    WHEN c.plan = 'Professional' THEN 5.0
    WHEN c.plan = 'Basic' THEN 2.0
    ELSE 1.0
  END AS storage_limit,
  COALESCE(c.created_at + INTERVAL '1 month', NOW() + INTERVAL '15 days') AS renewal_date
FROM companies c;

-- 4. Create platform_stats_view
CREATE OR REPLACE VIEW platform_stats_view AS
SELECT
  COUNT(id) AS total_companies,
  COALESCE(SUM(leads_count), 0) AS total_leads,
  COALESCE(SUM(agents_count), 0) AS total_agents,
  COALESCE(SUM(mrr), 0) AS total_mrr,
  COALESCE(SUM(mrr) * 12, 0) AS total_arr,
  COALESCE(COUNT(CASE WHEN status = 'Paused' OR status = 'Suspended' THEN 1 END), 0) AS churned_this_month
FROM company_stats_view;
