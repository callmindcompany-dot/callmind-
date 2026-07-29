-- Migration: Announcements and Reads tables

-- Create Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Update', 'Maintenance', 'Team', 'Product', 'Event')),
    target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'admin', 'agent')),
    is_pinned BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    author_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Announcement Reads table
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to announcement_reads" ON announcement_reads FOR ALL USING (true) WITH CHECK (true);
