# CallMind — Product Brain & System Context

> **Single Source of Truth** for CallMind AI CRM Monorepo: Web Application (Admin CRM), Mobile Application (Telecaller Tool), Express Server, and Supabase Backend.

---

## ━━ 1. SYSTEM ARCHITECTURE & CORE STACK ━━

* **Frontend**: React 19, TypeScript, Vite, TailwindCSS (Light-themed glassmorphism).
* **Backend API**: Node.js, Express server (`server.ts`, `src/routes/`).
* **Database & Auth**: PostgreSQL on Supabase (`supabase/migrations/`), Supabase Auth, Row-Level Security (RLS).
* **Object Storage**: Cloudflare R2 (`@aws-sdk/client-s3`) configured in `src/routes/documents.ts` with zero-egress bandwidth fees.
* **Pricing & Quotas**: Source of truth defined in `src/config/pricing.ts` (synced via `scripts/gen-plan-limits.mjs` and enforced by database triggers in `supabase/migrations/20260802000200_plan_enforcement.sql`).

---

## ━━ 2. CORE WORKFLOWS & CURRENT BEHAVIOR ━━

### Lead Ingestion & Assignment
* **Inbound Webhooks**: Incoming leads (Meta Ads, IndiaMART, Webhooks) are ingested via Express routes in `src/routes/leads.ts`. Leads are initialized with `assignedTo: "unassigned"` / `assigned_to: NULL`.
* **Manual Force Assignment**: Admins can force-assign leads to specific active agents via `POST /routing/force/:companyId/:leadId`.
* **Automated Round-Robin**: Intended feature; background round-robin rotation engine is currently pending native trigger integration.

### Document & Media Storage
* **Presigned Uploads**: Client requests `POST /v1/documents/presign`, server validates plan limits from `src/config/pricing.ts`, and issues a 5-minute Presigned PUT URL directly to Cloudflare R2.
* **Metadata Persistence**: `POST /v1/documents/confirm` verifies presigned keys and inserts metadata into `public.documents`.

### Authentication & Tenant Isolation
* **Claims Synchronization**: `POST /api/auth/sync-app-metadata` verifies token, fetches `company_id` and `role` server-side from `public.users`, and updates Supabase Auth `app_metadata` (ignoring any client-supplied body values to prevent privilege escalation).
* **RLS Functions**: Database functions `get_my_company_id()` and `get_my_role()` read `auth.jwt() -> app_metadata` to enforce tenant boundary isolation.

---

## ━━ 3. VERIFIED SPECIFICATIONS INDEX ━━

### Built Features
* [DOCUMENT_MANAGEMENT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DOCUMENT_MANAGEMENT.md) — Cloudflare R2 storage, presigned URLs, and document verification queue (`src/routes/documents.ts`, `src/components/documents/`).
* [BRANCH_REGION_HIERARCHY.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/BRANCH_REGION_HIERARCHY.md) — Multi-branch, regional, and department organizational hierarchy (`src/routes/hierarchy.ts`, `src/components/hierarchy/`).
* [GLOBAL_SEARCH.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/GLOBAL_SEARCH.md) — Enterprise cross-module search with PostgreSQL trigram indexing (`src/routes/search.ts`, `src/components/search/`).
* [NOTIFICATION_CENTER.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/NOTIFICATION_CENTER.md) — Real-time notification center and preferences (`src/routes/notifications.ts`, `src/components/notifications/`).
* [AUDIT_LOG_SYSTEM.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/AUDIT_LOG_SYSTEM.md) — Security and administrative audit trail (`src/services/audit.service.ts`).
* [PAYMENT_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/PAYMENT_MODULE.md) — Razorpay order pricing and webhook handling (`src/routes/payments.ts`, `src/config/pricing.ts`).
* [AI_ENGINE_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/AI_ENGINE_V2.md) — Gemini AI router and multi-key pool (`src/routes/ai.ts`, `src/lib/aiRouter.ts`).

### Partially Built Features
* [WORKFLOW_AUTOMATION_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/WORKFLOW_AUTOMATION_V2.md) — Automation rules schema and hooks (`src/hooks/useAutomationRules.ts`, `supabase/migrations/automation_rules_migration.sql`).
* [INVOICE_BILLING_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/INVOICE_BILLING_MODULE.md) — PDF invoice generation (`src/routes/payments.ts`, `jspdf`).

### Not Built / Intended Specifications
* [DUPLICATE_DETECTION_ENGINE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DUPLICATE_DETECTION_ENGINE.md) — Phone/email deduplication engine (Intended).
* [OFFLINE_SYNC_ENGINE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/OFFLINE_SYNC_ENGINE.md) — Mobile offline queue auto-sync worker (Intended).
* [ACTIVITY_FEED.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/ACTIVITY_FEED.md) — Unified activity stream renderer (Intended).
* [QUOTATION_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/QUOTATION_MODULE.md) — B2B proposal and quotation generator (Intended).
* [RENEWAL_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/RENEWAL_MODULE.md) — Automated renewal drip engine (Intended).
* [SUPPORT_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/SUPPORT_MODULE.md) — Support ticketing and CSAT desk (Intended).
