-- Create system_errors table
CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  user_email TEXT,
  user_agent TEXT,
  url TEXT,
  type TEXT
);

-- Enable RLS for system_errors
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated / anonymous users for error logging
CREATE POLICY "Allow error logs insert" ON public.system_errors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow error logs select for founders" ON public.system_errors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid()::text AND public.users.role = 'founder'
  )
);

-- Create ai_usage table for tracking daily feature usage limits
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  wa_drafts INTEGER DEFAULT 0,
  voice_to_crm INTEGER DEFAULT 0,
  report_queries INTEGER DEFAULT 0,
  column_mappings INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ai_usage_company_date_unique UNIQUE (company_id, date)
);

-- Enable RLS for ai_usage
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow select and upsert for active tenant company_id context
CREATE POLICY "Tenant select ai_usage" ON public.ai_usage FOR SELECT USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text)
);
CREATE POLICY "Tenant insert ai_usage" ON public.ai_usage FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text)
);
CREATE POLICY "Tenant update ai_usage" ON public.ai_usage FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text)
) WITH CHECK (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text)
);
