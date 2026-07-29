-- Create public.support_tickets migration

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    steps TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL,
    client_health_score INTEGER NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_designation VARCHAR(255),
    user_phone VARCHAR(50),
    company_name VARCHAR(255),
    company_id TEXT NOT NULL,
    os_info VARCHAR(100),
    browser_info VARCHAR(100),
    network_latency VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can create support tickets" 
    ON public.support_tickets FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view their company support tickets" 
    ON public.support_tickets FOR SELECT 
    USING (true);
