# 🧠 CallMind — Complete Product Brain & Master Documentation Index

> **OFFICIAL CLEANED & CONSOLIDATED DOCUMENTATION INDEX (48 MASTER FILES)**  
> **Single Source of Truth** for CallMind AI CRM Monorepo: Web App (Admin CRM), Mobile App (Telecaller Tool), Express Server, and Supabase Backend.

---

## 📂 Master Documentation Suite Index (`docs/`)

All 48 streamlined documentation files are organized cleanly inside the single canonical `docs/` folder:

### 🔴 1. Core Architecture (Updated V2 Set)
- [ROLE_PERMISSION_MATRIX_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/ROLE_PERMISSION_MATRIX_V2.md) — 5-tier RBAC, field-level security, and phone masking.
- [CUSTOMER_LIFECYCLE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/CUSTOMER_LIFECYCLE.md) — 10-stage customer lifecycle state transitions and SLAs.
- [WORKFLOW_AUTOMATION_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/WORKFLOW_AUTOMATION_V2.md) — Trigger-Condition-Action automation rules and drips.
- [API_CONTRACT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/API_CONTRACT.md) — REST & Edge Function DTO contracts & Zod schemas.
- [DATABASE_SCHEMA.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DATABASE_SCHEMA.md) — All 19 Supabase PostgreSQL master tables and indexes.
- [SECURITY_HARDENING.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/SECURITY_HARDENING.md) — OWASP Top 10, HMAC, double CSRF, CSP, and RLS security.
- [AI_ENGINE_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/AI_ENGINE_V2.md) — Gemini 1.5 Flash/Pro router, prompt guardrails, and key rotation.
- [TESTING_STRATEGY.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/TESTING_STRATEGY.md) — Vitest, RTL, Supertest, Detox, and k6 load testing standards.
- [DEPLOYMENT_ARCHITECTURE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DEPLOYMENT_ARCHITECTURE.md) — Vercel, Railway, AWS, Supabase, and Google Play CI/CD topology.

### 🟠 2. Enterprise Subsystems & Engines
- [DOCUMENT_MANAGEMENT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DOCUMENT_MANAGEMENT.md) — Supabase Storage buckets, PDF generation, and signed URLs.
- [GLOBAL_SEARCH.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/GLOBAL_SEARCH.md) — Cmd+K floating search modal, PostgreSQL `pg_trgm`, and `tsvector` indexes.
- [NOTIFICATION_CENTER.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/NOTIFICATION_CENTER.md) — Expo Push, Realtime WebSockets, Meta WhatsApp, and Email dispatch.
- [ACTIVITY_FEED.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/ACTIVITY_FEED.md) — Lead interaction timeline, calls, notes, status, and meeting events.
- [AUDIT_LOG_SYSTEM.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/AUDIT_LOG_SYSTEM.md) — Immutable administrative, security, and financial event audit trail.
- [DUPLICATE_DETECTION_ENGINE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DUPLICATE_DETECTION_ENGINE.md) — E.164 phone matching, 7-day cooldown, and merge resolution.
- [OFFLINE_SYNC_ENGINE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/OFFLINE_SYNC_ENGINE.md) — Mobile AsyncStorage queueing (`@callmind_unsynced_calls`) and auto-flush worker.

### 🟡 3. Business Modules
- [QUOTATION_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/QUOTATION_MODULE.md) — Proposal generator, PDF renderer, and discount approval threshold.
- [INVOICE_BILLING_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/INVOICE_BILLING_MODULE.md) — Indian B2B GST tax invoice generator (CGST/SGST vs IGST).
- [PAYMENT_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/PAYMENT_MODULE.md) — Razorpay webhook integration and `billing_intents` replay attack defense.
- [SUPPORT_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/SUPPORT_MODULE.md) — Customer support desk, ticket SLA escalation, and AI self-help KB.
- [RENEWAL_MODULE.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/RENEWAL_MODULE.md) — Subscription expiration countdowns, automated renewal drips, and lockout rules.

