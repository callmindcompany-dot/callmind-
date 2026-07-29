-- Create feature_roadmap table
CREATE TABLE IF NOT EXISTS public.feature_roadmap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    phase INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    slides JSONB,
    votes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed initial data for feature_roadmap
INSERT INTO public.feature_roadmap (title, description, category, phase, status, progress, votes, slides)
VALUES 
    (
        'WhatsApp API integration', 
        'Official Meta API integration for bulk messaging and auto-responses.', 
        'Leads', 
        2, 
        'Completed', 
        100, 
        42, 
        '[{"title": "Official Meta API", "content": "Connect your own Meta account. Send messages from your official number at zero cost to us.", "image": "https://picsum.photos/seed/wa1/800/400"}, {"title": "Bulk Campaigns", "content": "Send 1000+ messages at once to your leads with approved templates.", "image": "https://picsum.photos/seed/wa2/800/400"}]'::jsonb
    ),
    (
        'VoIP Calling', 
        'Cloud calling via Exotel with recording and IVR setup.', 
        'Calls', 
        2, 
        'In Progress', 
        80, 
        28, 
        '[{"title": "300% Profit Margin", "content": "Exotel rate: ₹0.50/min. We charge: ₹2.00/min. Massive revenue potential per agent.", "image": "https://picsum.photos/seed/voip1/800/400"}, {"title": "PC Calling & Recording", "content": "Make calls directly from the browser. All calls are legally recorded and stored in the cloud.", "image": "https://picsum.photos/seed/voip2/800/400"}]'::jsonb
    ),
    (
        'Campaign Outreach Sequences', 
        'Automated follow-up flows via WhatsApp & Email.', 
        'Leads', 
        2, 
        'Completed', 
        100, 
        56, 
        '[{"title": "Drip Campaigns", "content": "Day 1: WhatsApp -> Day 3: Call Task -> Day 5: Email. Fully automated follow-up chain.", "image": "https://picsum.photos/seed/seq1/800/400"}]'::jsonb
    ),
    (
        'AI Voice Agents', 
        'Autonomous AI agents that can handle initial lead qualification calls.', 
        'Calls', 
        3, 
        'In Progress', 
        35, 
        112, 
        '[{"title": "Human-like Voice", "content": "Advanced TTS and STT models for natural, low-latency conversations.", "image": "https://picsum.photos/seed/aivoice1/800/400"}, {"title": "24/7 Qualification", "content": "Never miss a lead. AI agents qualify leads instantly, even at 3 AM.", "image": "https://picsum.photos/seed/aivoice2/800/400"}]'::jsonb
    ),
    (
        'Advanced Analytics Dashboard', 
        'Custom BI dashboards and predictive revenue forecasting.', 
        'Reports', 
        3, 
        'Planned', 
        0, 
        68, 
        '[{"title": "Revenue Forecasting", "content": "AI-driven predictions of monthly revenue based on current pipeline.", "image": "https://picsum.photos/seed/stats1/800/400"}]'::jsonb
    );

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed initial data for feature_flags
INSERT INTO public.feature_flags (key, value)
VALUES 
    ('communication', false),
    ('sequences', false),
    ('scheduler', false),
    ('integrations', false)
ON CONFLICT (key) DO NOTHING;

-- Create cofounders table
CREATE TABLE IF NOT EXISTS public.cofounders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Primary Founder', 'Co-Founder', 'Operator')),
    permissions JSONB NOT NULL DEFAULT '{"communication": false, "sequences": false, "scheduler": false, "integrations": false}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Revoked')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create RLS Policies
ALTER TABLE public.feature_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on feature_roadmap" ON public.feature_roadmap FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users on feature_flags" ON public.feature_flags FOR ALL USING (true);
CREATE POLICY "Enable all access for company users on cofounders" ON public.cofounders FOR ALL USING (true);
