# CALLMIND CRM - MASTER IMPLEMENTATION & IMPROVEMENT ROADMAP

**Author:** Principal Software Architect & Product Auditor  
**Date:** July 31, 2026  
**Target Codebase:** CallMind Monorepo  
**Basis:** Consolidated Findings from `PROJECT_AUDIT.md`, `FEATURE_VALIDATION.md`, `UI_UX_AUDIT.md`, `MOBILE_AUDIT.md`, `API_AUDIT.md`, `DATABASE_AUDIT.md`, `SECURITY_AUDIT_REPORT.md`, `BUSINESS_FLOW_AUDIT.md`, and `PERFORMANCE_AUDIT.md`.

---

## ━━ ROADMAP PRIORITIZATION MATRIX ━━

```
┌────────────────────────────────────────────────────────────────────────┐
│ P0 - CRITICAL (Blockers for Production / Security / Compliance)         │
│   • P0-1: Mandatory Environment Variable Enforcement                   │
│   • P0-2: Web Accessibility (WCAG 2.1) Icon Button ARIA Tags           │
│   • P0-3: Google Play READ_CALL_LOG Core Functionality Declaration     │
├────────────────────────────────────────────────────────────────────────┤
│ P1 - IMPORTANT (High Business & Performance Impact)                    │
│   • P1-1: PostgreSQL GIN & Composite Deduplication Index Optimization  │
│   • P1-2: Live Vendor API Integration Testing (IndiaMART & Meta)       │
│   • P1-3: Automated Lead Rotting Re-assignment Escalation Engine       │
│   • P1-4: Real Storage Usage Meter Refactoring in CleanupWidget        │
├────────────────────────────────────────────────────────────────────────┤
│ P2 - IMPROVEMENTS (UX & Operational Polish)                            │
│   • P2-1: Google / Outlook 2-Way Calendar Integration                  │
│   • P2-2: Mobile Analytics Performance Line Chart Implementation       │
│   • P2-3: Backend CSV Export Streaming Endpoint                        │
│   • P2-4: Overdue Callback Manager SLA Escalation Alerts               │
├────────────────────────────────────────────────────────────────────────┤
│ P3 - NICE TO HAVE (Future Product Expansions)                           │
│   • P3-1: Standalone Kanban Task Management Board                      │
│   • P3-2: Automated 90-Day Win-Back Campaign Trigger                   │
│   • P3-3: Customer Sales Quotation / Proforma PDF Generator            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ━━ 🚨 P0 - CRITICAL TASKS (MUST FIX BEFORE PROD) ━━

### Task P0-1: Mandatory Environment Variable Enforcement
- **Problem:** In non-production mode, `server.ts` defaults `COOKIE_SECRET` to `'dev-only-cookie-secret'`.
- **Impact:** Risk of session hijacking if deployed to production without explicit environment variables.
- **Solution:** Enforce boot-time check in `server.ts` verifying `COOKIE_SECRET`, `CSRF_SECRET`, and `RAZORPAY_KEY_SECRET` exist and exceed 32 characters when `NODE_ENV === 'production'`.
- **Estimated Effort:** 0.5 Days
- **Dependencies:** None
- **Risk:** Low
- **Acceptance Criteria:** Server throws explicit fatal error on boot if production environment variables are missing or under 32 characters.

### Task P0-2: Web Accessibility (WCAG 2.1) ARIA Tags
- **Problem:** 71 out of 73 Web components lack `aria-label` attributes on interactive icon-only buttons (`UI_UX_AUDIT.md`).
- **Impact:** Visually impaired users relying on screen readers (NVDA, VoiceOver) cannot navigate table control buttons.
- **Solution:** Add explicit `aria-label`, `role="button"`, and `tabIndex={0}` across all interactive SVG icon wrappers in `src/components/`.
- **Estimated Effort:** 2.0 Days
- **Dependencies:** Web UI Components
- **Risk:** Low
- **Acceptance Criteria:** Accessibility audit score on Lighthouse increases from 45% to >90%.

### Task P0-3: Google Play READ_CALL_LOG Declaration
- **Problem:** Google Play Store requires a Core CRM Functionality Declaration form for apps requesting `READ_CALL_LOG` permission.
- **Impact:** Mobile APK submission rejection on Google Play Console.
- **Solution:** Prepare Play Console declaration video demonstrating core SIM call disposition logging workflow.
- **Estimated Effort:** 1.0 Day
- **Dependencies:** Mobile APK build
- **Risk:** Medium (Google Play approval timeline)
- **Acceptance Criteria:** Google Play Console accepts `READ_CALL_LOG` permission declaration for production release.

---

## ━━ ⚡ P1 - IMPORTANT TASKS (HIGH IMPACT) ━━

### Task P1-1: PostgreSQL GIN & Composite Index Optimization
- **Problem:** Missing GIN index on `leads.custom_data` (JSONB) and missing composite index on `leads(company_id, phone)` (`DATABASE_AUDIT.md`).
- **Impact:** Dynamic field queries and bulk CSV deduplication execute unindexed table scans as dataset exceeds 50,000 rows.
- **Solution:** Execute SQL migration adding:
  ```sql
  CREATE INDEX idx_leads_custom_data ON public.leads USING gin (custom_data);
  CREATE INDEX idx_leads_company_phone ON public.leads(company_id, phone);
  ```
- **Estimated Effort:** 0.5 Days
- **Dependencies:** Database Migration Access
- **Risk:** Low
- **Acceptance Criteria:** Deduplication query response time reduced by >70% on 100,000 lead datasets.

### Task P1-2: Live Vendor API Integration Testing (IndiaMART & Meta)
- **Problem:** `indiamart-poll` Edge Function and Facebook Lead Ads HMAC signature verification operate on dev mock payloads.
- **Impact:** Tenant admins cannot verify live marketplace lead flow without entering production API keys.
- **Solution:** Input live production vendor API keys into `/integrations` UI and execute end-to-end webhook intake test.
- **Estimated Effort:** 1.5 Days
- **Dependencies:** Live Vendor API Keys
- **Risk:** Medium
- **Acceptance Criteria:** Incoming IndiaMART and Meta leads insert into `leads` table with correct E.164 phone numbers.

### Task P1-3: Automated Lead Rotting Re-assignment Engine
- **Problem:** Leads uncontacted for >48 hours log an aging event (`leadRotting.ts`) but require manual admin bulk re-assignment (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** High lead decay rate and lost conversion opportunities.
- **Solution:** Update `execute-automation-rules` Edge Function to auto-reassign uncontacted leads to secondary agents after 48 hours.
- **Estimated Effort:** 2.0 Days
- **Dependencies:** Supabase Automation Edge Function
- **Risk:** Low
- **Acceptance Criteria:** Uncontacted leads >48h automatically rotate to the next online agent in round-robin queue.

### Task P1-4: Real Storage Usage Meter Refactoring
- **Problem:** `CleanupWidget.tsx` (Line 49) uses estimated mock data (`// TODO: Replace with real storage usage...`).
- **Impact:** Admins view mock storage metrics instead of real Supabase Storage bucket utilization.
- **Solution:** Connect `CleanupWidget.tsx` to Supabase Storage Admin RPC returning actual byte usage per tenant folder.
- **Estimated Effort:** 1.0 Day
- **Dependencies:** Supabase Storage RPC
- **Risk:** Low
- **Acceptance Criteria:** Storage widget displays real byte usage matching Supabase Storage bucket metrics.

