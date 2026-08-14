-- Base tables creation migration: leads, users, team_settings, audit_logs
-- Ensures a fresh database setup has all required core tables.

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'New',
  assigned_to TEXT,
  source TEXT,
  priority TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  notes TEXT,
  comment TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_unseen BOOLEAN DEFAULT TRUE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  custom_data JSONB DEFAULT '{}'::jsonb,
  estimated_budget TEXT,
  facebook_ad_name TEXT,
  brand TEXT,
  neural_score NUMERIC,
  is_duplicate BOOLEAN DEFAULT FALSE,
  description TEXT,
  hold_outbound_trigger BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  display_name TEXT,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT DEFAULT 'active',
  designation TEXT,
  onboarding_status TEXT,
  plan_status TEXT,
  seat_active BOOLEAN DEFAULT TRUE,
  joined_via TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_settings (
  company_id TEXT PRIMARY KEY,
  team_name TEXT,
  field_labels JSONB DEFAULT '{}'::jsonb,
  hide_phone_numbers BOOLEAN DEFAULT FALSE,
  rotting_threshold INT DEFAULT 7,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  require_approval BOOLEAN DEFAULT FALSE,
  allow_qr BOOLEAN DEFAULT TRUE,
  allow_code BOOLEAN DEFAULT TRUE,
  device_limit INT DEFAULT 3,
  gemini_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  actor_id TEXT,
  actor_email TEXT,
  action TEXT,
  category TEXT,
  target TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on core base tables if not already enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
