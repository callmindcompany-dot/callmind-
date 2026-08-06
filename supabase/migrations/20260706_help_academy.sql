-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Migration: Help & Video Academy table creations

-- Create Help FAQs table
CREATE TABLE IF NOT EXISTS help_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Support Chat History table
CREATE TABLE IF NOT EXISTS support_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Video Tutorials table
CREATE TABLE IF NOT EXISTS video_tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    duration TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create PDF Guides table
CREATE TABLE IF NOT EXISTS pdf_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Company Support Settings table
CREATE TABLE IF NOT EXISTS company_settings (
    company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    support_email TEXT DEFAULT 'support@callmind.company',
    support_whatsapp TEXT DEFAULT '919999999999',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS policies
ALTER TABLE help_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to help_faqs" ON help_faqs;
CREATE POLICY "Allow all access to help_faqs" ON help_faqs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all access to support_chat_history" ON support_chat_history;
CREATE POLICY "Allow all access to support_chat_history" ON support_chat_history FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all access to video_tutorials" ON video_tutorials;
CREATE POLICY "Allow all access to video_tutorials" ON video_tutorials FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all access to pdf_guides" ON pdf_guides;
CREATE POLICY "Allow all access to pdf_guides" ON pdf_guides FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all access to company_settings" ON company_settings;
CREATE POLICY "Allow all access to company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);
