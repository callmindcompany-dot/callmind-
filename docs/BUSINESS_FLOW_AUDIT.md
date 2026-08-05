# CALLMIND CRM - COMPLETE BUSINESS WORKFLOW AUDIT

**Auditor Role:** Principal Product Auditor & Enterprise CRM Architect  
**Date:** July 31, 2026  
**Target Codebase:** CallMind Monorepo (Web CRM + Mobile App + Express REST + Supabase DB)  
**Audit Mandate:** Trace the 9 core business entity lifecycles from end-to-end and document every operational gap without mutating source code.

---

## ━━ EXECUTIVE SUMMARY ━━

| Entity Lifecycle | Health Grade | Core Operational Strength | Primary Identified Business Gap |
| :--- | :--- | :--- | :--- |
| **1. Lead Lifecycle** | **A (9.2/10)** | 5 Ingestion vectors, E.164 sanitization, 24-hr dedup, auto Round-Robin. | Missing automated lead decay escalation if uncontacted > 48h. |
| **2. Call Lifecycle** | **A- (8.8/10)**| One-tap SIM dialer, post-call sheet, voice notes, Gemini AI summary. | Duration relies on feedback submission rather than telephony hook. |
| **3. Follow-up Lifecycle**| **B+ (8.5/10)**| Scheduled callback sheet, local mobile push alerts, callback tab queue. | Missing manager escalation when callback is overdue by > 2 hours. |
| **4. Meeting Lifecycle** | **B (8.0/10)** | Status transitions (`Demo Scheduled`), custom fields, activity logs. | Missing 2-way Google/Outlook Calendar `.ics` invite sync. |
| **5. Sale (Won) Lifecycle**| **A- (8.7/10)**| Mandatory `deal_value` input, revenue pipeline RPC, leaderboard scoring. | Missing customer-facing quotation / proforma PDF generator. |
| **6. Lost Lead Lifecycle**| **A (9.0/10)** | Mandatory `lost_reason` selection, churn reason aggregate RPC. | Missing automated 90-day win-back / re-engagement campaign. |
| **7. Task Lifecycle** | **B- (7.8/10)**| Callback reminders and lead note action items. | Lacks dedicated standalone Task Manager (Kanban task board). |
| **8. Automation Lifecycle**| **A (9.1/10)** | DB triggers -> Edge Function -> WhatsApp, Email & Round-Robin. | Lacks visual execution flow chart showing pass/fail statistics. |
| **9. Reports Lifecycle** | **A (9.3/10)** | Pre-aggregated SQL views, RPC comparison metrics, AI Insights Hub. | Large CSV exports (100k+ rows) execute client-side vs backend stream. |

---

## ━━ 1. DETAILED LIFECYCLE TRACING ━━

### A. Lead Lifecycle Trace
```
[Ingestion (IndiaMART / Facebook / Webhook / CSV / Manual)]
                       │
                       ▼
         [E.164 Phone Sanitization (+91)]
                       │
                       ▼
       [24-Hour Deduplication Window Check]
           ├── Match Found ──► Merge to custom_data Array
           └── New Lead ──────► [Round-Robin Telecaller Assignment]
                                          │
                                          ▼
                       [Status: New ➔ Contacted ➔ Interested ➔ Won / Lost]
```
- **Code Evidence:** `src/routes/leads.ts` (L15-160), `src/services/deduplication.service.ts` (L10-95).
- **Missing Business Step:** Automated "Lead Rotting" re-assignment trigger. When a lead sits in `New` status for > 48 hours without a call attempt, the system logs the aging event (`leadRotting.ts`), but currently requires a manual admin bulk re-assignment step instead of auto-escalating to a backup agent.

### B. Call Lifecycle Trace
```
[Agent Selects Lead] ➔ [Tap 'Call' (SIM 1 / SIM 2)] ➔ [Android Native Dialer]
                                                              │
                                                              ▼
[Gemini AI Summary Generated] ◄── [Save & Voice Note Dictation] ◄── [Post-Call Feedback Sheet]
```
- **Code Evidence:** `mobile/src/screens/38_CallingScreen.tsx`, `mobile/src/screens/PostCallFeedbackSheet.tsx`, `src/routes/ai.ts` (L15-70).
- **Missing Business Step:** Automatic call duration capture from native TelephonyManager state. Call duration currently relies on the agent submitting the Post-Call Feedback Sheet. If an agent force-closes the app during a call, duration is recorded as `0 seconds`.

### C. Follow-up Lifecycle Trace
- **Code Evidence:** `mobile/src/screens/131_ScheduleCallbackSheet.tsx`, `mobile/src/screens/CallbacksScreen.tsx`.
- **Flow:** Agent selects `Call Back` ➔ Chooses Date & Time ➔ App schedules local notification ➔ Item listed under `CallbacksScreen.tsx`.
- **Missing Business Step:** Manager SLA Escalation. If a telecaller misses a scheduled callback time by > 2 hours, no push alert is currently sent to the Team Lead / Floor Manager.

