-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Migration: Legal Pages and User Acceptances tables

-- Create Legal Pages table
CREATE TABLE IF NOT EXISTS legal_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL CHECK (slug IN ('privacy', 'terms', 'refund')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    language TEXT NOT NULL DEFAULT 'English' CHECK (language IN ('English', 'Hindi', 'Marathi')),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (slug, language)
);

-- Create User Acceptances table
CREATE TABLE IF NOT EXISTS user_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    page_slug TEXT NOT NULL,
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to legal_pages" ON legal_pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_acceptances" ON user_acceptances FOR ALL USING (true) WITH CHECK (true);

-- Seed initial English versions of the 3 legal documents
INSERT INTO legal_pages (slug, title, content, version, language)
VALUES 
('privacy', 'Privacy Policy & Data Security', '## Zero Call Recording Guidelines
We process conversational context purely in RAM during active sessions. Unless explicitly toggled by the admin for quality assurance, audio streams are dropped post-analysis. 

## 14-Layer Security (SQLCipher)
Your leads, metadata, and systemic analytics are encrypted at rest using AES-256 standards with SQLCipher 14-layer architectural boundaries. No cross-tenant bleeding.

## Data Subject Rights
In compliance with global privacy directives, you reserve the absolute right to request a complete export of your pipeline metadata or request a total pipeline purge at any time.', '2.3', 'English')
ON CONFLICT (slug, language) DO NOTHING;

INSERT INTO legal_pages (slug, title, content, version, language)
VALUES 
('terms', 'System Rule Book (Terms of Service)', '## SIM-Based Responsibilities
You acknowledge that our platform connects to your physical Android device to route calls. You are explicitly responsible for maintaining the health and validity of the physical SIM card processing these algorithms.

## No Spam & DNC Compliance
You are strictly responsible for complying with local telecommunication regulations (TRAI, TCPA) regarding automated calling. Utilizing high-volume outreach capacity to execute phishing, scams, or sustained harassment is a zero-tolerance restricted action.

## AI Usage & Rate Limits
We reserve the absolute right to terminate or pause your API keys and instance access instantly if heuristic monitors detect restricted actions or excessive localized abuse patterns hitting our AI infrastructure.', '1.5', 'English')
ON CONFLICT (slug, language) DO NOTHING;

INSERT INTO legal_pages (slug, title, content, version, language)
VALUES 
('refund', 'Refund & Cancellation Policy', '## Billing & Refund Rules
We do not offer pro-rated refunds for partial months deployed. Once a billing cycle triggers, the structural access is locked in for that frame.

## Cancel Anytime
You possess the capacity to downgrade or cancel your subscription pipeline at any time via the Billing console without any hidden exit fees.

## Add-on Credits
Due to the immediate infrastructural costs of synthesizing AI parameters, consumed computational minutes or add-on credits are inherently non-refundable.', '1.0', 'English')
ON CONFLICT (slug, language) DO NOTHING;
