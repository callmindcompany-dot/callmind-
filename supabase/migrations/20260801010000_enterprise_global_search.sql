-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- they carry Firestore-era
-- identifiers, not generated UUIDs. Declaring a UUID foreign key against them
-- fails at migration time with 42804, "Key columns are of incompatible types".
-- leads.id is TEXT for the same reason.

-- ============================================================================
-- CALLMIND CRM — ENTERPRISE GLOBAL SEARCH DATABASE SCHEMA & RPC
-- Migration: 20260801010000_enterprise_global_search.sql
-- ============================================================================

-- 1. ENABLE TRIGRAM EXTENSION FOR FAST FUZZY SEARCH
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. RECENT SEARCHES TABLE
CREATE TABLE IF NOT EXISTS public.recent_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    query_text VARCHAR(255) NOT NULL,
    category_filter VARCHAR(50) DEFAULT 'all',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SAVED / FAVOURITE SEARCHES TABLE
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    query_text VARCHAR(255) NOT NULL,
    category_filter VARCHAR(50) DEFAULT 'all',
    is_favourite BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_saved_search_user_name UNIQUE (company_id, user_id, name)
);

-- 4. SEARCH ANALYTICS LOGS TABLE
CREATE TABLE IF NOT EXISTS public.search_analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    query_text VARCHAR(255) NOT NULL,
    results_count INT NOT NULL DEFAULT 0,
    execution_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES FOR MULTI-MODULE SEARCH
CREATE INDEX IF NOT EXISTS idx_recent_searches_tenant_user 
ON public.recent_searches(company_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_tenant_user 
ON public.saved_searches(company_id, user_id, is_favourite);

CREATE INDEX IF NOT EXISTS idx_leads_trgm_name ON public.leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_phone ON public.leads USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_email ON public.leads USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_company ON public.leads USING gin (company gin_trgm_ops);

-- 6. ROW-LEVEL SECURITY POLICIES
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recent searches" ON public.recent_searches;
CREATE POLICY "Users manage own recent searches" ON public.recent_searches
    FOR ALL USING (company_id = public.get_my_company_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
    FOR ALL USING (company_id = public.get_my_company_id() AND user_id = auth.uid());

-- 7. MULTI-MODULE GLOBAL SEARCH RPC FUNCTION (WITH RBAC MASKING)
CREATE OR REPLACE FUNCTION public.search_global_crm(
    p_company_id UUID,
    p_user_id UUID,
    p_user_role VARCHAR,
    p_query TEXT,
    p_categories TEXT[] DEFAULT ARRAY['all'],
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    module VARCHAR,
    title VARCHAR,
    subtitle TEXT,
    badge VARCHAR,
    action_url VARCHAR,
    metadata JSONB,
    score FLOAT
) AS $$
DECLARE
    v_clean_q TEXT := TRIM(p_query);
    v_all BOOLEAN := ('all' = ANY(p_categories) OR array_length(p_categories, 1) IS NULL);
BEGIN
    IF v_clean_q IS NULL OR LENGTH(v_clean_q) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH raw_results AS (
        -- LEADS MODULE
        SELECT 
            l.id AS id,
            'leads'::VARCHAR AS module,
            l.name::VARCHAR AS title,
            COALESCE(l.company, l.phone, l.email, 'Lead Record')::TEXT AS subtitle,
            COALESCE(l.status, 'New')::VARCHAR AS badge,
            ('/leads?id=' || l.id::TEXT)::VARCHAR AS action_url,
            jsonb_build_object('phone', l.phone, 'email', l.email, 'company', l.company) AS metadata,
            similarity(l.name, v_clean_q)::FLOAT AS score
        FROM public.leads l
        WHERE l.company_id = p_company_id
          AND (v_all OR 'leads' = ANY(p_categories))
          AND (
              l.name ILIKE '%' || v_clean_q || '%' OR
              l.phone ILIKE '%' || v_clean_q || '%' OR
              l.email ILIKE '%' || v_clean_q || '%' OR
              l.company ILIKE '%' || v_clean_q || '%'
          )

        UNION ALL

        -- CALLS & FOLLOW-UPS MODULE
        SELECT 
            c.id AS id,
            'calls'::VARCHAR AS module,
            ('Call with Lead')::VARCHAR AS title,
            COALESCE(c.notes, 'Logged Phone Conversation')::TEXT AS subtitle,
            COALESCE(c.disposition, 'Completed')::VARCHAR AS badge,
            ('/calls?id=' || c.id::TEXT)::VARCHAR AS action_url,
            jsonb_build_object('duration', c.duration_seconds, 'lead_id', c.lead_id) AS metadata,
            0.5::FLOAT AS score
        FROM public.calls c
        WHERE c.company_id = p_company_id
          AND (v_all OR 'calls' = ANY(p_categories))
          AND (c.notes ILIKE '%' || v_clean_q || '%')

        UNION ALL

        -- INVOICES & FINANCIALS MODULE (STRICT RBAC: BLOCKED FOR TELECALLERS)
        SELECT 
            inv.id AS id,
            'invoices'::VARCHAR AS module,
            ('Invoice #' || inv.invoice_number)::VARCHAR AS title,
            ('Amount: ₹' || inv.amount::TEXT || ' | Status: ' || inv.status)::TEXT AS subtitle,
            inv.status::VARCHAR AS badge,
            ('/billing?invoice=' || inv.invoice_number)::VARCHAR AS action_url,
            jsonb_build_object('amount', inv.amount, 'status', inv.status) AS metadata,
            similarity(inv.invoice_number, v_clean_q)::FLOAT AS score
        FROM public.invoices inv
        WHERE inv.company_id = p_company_id
          AND p_user_role != 'telecaller' -- RBAC PROTECTION
          AND (v_all OR 'invoices' = ANY(p_categories) OR 'financials' = ANY(p_categories))
          AND (
              inv.invoice_number ILIKE '%' || v_clean_q || '%' OR
              inv.status ILIKE '%' || v_clean_q || '%'
          )

        UNION ALL

        -- TASKS & MEETINGS MODULE
        SELECT 
            t.id AS id,
            'tasks'::VARCHAR AS module,
            t.title::VARCHAR AS title,
            COALESCE(t.description, 'Task Item')::TEXT AS subtitle,
            COALESCE(t.status, 'Pending')::VARCHAR AS badge,
            ('/dashboard')::VARCHAR AS action_url,
            jsonb_build_object('due_date', t.due_date) AS metadata,
            similarity(t.title, v_clean_q)::FLOAT AS score
        FROM public.tasks t
        WHERE t.company_id = p_company_id
          AND (v_all OR 'tasks' = ANY(p_categories))
          AND (
              t.title ILIKE '%' || v_clean_q || '%' OR
              t.description ILIKE '%' || v_clean_q || '%'
          )
    )
    SELECT r.id, r.module, r.title, r.subtitle, r.badge, r.action_url, r.metadata, r.score
    FROM raw_results r
    ORDER BY r.score DESC, r.title ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
