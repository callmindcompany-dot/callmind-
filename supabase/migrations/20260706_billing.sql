-- Create billing migration

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'trial',
    status VARCHAR(50) NOT NULL DEFAULT 'trial',
    seats_limit INTEGER NOT NULL DEFAULT 3,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    company_id TEXT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    seats INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    addons TEXT[] NOT NULL DEFAULT '{}',
    total_amount NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their company subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (true);

CREATE POLICY "Users can view and insert their company billing intents" 
    ON public.billing_intents FOR ALL 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view their company invoices" 
    ON public.invoices FOR SELECT 
    USING (true);
