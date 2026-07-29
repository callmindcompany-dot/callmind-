-- Migration: Founder's Testing Lab Tables
CREATE TABLE IF NOT EXISTS public.founder_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT UNIQUE NOT NULL CHECK (service IN ('voip', 'whatsapp', 'email')),
    status TEXT NOT NULL DEFAULT 'Disconnected',
    last_tested_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.founder_test_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL CHECK (service IN ('voip', 'whatsapp', 'email')),
    status TEXT NOT NULL CHECK (status IN ('Success', 'Failure')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('video', 'pdf')),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    duration TEXT,
    youtube_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    lead_id TEXT,
    sender TEXT NOT NULL,
    message_text TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.founder_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow all actions
CREATE POLICY "Allow all on founder_tests" ON public.founder_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on founder_test_logs" ON public.founder_test_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on resources" ON public.resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

-- Seed initial test statuses
INSERT INTO public.founder_tests (service, status, config) VALUES
('voip', 'Disconnected', '{"appId": "", "apiKey": "", "subdomain": ""}'::jsonb),
('whatsapp', 'Disconnected', '{"businessId": "", "phoneId": "", "token": ""}'::jsonb),
('email', 'Disconnected', '{"host": "", "port": 587, "username": "", "password": ""}'::jsonb)
ON CONFLICT (service) DO NOTHING;
