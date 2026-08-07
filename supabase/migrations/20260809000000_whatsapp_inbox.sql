-- Migration: 20260809000000_whatsapp_inbox.sql
-- Goal: Multi-agent WhatsApp Shared Inbox with tenant isolation & RLS policies

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  lead_id TEXT,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  assigned_agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, pending, closed
  unread_count INT NOT NULL DEFAULT 0,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_company_customer_phone UNIQUE (company_id, customer_phone)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  sender_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- whatsapp_messages already existed, created by 20260718_founders_lab.sql with
-- a different and much smaller shape: id, company_id, lead_id, sender,
-- message_text, direction, created_at. CREATE TABLE IF NOT EXISTS above is
-- therefore a no-op and none of the columns in it were applied -- which is why
-- the index on conversation_id failed with 42703. Same trap as
-- companies.active_members_count.
--
-- The table holds no rows, so widening it is safe. conversation_id is added
-- nullable rather than NOT NULL: the inbox writes it, but the older insert path
-- in the founders lab does not, and failing that path is not worth it.
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS conversation_id UUID
  REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sender_phone     TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS template_name    TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS idempotency_key  TEXT;

-- RLS Policies
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant whatsapp conversations select" ON public.whatsapp_conversations;
CREATE POLICY "Tenant whatsapp conversations select"
ON public.whatsapp_conversations
FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant whatsapp conversations modify" ON public.whatsapp_conversations;
CREATE POLICY "Tenant whatsapp conversations modify"
ON public.whatsapp_conversations
FOR ALL TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant whatsapp messages select" ON public.whatsapp_messages;
CREATE POLICY "Tenant whatsapp messages select"
ON public.whatsapp_messages
FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant whatsapp messages modify" ON public.whatsapp_messages;
CREATE POLICY "Tenant whatsapp messages modify"
ON public.whatsapp_messages
FOR ALL TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_company ON public.whatsapp_conversations(company_id, status, assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_conv ON public.whatsapp_messages(conversation_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_msg_idempotency ON public.whatsapp_messages(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
