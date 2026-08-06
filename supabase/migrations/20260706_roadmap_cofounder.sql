-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Migration: Roadmap and Co-founder permissions tables

-- Create Feature Roadmap table
CREATE TABLE IF NOT EXISTS feature_roadmap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    phase INTEGER NOT NULL CHECK (phase IN (2, 3)),
    status TEXT NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    slides JSONB DEFAULT '[]'::jsonb,
    votes INTEGER DEFAULT 0 CHECK (votes >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Feature Flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Cofounders table
CREATE TABLE IF NOT EXISTS cofounders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Primary Founder', 'Co-Founder', 'Operator')),
    permissions JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Revoked')),
    invited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cofounders ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow all access to feature_roadmap" ON feature_roadmap FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to feature_flags" ON feature_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cofounders" ON cofounders FOR ALL USING (true) WITH CHECK (true);
