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

-- RLS Policies
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant whatsapp conversations select"
ON public.whatsapp_conversations
FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

CREATE POLICY "Tenant whatsapp conversations modify"
ON public.whatsapp_conversations
FOR ALL TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Tenant whatsapp messages select"
ON public.whatsapp_messages
FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

CREATE POLICY "Tenant whatsapp messages modify"
ON public.whatsapp_messages
FOR ALL TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_company ON public.whatsapp_conversations(company_id, status, assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_conv ON public.whatsapp_messages(conversation_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_msg_idempotency ON public.whatsapp_messages(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
