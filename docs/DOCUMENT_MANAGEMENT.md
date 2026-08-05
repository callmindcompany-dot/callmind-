# CALLMIND CRM — DOCUMENT MANAGEMENT SYSTEM (`DOCUMENT_MANAGEMENT.md`)

**System Architect & Product Spec**  
**Updated:** August 1, 2026  
**Target Architecture:** Cloudflare R2 Storage (Zero-Egress Fees) + PostgreSQL RLS + Express `/v1/documents` API + Web/Mobile Review Workflows

---

## ━━ 1. SYSTEM ARCHITECTURE & STORAGE (CLOUDFLARE R2) ━━

CallMind Document Management handles KYC verification documents (Aadhaar, PAN, Bank Statements, ITR, Business Proof) and lead files with zero-egress Cloudflare R2 storage and strict PostgreSQL tenant isolation.

### Key Object Storage Conventions
- **Single R2 Bucket:** All tenant files live under one bucket `R2_BUCKET`. R2 does not have native row-level security. Isolation is enforced strictly by PostgreSQL database metadata rows and server-side authorization checks on every request.
- **Key Format:** `<company_id>/<lead_id>/<uuid>-<sanitised-filename>`
- **Presigned URLs:**
  - **PUT (Upload):** 5-minute expiry (`expiresIn: 300`). Presigned keys are registered in server memory cache (`presignedKeys`).
  - **GET (Preview/Download):** 15-minute expiry (`expiresIn: 900`). Accessible only by Admins/Founders with tenant match verification.

---

## ━━ 2. DATABASE SCHEMA & SECURITY TRIGGERS ━━

Defined in migration `20260803000100_documents.sql`:

1. **`public.document_requirements`**: Configured expected documents per company (`category`, `title`, `applies_to`, `is_mandatory`).
2. **`public.documents`**: Metadata tracking (`id`, `company_id`, `lead_id`, `category`, `file_name`, `size_bytes`, `mime_type`, `r2_key`, `status`, `version`, `deleted_at`).
   - RLS Policy `tenant_select_documents`: Restricts access to matching `company_id = get_my_company_id()` AND blocks telecallers/agents (`COALESCE(get_my_role(), 'telecaller') NOT IN ('telecaller', 'agent')`).
3. **`public.document_reviews`**: Append-only decision audit table (`action`, `reason`, `performed_by`, `performed_at`). No UPDATE/DELETE policies.
4. **`public.document_access_log`**: DPDP Act compliance audit table for tracking document preview and bundle download events (`user_id`, `access_type`, `ip_address`, `accessed_at`). No UPDATE/DELETE policies.
5. **Storage Enforcement Triggers**:
   - `trg_update_company_storage_used`: Automatically updates `companies.storage_used_bytes` on metadata insert, update, or soft delete.
   - `trg_enforce_storage_limit`: `SECURITY DEFINER` check verifying plan quota (`includedStorageMb` + addon), plan `max_file_size_mb`, and `files_per_lead`. Raises `P0001` with `PLAN_LIMIT` metric details on violation. Soft-deleted files continue counting toward storage bytes until purged.

---

## ━━ 3. SERVER API ROUTES (`/v1/documents`) ━━

- **`POST /v1/documents/presign`**: Validates user role, company status, mime type allowlist, plan `maxFileSizeMb`, storage quota, and `filesPerLead`. Generates key and 5-minute presigned PUT URL.
- **`POST /v1/documents/confirm`**: Verifies presigned key in memory, inserts metadata row into `public.documents`, and logs `DOCUMENT_UPLOADED` audit event.
- **`POST /v1/documents/reviews`**: State transition engine (`pending_review → approved`, `pending_review → rejected`, `approved → pending_review` revocation). Writes `document_reviews` row and dispatches rejection notification to uploader telecaller.
- **`GET /v1/documents/:id/url`**: Admin/Founder only. Verifies tenant match, logs DPDP access event, and returns 15-minute presigned GET URL.
- **`DELETE /v1/documents/:id`**: Soft-deletes row (`deleted_at = NOW()`) and logs audit event.

---

## ━━ 4. UI & WORKFLOW COMPONENTS ━━

1. **Lead Detail Compact Card (`LeadDocumentCard.tsx`)**:
   - Compact line: `📁 Documents 4/5 collected · 2 approved [+ Upload]`.
   - Clicking opens drawer listing requirement checklist joined with document status.
   - **Telecaller Duality**: Status-only strip (`"Sent · under review"`, `"Approved"`, `"Rejected — <reason>"`). No thumbnail, no viewer, no download.
   - **PDF Download Bundle**: Admin-only feature generating single PDF containing lead summary on Page 1 and approved document pages on Page 2+ via `jspdf`. Sanitizes filename as `<Lead Name> - <YYYY-MM-DD>.pdf`.

2. **Admin Review Queue (`DocumentReviewQueue.tsx`)**:
   - Dedicated page at `/dashboard/documents`.
   - Live badge `🟡 X pending review`.
   - Filter bar: Status, Category, Telecaller, Date, and Search input.
   - **Bulk Approve** for handling high daily volume (~90 documents/day per admin).
   - Mandatory canned rejection reasons dropdown (`"Unclear photo"`, `"Expired document"`, `"Need 6 months bank statement"`, `"Wrong document uploaded"`, etc.) plus custom free-text input.

3. **Document Viewer Modal (`DocumentViewerModal.tsx`)**:
   - Image transforms: Zoom in/out, pan, and 90°/180°/270° **Rotation** for sideways scanned documents.
   - PDF preview via blob frame.
   - Keyboard shortcuts: `A` (Approve), `R` (Reject), `→` (Next).
   - Traceable watermark overlay with viewing user's email and timestamp.
   - Version history badge (`v2 (current) · v1 rejected`).

4. **Global Search Integration (`search.service.ts`)**:
   - Indexed searchable fields: `file_name`, `category`, `status`, `uploaded_by`.

5. **CSP Security (`server.ts`)**:
   - `frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "blob:"]`
   - `objectSrc: ["'self'", "blob:"]`
   - `connectSrc` & `imgSrc`: Extended with Cloudflare R2 endpoints `https://*.r2.cloudflarestorage.com`.
