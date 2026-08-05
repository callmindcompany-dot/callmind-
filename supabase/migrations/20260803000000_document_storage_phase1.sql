-- Phase 1: Document Storage Schema & Measurement Migration
-- Created: 2026-08-03
-- Creates public.documents, storage_used_bytes, RLS policies, and storage limit triggers.

BEGIN;

-- 1. Create public.documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id    TEXT NOT NULL,
  lead_id       TEXT,
  uploaded_by   TEXT,
  category      TEXT DEFAULT 'general',
  file_name     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  mime_type     TEXT,
  r2_key        TEXT UNIQUE NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_lead ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_r2_key ON public.documents(r2_key);

-- 2. Add storage_used_bytes and storage_addon_gb to public.companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_addon_gb   INTEGER NOT NULL DEFAULT 0;

-- 3. RLS Policies for public.documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_documents_select" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_insert" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_update" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_delete" ON public.documents;

CREATE POLICY "tenant_documents_select" ON public.documents FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_documents_insert" ON public.documents FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_documents_update" ON public.documents FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_documents_delete" ON public.documents FOR DELETE USING (company_id = public.get_my_company_id());

-- 4. Trigger to maintain companies.storage_used_bytes
-- Note: deleted_at files STILL count toward storage_used_bytes (recycle bin)
CREATE OR REPLACE FUNCTION public.update_company_storage_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.companies
       SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + NEW.size_bytes,
           updated_at = NOW()
     WHERE id = NEW.company_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.companies
       SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - OLD.size_bytes),
           updated_at = NOW()
     WHERE id = OLD.company_id;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.company_id = NEW.company_id THEN
      UPDATE public.companies
         SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) + (NEW.size_bytes - OLD.size_bytes)),
             updated_at = NOW()
       WHERE id = NEW.company_id;
    ELSE
      UPDATE public.companies
         SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - OLD.size_bytes),
             updated_at = NOW()
       WHERE id = OLD.company_id;

      UPDATE public.companies
         SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + NEW.size_bytes,
             updated_at = NOW()
       WHERE id = NEW.company_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_company_storage_used ON public.documents;
CREATE TRIGGER trg_update_company_storage_used
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_company_storage_used();

-- 5. Quota Trigger for Document Storage
CREATE OR REPLACE FUNCTION public.enforce_storage_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits          public.plan_limits;
  v_company         public.companies%ROWTYPE;
  v_allowed_mb      BIGINT;
  v_allowed_bytes   BIGINT;
  v_current_used    BIGINT;
  v_projected_used  BIGINT;
  v_gb_per_seat     INTEGER;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_company
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_company.plan_status IN ('expired', 'cancelled') THEN
    PERFORM public.raise_plan_limit(
      'expired', 0, 0,
      'Your free trial has ended. Upgrade to continue adding data.');
  END IF;

  v_limits := public.get_company_limits(NEW.company_id);
  IF v_limits.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_limits.id = 'trial' THEN
    v_allowed_mb := 500;
  ELSE
    v_gb_per_seat := CASE v_limits.id
                       WHEN 'starter' THEN 3
                       WHEN 'growth'  THEN 5
                       WHEN 'pro'     THEN 8
                       ELSE 1
                     END;
    v_allowed_mb := (v_gb_per_seat * 1024 * GREATEST(1, COALESCE(v_company.seat_limit, 1)))
                    + (COALESCE(v_company.storage_addon_gb, 0) * 1024);
  END IF;

  v_allowed_bytes  := v_allowed_mb * 1024 * 1024;
  v_current_used   := COALESCE(v_company.storage_used_bytes, 0);
  v_projected_used := v_current_used + NEW.size_bytes;

  IF v_projected_used > v_allowed_bytes THEN
    PERFORM public.raise_plan_limit(
      'storage', v_current_used, v_allowed_bytes,
      format('Storage limit reached (%s MB of %s MB used). Upgrade your plan or purchase extra storage to upload files.',
             v_current_used / (1024 * 1024), v_allowed_mb));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_storage_limit ON public.documents;
CREATE TRIGGER trg_enforce_storage_limit
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_limit();

COMMIT;
