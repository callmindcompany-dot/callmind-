-- NOTE: company_id and user_id are TEXT, not UUID.
--
-- public.companies.id and public.users.id are TEXT -- Firestore-era string
-- identifiers, not generated UUIDs. A UUID foreign key against them fails with
-- 42804, "Key columns are of incompatible types", which is why this migration
-- has never successfully applied.

-- Create report_templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Policies for report_templates (casting auth.uid()::text to text)
DROP POLICY IF EXISTS "Users can view templates in their company" ON public.report_templates;
CREATE POLICY "Users can view templates in their company"
    ON public.report_templates FOR SELECT
    USING (company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert templates for their company" ON public.report_templates;
CREATE POLICY "Users can insert templates for their company"
    ON public.report_templates FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update templates in their company" ON public.report_templates;
CREATE POLICY "Users can update templates in their company"
    ON public.report_templates FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete templates in their company" ON public.report_templates;
CREATE POLICY "Users can delete templates in their company"
    ON public.report_templates FOR DELETE
    USING (company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid()::text));

-- Create Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_templates_company_id ON public.report_templates(company_id);