---

## ━━ 🔧 P2 - IMPROVEMENTS (UX & OPERATIONAL POLISH) ━━

### Task P2-1: Google / Outlook 2-Way Calendar Integration
- **Problem:** Lead status `Demo Scheduled` logs internal CRM notes but does not send `.ics` calendar invites (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** Sales reps must manually create Google Calendar invites for prospects.
- **Solution:** Integrate OAuth Google Calendar API to dispatch automated `.ics` meeting invites upon status change to `Demo Scheduled`.
- **Estimated Effort:** 3.0 Days
- **Dependencies:** Google OAuth Calendar Scope
- **Risk:** Medium
- **Acceptance Criteria:** Calendar invite automatically arrives in prospect's email inbox upon moving lead status to `Demo Scheduled`.

### Task P2-2: Mobile Performance Line Chart Implementation
- **Problem:** `PerformanceScreen.tsx` (Lines 107–115) renders a styled UI placeholder box (`graphMockBox`).
- **Impact:** Telecallers view a static mock placeholder box on their personal KPI tab.
- **Solution:** Bind `react-native-svg` to dynamic daily call performance trend data.
- **Estimated Effort:** 1.5 Days
- **Dependencies:** Mobile Screen Component
- **Risk:** Low
- **Acceptance Criteria:** Telecallers view responsive SVG performance line graph reflecting real weekly call counts.

### Task P2-3: Backend CSV Export Streaming Endpoint
- **Problem:** 100,000+ lead CSV exports execute in client browser memory (`API_AUDIT.md`).
- **Impact:** Potential browser out-of-memory crashes on low-spec laptops during massive exports.
- **Solution:** Implement `GET /v1/leads/export-stream` REST endpoint returning chunked CSV streams.
- **Estimated Effort:** 2.0 Days
- **Dependencies:** Express Server Route
- **Risk:** Low
- **Acceptance Criteria:** Exporting 100,000 leads downloads smoothly as a streamed response with zero client memory pressure.

### Task P2-4: Overdue Callback Manager SLA Escalation Alerts
- **Problem:** Overdue callbacks (>2 hours) do not trigger push notifications to managers (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** Missed customer callbacks reduce conversion opportunities.
- **Solution:** Add 15-minute cron check notifying Floor Manager when a telecaller callback is overdue by >2 hours.
- **Estimated Effort:** 1.0 Day
- **Dependencies:** Scheduled Messages Cron
- **Risk:** Low
- **Acceptance Criteria:** Floor manager receives in-app alert when agent callback is overdue by 2+ hours.

---

## ━━ 💡 P3 - NICE TO HAVE (FUTURE EXTENSIONS) ━━

### Task P3-1: Standalone Kanban Task Management Board
- **Problem:** Tasks are tightly bound to lead records; no general-purpose task manager exists (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** Non-lead operational tasks (e.g. "Prepare monthly sales deck") cannot be tracked in CRM.
- **Solution:** Create `tasks` table and `TaskManager.tsx` Kanban component.
- **Estimated Effort:** 4.0 Days
- **Dependencies:** Web Frontend & Database Schema
- **Risk:** Low
- **Acceptance Criteria:** Team members can create, drag, and assign non-lead operational tasks.

### Task P3-2: Automated 90-Day Win-Back Campaign Trigger
- **Problem:** Lost leads are cataloged for churn analytics but lack automated re-engagement dispatches (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** Untapped revenue potential from previously dropped leads.
- **Solution:** Create automated 90-day cron that dispatches re-engagement WhatsApp discount templates to lost leads.
- **Estimated Effort:** 2.0 Days
- **Dependencies:** Automation Engine & WhatsApp API
- **Risk:** Low
- **Acceptance Criteria:** Leads marked `Lost` 90 days prior receive automated win-back WhatsApp templates.

### Task P3-3: Customer Sales Quotation / Proforma PDF Generator
- **Problem:** CRM generates tenant B2B subscription invoices, but lacks customer-facing quotation PDF generator (`BUSINESS_FLOW_AUDIT.md`).
- **Impact:** Telecallers must use external tools to create product estimate PDFs for prospects.
- **Solution:** Add simple PDF quotation generator modal in lead detail screen.
- **Estimated Effort:** 3.0 Days
- **Dependencies:** PDF Generation Library
- **Risk:** Low
- **Acceptance Criteria:** Telecaller can input itemized prices and download/send a branded PDF quotation to the lead via WhatsApp.

---

## ━━ TOTAL ESTIMATED EFFORT SUMMARY ━━

- **P0 Critical Tasks:** 3.5 Days
- **P1 Important Tasks:** 6.0 Days
- **P2 Improvement Tasks:** 7.5 Days
- **P3 Future Tasks:** 9.0 Days
- **Grand Total Engineering Effort:** **26.0 Days**

---

**Roadmap Conclusion:** By executing the P0 and P1 tasks over a 9.5-day sprint, CallMind CRM will achieve 100% production readiness, complete accessibility compliance, optimized database indexing, and automated lead aging protection.
