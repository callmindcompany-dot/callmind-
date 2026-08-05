-- Migration: 20260803000100_documents.sql
-- Documents Module Schema, Append-Only Audits & Quota Limit Enforcement

BEGIN;

-- 1. Table: document_requirements
CREATE TABLE IF NOT EXISTS public.document_requirements (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id   TEXT NOT NULL,
  applies_to   TEXT,              -- lead type or pipeline stage; NULL = all leads
  category     TEXT NOT NULL,       -- 'aadhaar', 'pan', 'bank_statement'
  label        TEXT NOT NULL,
  is_required  BOOLEAN NOT NULL DEFAULT true,
  expires      BOOLEAN NOT NULL DEFAULT false,
  max_files    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_document_requirements_company_cat UNIQUE (company_id, applies_to, category)
);

CREATE INDEX IF NOT EXISTS idx_doc_req_company ON public.document_requirements(company_id);

-- 2. Table: documents
CREATE TABLE IF NOT EXISTS public.documents (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id       TEXT NOT NULL,
  lead_id          TEXT,              -- TEXT, matches leads.id
  requirement_id   TEXT,              -- nullable: ad-hoc uploads outside the checklist
  category         TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  size_bytes       BIGINT NOT NULL,
  mime_type        TEXT NOT NULL,
  r2_key           TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending_review',
  version          INTEGER NOT NULL DEFAULT 1,
  uploaded_by      TEXT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at       TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT chk_documents_status CHECK (status IN ('pending_review','approved','rejected','expired','superseded'))
);

-- Ensure all columns exist if table was already created in earlier draft
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS lead_id          TEXT,
  ADD COLUMN IF NOT EXISTS requirement_id   TEXT,
  ADD COLUMN IF NOT EXISTS category         TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS reviewed_by      TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;

-- Drop old check constraint if exists, then re-add
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS chk_documents_status;
ALTER TABLE public.documents ADD CONSTRAINT chk_documents_status CHECK (status IN ('pending_review','approved','rejected','expired','superseded'));