### D. Meeting Lifecycle Trace
- **Code Evidence:** `src/components/LeadsPage.tsx`, `mobile/src/screens/LeadDetailScreen.tsx`.
- **Flow:** Lead status moved to `Demo Scheduled` ➔ Date & notes appended to activity timeline.
- **Missing Business Step:** External Calendar Integration. Meetings are stored internally within CRM activity logs. There is no direct 2-way sync with Google Calendar or Microsoft Outlook to send `.ics` calendar invites to the customer's email.

### E. Sale (Won Lead) Lifecycle Trace
- **Code Evidence:** `src/routes/payments.ts`, `full_master_supabase_setup.sql` (`get_revenue_pipeline` RPC).
- **Flow:** Status updated to `Converted` / `Won` ➔ Prompted for `deal_value` (e.g. ₹50,000) ➔ Revenue pipeline updated ➔ Leaderboard score calculated.
- **Missing Business Step:** Customer Sales Quotation / Proforma Invoice Generation. CallMind generates B2B SaaS GST subscription invoices for the tenant company itself, but does NOT include a built-in module for telecallers to generate customer-facing sales quotations/proformas for their leads.

### F. Lost Lead Lifecycle Trace
- **Code Evidence:** `mobile/src/screens/PostCallFeedbackSheet.tsx`, `full_master_supabase_setup.sql` (`get_detailed_churn` RPC).
- **Flow:** Status updated to `Rejected` / `Lost` ➔ Mandatory selection of `lost_reason` (Price, Competitor, No Requirement, Unresponsive) ➔ Aggregated into Churn Analytics.
- **Missing Business Step:** Automated Re-engagement / Win-Back Campaign. Lost leads are cataloged for analytics, but the system lacks an automated 90-day win-back trigger to re-engage dropped leads with discounted WhatsApp campaigns.

### G. Task Lifecycle Trace
- **Code Evidence:** `src/services/schedulerService.ts`.
- **Flow:** Action items embedded inside lead activity notes and callback dates.
- **Missing Business Step:** Standalone Task Management Board. Tasks are tightly coupled to individual lead records. The platform lacks a general-purpose Kanban Task Manager (e.g. Trello/Jira style) for non-lead operational tasks (e.g., "Prepare monthly sales deck").

### H. Automation Lifecycle Trace
- **Code Evidence:** `supabase/functions/execute-automation-rules/index.ts`, `src/components/AutomationPage.tsx`.
- **Flow:** DB Webhook on lead mutation ➔ Edge Function evaluates JSON rules ➔ Dispatches WhatsApp template, email, or Round-Robin routing ➔ Delayed drip messages queued in `scheduled_messages`.
- **Missing Business Step:** Visual Workflow Analytics Canvas. While rules execute reliably, the UI lacks a visual execution graph showing how many leads passed or failed each conditional branch in real-time.

### I. Reports Lifecycle Trace
- **Code Evidence:** `supabase_reports_migration.sql` (Views: `conversion_funnel`, `agent_performance`, `hourly_call_density`, `lead_source_yield`), `src/components/ReportsPage.tsx`, `src/components/AIInsightsHub.tsx`.
- **Flow:** Pre-aggregated SQL views ➔ `get_comparison_metrics` RPC ➔ Rendered in web dashboard ➔ Gemini AI Manager Insights Hub generates monthly natural language report.
- **Missing Business Step:** Backend Export Streaming Route. Large CSV exports (100,000+ rows) execute in client-side browser memory, which can cause browser slowdowns on low-spec laptops during massive data dumps.

---

## ━━ 2. SUMMARY OF RECOMMENDED PRODUCT ENHANCEMENTS ━━

1. **Automated Lead Rotting Escalation:** Trigger auto-reassignment if lead remains in `New` status > 48 hours.
2. **Native Telephony Duration Hook:** Capture exact call duration from Android OS `CallLog` provider.
3. **Overdue Callback Manager Alerts:** Notify Floor Manager when a telecaller misses a scheduled callback by > 2 hours.
4. **Google/Outlook Calendar Sync:** Send automated `.ics` meeting invites to prospects when status changes to `Demo Scheduled`.
5. **Customer Quotation Generator:** Add simple PDF quotation generator for telecallers to send product estimates to leads.
6. **Automated 90-Day Win-Back:** Auto-trigger WhatsApp re-engagement drips for leads marked `Lost` 90 days prior.
7. **Backend CSV Export Stream:** Implement `/v1/leads/export-stream` REST endpoint for memory-efficient bulk exports.

---

**Audit Conclusion:** The CallMind business workflow architecture is robustly designed for high-velocity Indian telecalling teams. Core workflows (Ingestion, Deduplication, Calling, Dispositions, RLS Security, and AI Summaries) operate seamlessly. Implementing the identified missing business steps (Calendar Sync, Lead Decay Escalation, and Customer Quotation PDF Generator) will complete the enterprise CRM suite.
