-- Migration: Sequences and AI Config table creations

-- Create Sequences Table
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enrolled INTEGER DEFAULT 0,
    completion INTEGER DEFAULT 0,
    success_rate NUMERIC DEFAULT 0.0,
    status TEXT DEFAULT 'paused' CHECK (status IN ('active', 'paused')),
    nodes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI Configuration Table
CREATE TABLE IF NOT EXISTS ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    auto_call BOOLEAN DEFAULT TRUE,
    record_calls BOOLEAN DEFAULT TRUE,
    sentiment_analysis BOOLEAN DEFAULT TRUE,
    voice_type TEXT DEFAULT 'Professional Male',
    system_prompt TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI FAQ Table
CREATE TABLE IF NOT EXISTS ai_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS policies (simple permissive select/write to match dev environment for now)
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sequences" ON sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ai_config" ON ai_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ai_faqs" ON ai_faqs FOR ALL USING (true) WITH CHECK (true);