CREATE INDEX IF NOT EXISTS idx_documents_company_status ON public.documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_company_lead ON public.documents(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_uploaded ON public.documents(company_id, uploaded_at DESC);

-- 3. Table: document_reviews (Append-only decision history)
CREATE TABLE IF NOT EXISTS public.document_reviews (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id  TEXT NOT NULL,
  document_id TEXT NOT NULL,
  action      TEXT NOT NULL, -- 'approved', 'rejected', 'revoked'
  actor       TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_company_doc ON public.document_reviews(company_id, document_id);

-- 4. Table: document_access_log (Audit tracking for access/download under DPDP Act)
CREATE TABLE IF NOT EXISTS public.document_access_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id  TEXT NOT NULL,
  document_id TEXT NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL, -- 'view', 'download'
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_company_doc ON public.document_access_log(company_id, document_id);

-- 5. Companies Storage Columns
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_addon_gb   INTEGER NOT NULL DEFAULT 0;

-- 6. RLS Setup

-- 6a. document_requirements RLS
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_document_requirements_select" ON public.document_requirements;
DROP POLICY IF EXISTS "tenant_document_requirements_insert" ON public.document_requirements;
DROP POLICY IF EXISTS "tenant_document_requirements_update" ON public.document_requirements;
DROP POLICY IF EXISTS "tenant_document_requirements_delete" ON public.document_requirements;

CREATE POLICY "tenant_document_requirements_select" ON public.document_requirements FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_document_requirements_insert" ON public.document_requirements FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_document_requirements_update" ON public.document_requirements FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_document_requirements_delete" ON public.document_requirements FOR DELETE USING (company_id = public.get_my_company_id());

-- 6b. documents RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_documents_select" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_insert" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_update" ON public.documents;
DROP POLICY IF EXISTS "tenant_documents_delete" ON public.documents;

-- Telecallers must NOT read documents rows at all. Only admins/managers may see documents.
CREATE POLICY "tenant_documents_select" ON public.documents FOR SELECT 
  USING (
    company_id = public.get_my_company_id() 
    AND COALESCE(public.get_my_role(), 'telecaller') NOT IN ('telecaller', 'agent')
  );

CREATE POLICY "tenant_documents_insert" ON public.documents FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_documents_update" ON public.documents FOR UPDATE USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "tenant_documents_delete" ON public.documents FOR DELETE USING (company_id = public.get_my_company_id());

-- 6c. document_reviews RLS (Append-only: SELECT and INSERT only, NO UPDATE or DELETE)
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_document_reviews_select" ON public.document_reviews;
DROP POLICY IF EXISTS "tenant_document_reviews_insert" ON public.document_reviews;
DROP POLICY IF EXISTS "tenant_document_reviews_update" ON public.document_reviews;
DROP POLICY IF EXISTS "tenant_document_reviews_delete" ON public.document_reviews;

CREATE POLICY "tenant_document_reviews_select" ON public.document_reviews FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_document_reviews_insert" ON public.document_reviews FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

-- 6d. document_access_log RLS (Append-only: SELECT and INSERT only, NO UPDATE or DELETE)
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_document_access_log_select" ON public.document_access_log;
DROP POLICY IF EXISTS "tenant_document_access_log_insert" ON public.document_access_log;
DROP POLICY IF EXISTS "tenant_document_access_log_update" ON public.document_access_log;
DROP POLICY IF EXISTS "tenant_document_access_log_delete" ON public.document_access_log;

CREATE POLICY "tenant_document_access_log_select" ON public.document_access_log FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "tenant_document_access_log_insert" ON public.document_access_log FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

-- 7. Trigger to maintain companies.storage_used_bytes
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

-- 8. Quota & Limits Enforcement Trigger
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
  v_lead_files      INTEGER;
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

  -- 1. Storage Quota (storage_flat_mb when non-zero, otherwise storage_gb_per_seat * seat_limit + addon)
  IF COALESCE(v_limits.storage_flat_mb, 0) > 0 THEN
    v_allowed_mb := v_limits.storage_flat_mb;
  ELSE
    v_allowed_mb := (COALESCE(v_limits.storage_gb_per_seat, 1) * 1024 * GREATEST(1, COALESCE(v_company.seat_limit, 1)))
                    + (COALESCE(v_company.storage_addon_gb, 0) * 1024);
  END IF;

  v_allowed_bytes  := v_allowed_mb * 1024 * 1024;
  v_current_used   := COALESCE(v_company.storage_used_bytes, 0);
  v_projected_used := v_current_used + NEW.size_bytes;

  IF v_projected_used > v_allowed_bytes THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format('Storage full (%s of %s used). Upgrade or free up space.',
                       (v_current_used / (1024 * 1024)), v_allowed_mb),
      DETAIL  = json_build_object(
        'code',   'PLAN_LIMIT',
        'metric', 'storage',
        'used',   v_current_used,
        'limit',  v_allowed_bytes
      )::text;
  END IF;

  -- 2. Max File Size Enforcement
  IF v_limits.max_file_size_mb IS NOT NULL AND v_limits.max_file_size_mb > 0 THEN
    IF NEW.size_bytes > (v_limits.max_file_size_mb * 1024 * 1024) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = format('File size exceeds maximum allowed (%s MB).', v_limits.max_file_size_mb),
        DETAIL  = json_build_object(
          'code',   'PLAN_LIMIT',
          'metric', 'maxFileSizeMb',
          'used',   NEW.size_bytes,
          'limit',  (v_limits.max_file_size_mb * 1024 * 1024)
        )::text;
    END IF;
  END IF;

  -- 3. Files Per Lead Enforcement
  IF NEW.lead_id IS NOT NULL AND v_limits.files_per_lead IS NOT NULL AND v_limits.files_per_lead > 0 THEN
    SELECT COUNT(*) INTO v_lead_files
    FROM public.documents
    WHERE company_id = NEW.company_id AND lead_id = NEW.lead_id AND deleted_at IS NULL;

    IF v_lead_files >= v_limits.files_per_lead THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = format('Lead document limit reached (%s files allowed per lead).', v_limits.files_per_lead),
        DETAIL  = json_build_object(
          'code',   'PLAN_LIMIT',
          'metric', 'filesPerLead',
          'used',   v_lead_files,
          'limit',  v_limits.files_per_lead
        )::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_storage_limit ON public.documents;
CREATE TRIGGER trg_enforce_storage_limit
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_limit();

COMMIT;