### 🏛️ 4. Enterprise Process Governance & UI Matrices
- [BUSINESS_PROCESS_MATRIX.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/BUSINESS_PROCESS_MATRIX.md) — 15-stage end-to-end customer lifecycle BPM specification.
- [ENTERPRISE_VALIDATION_MATRIX.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/ENTERPRISE_VALIDATION_MATRIX.md) — Deterministic validation rules, E.164, GSTIN, HMAC, & RBAC gates.
- [FRONTEND_NAVIGATION_MATRIX.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/FRONTEND_NAVIGATION_MATRIX.md) — Web SPA routing, Mobile screen state transitions, and role guards.
- [PRODUCTION_CHECKLIST_V2.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/PRODUCTION_CHECKLIST_V2.md) — Pre-flight security, secrets, DB, and Go-To-Market launch checklist.

### 🏢 5. Business & Product Workflows
- [Context.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/Context.md) — Product identity, target market, pricing, and key workflows.
- [USER_FLOWS.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/USER_FLOWS.md) — Step-by-step user journeys for Founders, Sub-Admins, and Telecallers.
- [LEAD_WORKFLOW.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/LEAD_WORKFLOW.md) — Complete lead lifecycle (Ingestion, Sanitization, Dedup, Routing, Resolution).
- [ADMIN_WORKFLOW.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/ADMIN_WORKFLOW.md) — Standard operating procedures for Founders and Managers.
- [TELECALLER_WORKFLOW.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/TELECALLER_WORKFLOW.md) — Daily Android mobile agent operation guide.
- [SUBSCRIPTION_RULES.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/SUBSCRIPTION_RULES.md) — Pricing tiers, limits enforcement, and Razorpay GST invoicing.
- [FEATURE_MATRIX.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/FEATURE_MATRIX.md) — Web App vs Mobile App capabilities comparison grid.

### 🔍 6. Architectural & System Audits
- [PROJECT_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/PROJECT_AUDIT.md) — Full repository inventory across 20 technical dimensions.
- [FEATURE_VALIDATION.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/FEATURE_VALIDATION.md) — Validation status of all 29 system features with code evidence.
- [UI_UX_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/UI_UX_AUDIT.md) — UI/UX audit across 9 dimensions (Accessibility, Spacing, Loading/Empty states).
- [MOBILE_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/MOBILE_AUDIT.md) — Android mobile audit (Offline queueing, Battery usage, Permissions, Sync).
- [API_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/API_AUDIT.md) — REST API audit (Timing-safe HMACs, Rate limits, CSRF, Versioning).
- [DATABASE_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/DATABASE_AUDIT.md) — PostgreSQL audit (Views, Indexes, Triggers, RLS, Optimization recommendations).
- [BUSINESS_FLOW_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/BUSINESS_FLOW_AUDIT.md) — Complete 9-entity lifecycle trace and missing business steps.
- [PERFORMANCE_AUDIT.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/PERFORMANCE_AUDIT.md) — System performance audit (Bundle size, CPU, Memory leaks, Caching).

### 🚀 7. Master Consolidated Guides & System Manuals
- [MASTER_PROJECT_AUDITS_AND_ROADMAP.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/MASTER_PROJECT_AUDITS_AND_ROADMAP.md) — Untruncated master consolidated audits & improvement roadmap.
- [MASTER_IMPROVEMENT_PLAN.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/MASTER_IMPROVEMENT_PLAN.md) — Prioritized implementation roadmap (P0 Critical to P3 Future).
- [LAUNCH_CHECKLIST.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/LAUNCH_CHECKLIST.md) — Pre-flight Go-To-Market and technical launch checklist.
- [Architecture.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/Architecture.md) — System architecture diagram and tech stack overview.
- [Project Documentation.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/Project%20Documentation.md) — Local setup, build, environment variables, and deployment guidelines.
- [Master Notes.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/docs/Master%20Notes.md) — Developer log, Glassmorphic UI guidelines, and recent changes.

---

*Documentation Clean-Up Complete: July 31, 2026 • 48 Clean Master Files in `docs/`*  
*CallMind CRM — Voolabs Technologies, Mumbai, India*
