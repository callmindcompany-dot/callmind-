# CALLMIND CRM — ENTERPRISE BUSINESS PROCESS MATRIX (BPM)

**Author:** Principal Enterprise CRM Solution Architect  
**Date:** July 31, 2026  
**Target Architecture:** CallMind Monorepo (Web CRM + Mobile App + Express REST + Supabase Backend)  
**Standard:** Enterprise Grade (Salesforce Financial Services Cloud / Microsoft Dynamics 365 Architecture Standard)

---

## ━━ EXECUTIVE PROCESS ARCHITECTURE OVERVIEW ━━

The CallMind Business Process Matrix governs the 15-stage end-to-end lifecycle of customer relationships across Indian B2B/B2C enterprises. It defines deterministic state transitions, multi-tenant Row-Level Security (RLS) enforcement, automated SLAs, AI-driven action loops, and fallback recovery protocols.

```
 [1. Lead Created] ──► [2. Assignment] ──► [3. First Call] ──► [4. Follow-up] ──► [5. Meeting]
                                                                                        │
 [10. Payment] ◄── [9. Invoice] ◄── [8. Won] ◄── [7. Negotiation] ◄── [6. Quotation] ◄──┘
       │
       ▼
 [11. Support] ──► [12. Renewal] ──► [13. Referral] ──► [14. Archive] (Or [15. Lost Lead])
```

---

## ━━ STAGE-BY-STAGE PROCESS SPECIFICATION ━━

### 1. LEAD CREATED STAGE

1. **Stage Name:** `LEAD_CREATED` (Stage 1.0)
2. **Description:** Initial ingestion of a customer prospect into the tenant database via webhooks (IndiaMART, JustDial, Meta Lead Ads) or manual single/bulk CSV upload.
3. **Entry Criteria:** Inbound payload received via API or CSV file upload containing at least a valid customer name and phone number.
4. **Exit Criteria:** Phone number sanitized to E.164 (+91) format, 24-hour deduplication check evaluated, and record saved to `leads` table with status `New`.
5. **Responsible Role:** System Ingestion Engine / `sub_admin` / `founder`
6. **Permissions Required:** `leads:create`, `webhooks:write`
7. **Automatic Notifications:** In-app toast notification to Sub-Admin: *"30 New IndiaMART Leads Ingested"*.
8. **Automation Rules:** `rule_dedup_check` (Merges duplicate if within 7-day cooldown), `rule_e164_sanitize` (Appends +91 prefix).
9. **AI Actions:** `aiMapper` auto-maps non-standard CSV headers (e.g. "Mob", "Contact") to `leads.phone`.
10. **Reports Updated:** `Lead Source Yield View`, `Executive Dashboard (Total Ingested Leads)`.
11. **Audit Logs Created:** `LEAD_INGESTED` (Actor: SYSTEM/USER, Target: Lead ID, Metadata: `{ source, ip }`).
12. **SLA Rules:** Ingestion to Assignment SLA: **< 30 Seconds**.
13. **Escalation Rules:** If lead remains unassigned for > 5 minutes, system alerts `floor_manager`.
14. **Mobile Behaviour:** Real-time push alert dispatched to online telecallers if auto-assigned immediately.
15. **Web Behaviour:** Real-time table row addition with `is_unseen = true` glow badge on `LeadsPage.tsx`.
16. **Failure Scenarios:** Invalid phone number format (e.g. 5 digits) or malformed CSV JSON payload.
17. **Recovery Process:** Payload moved to `system_errors` queue; Admin alerted via `SmartImportModal` error log.

---

### 2. ASSIGNMENT STAGE

1. **Stage Name:** `LEAD_ASSIGNMENT` (Stage 2.0)
2. **Description:** Allocation of the newly created lead to an active telecaller using skill-based, city-matched, or Round-Robin rotation.
3. **Entry Criteria:** Lead exists in `leads` table with `status = 'New'` and `assigned_to IS NULL`.
4. **Exit Criteria:** `assigned_to` foreign key populated with valid `users.id`, `assigned_at` timestamp recorded.
5. **Responsible Role:** `floor_manager` / `sub_admin` / Automated Round-Robin Router
6. **Permissions Required:** `leads:assign`, `team:read`
7. **Automatic Notifications:** Mobile push notification to assigned Telecaller: *"New Lead Assigned: Rahul Sharma (+919876543210)"*.
8. **Automation Rules:** `rule_round_robin_assign` (Selects next active telecaller in queue), `rule_skill_match` (Matches "Real Estate" tag to specialized agent).
9. **AI Actions:** `aiLeadScorer` calculates initial win-probability score (0–100) based on historical source conversion rate.
10. **Reports Updated:** `Agent Workload Matrix`, `Speed-to-Lead (TAT) Baseline`.
11. **Audit Logs Created:** `LEAD_ASSIGNED` (Actor: ROUTER/ADMIN, Target: Lead ID, Metadata: `{ assigned_to: agent_id }`).
12. **SLA Rules:** Assignment to First Call SLA: **< 15 Minutes** (Speed-to-Lead target).
13. **Escalation Rules:** If telecaller does not initiate call within 48 hours, `leadRotting.ts` triggers auto-reassignment to secondary agent.
14. **Mobile Behaviour:** Lead card instantly appears at the top of `HomeScreen.tsx` and `LeadListScreen.tsx` with "NEW" badge.
15. **Web Behaviour:** Unassigned counter decrements; Agent row highlights updated workload count in `TeamPage.tsx`.
16. **Failure Scenarios:** Zero telecallers currently marked `online` in `agent_status` table.
17. **Recovery Process:** Lead remains in unassigned pool; System alerts `floor_manager` to log in telecallers or trigger fallback distribution.

---

### 3. FIRST CALL STAGE

1. **Stage Name:** `FIRST_CALL_ATTEMPT` (Stage 3.0)
2. **Description:** Telecaller initiates initial telephonic connection with the prospect via native Android SIM card (Slot 1 / Slot 2).
3. **Entry Criteria:** Telecaller selects lead on mobile app and taps "Call" button.
4. **Exit Criteria:** Call completed, duration logged, outcome disposition selected (`connected`, `busy`, `no_answer`, `invalid`), and Post-Call Sheet submitted.
5. **Responsible Role:** `telecaller`
6. **Permissions Required:** `calls:dial`, `calls:log`
7. **Automatic Notifications:** None.
8. **Automation Rules:** `rule_post_call_disposition_trigger` (Forces PostCallFeedbackSheet overlay upon returning from dialer).
9. **AI Actions:** Gemini AI converts raw telecaller voice notes / typed notes into a 2-sentence structured summary and suggests status (`Interested` / `Call Back`).
10. **Reports Updated:** `Hourly Call Density View`, `Agent Performance View (Total Dials, Connected Calls)`, `Speed-to-Lead TAT Report`.
11. **Audit Logs Created:** `CALL_LOGGED` (Actor: Telecaller ID, Target: Call ID, Metadata: `{ duration, outcome, sim_slot }`).
12. **SLA Rules:** Post-call disposition submission SLA: **< 2 Minutes** post-call termination.
13. **Escalation Rules:** If call outcome is `no_answer` 3 consecutive times, system auto-schedules WhatsApp template message.
14. **Mobile Behaviour:** Launches Android native dialer (`tel:` intent), displays `39_ActiveCallOverlay.tsx`, and opens `PostCallFeedbackSheet.tsx` upon hangup.
15. **Web Behaviour:** Real-time live status indicator in `AgentLiveMonitor.tsx` updates to `ON_CALL` ➔ `SUBMITTING_DISPOSITION`.
16. **Failure Scenarios:** Telecaller force-closes app mid-call or mobile battery dies during dialing.
17. **Recovery Process:** `sync.ts` offline engine recovers transient state from AsyncStorage (`@callmind_unsynced_calls`) upon app relaunch.

---

### 4. FOLLOW-UP STAGE

1. **Stage Name:** `SCHEDULED_FOLLOW_UP` (Stage 4.0)
2. **Description:** System-guided callback management for leads requiring subsequent discussion before buying decision.
3. **Entry Criteria:** Lead status set to `Call Back` or `Interested` with `callback_time` populated.
4. **Exit Criteria:** Follow-up call executed on schedule, or rescheduled with updated timestamp.
5. **Responsible Role:** `telecaller` / `team_lead`
6. **Permissions Required:** `callbacks:read`, `callbacks:write`
7. **Automatic Notifications:** Mobile push alert & sound chime 10 minutes prior to scheduled callback time.
8. **Automation Rules:** `rule_callback_reminder_queue` (Schedules local Android notification via `schedulerService.ts`).
9. **AI Actions:** AI generates personalized follow-up battlecard snippet based on previous call notes.
10. **Reports Updated:** `Overdue Callbacks Index`, `Daily Follow-up Completion Rate`.
11. **Audit Logs Created:** `CALLBACK_SCHEDULED` (Actor: Agent ID, Target: Lead ID, Metadata: `{ scheduled_for }`).
12. **SLA Rules:** Callback Execution SLA: **±15 Minutes** of scheduled time.
13. **Escalation Rules:** If callback is overdue by > 2 hours, alert sent to `floor_manager` for manual intervention.
14. **Mobile Behaviour:** Lead highlighted in red banner inside `CallbacksScreen.tsx`.
15. **Web Behaviour:** Manager views overdue callback badge in `DashboardLayout.tsx` header notifications.
16. **Failure Scenarios:** Telecaller absent or off-shift during scheduled callback time.
17. **Recovery Process:** Floor Manager uses `bulk-reassign` tool to temporarily route overdue callbacks to an active pod member.

---

### 5. MEETING STAGE

1. **Stage Name:** `DEMO_MEETING_SCHEDULED` (Stage 5.0)
2. **Description:** Formal product demonstration or solution presentation scheduled with key prospect decision-makers.
3. **Entry Criteria:** Lead status transitioned to `Demo Scheduled` with confirmed meeting date, time, and meeting link/location.
4. **Exit Criteria:** Meeting conducted (Status moved to `Quotation` / `Negotiation`) or marked as `No Show`.
5. **Responsible Role:** `telecaller` / `team_lead` / Sales Executive
6. **Permissions Required:** `leads:update`, `meetings:manage`
7. **Automatic Notifications:** Automated WhatsApp & Email confirmation sent to prospect with calendar event payload.
8. **Automation Rules:** `rule_send_meeting_invite` (Invokes `send-whatsapp-message` and `send-email` Edge Functions).
9. **AI Actions:** `aiLeadScorer` updates win-probability score upward (e.g. from 30% to 60%).
10. **Reports Updated:** `Demo Conversion Funnel`, `Meeting Show Rate Analytics`.
11. **Audit Logs Created:** `MEETING_SCHEDULED` (Actor: Agent ID, Target: Lead ID, Metadata: `{ meeting_time, channel }`).
12. **SLA Rules:** Meeting Conducted SLA: Within scheduled window + 24 hours disposition update.
13. **Escalation Rules:** If meeting marked `No Show`, automated 3-part re-engagement drip sequence initialized.
14. **Mobile Behaviour:** Meeting detail card pinned to `LeadDetailScreen.tsx` header with quick-join URL button.
15. **Web Behaviour:** Meeting event visible on `PipelineBoard.tsx` calendar view.
16. **Failure Scenarios:** Prospect fails to join meeting link or cancels last-minute.
17. **Recovery Process:** System prompts agent for `No Show` reason and triggers `rule_reschedule_meeting` automation workflow.

---

### 6. QUOTATION STAGE

1. **Stage Name:** `QUOTATION_PROPOSAL_SENT` (Stage 6.0)
2. **Description:** Generation and transmission of commercial pricing estimate, scope of work, and GST breakdown to prospect.
3. **Entry Criteria:** Lead status transitioned to `Quotation` with itemized products and `deal_value` specified.
4. **Exit Criteria:** Proposal delivered to customer; Status moved to `Negotiation` or `Won`.
5. **Responsible Role:** `team_lead` / `sub_admin` / `founder`
6. **Permissions Required:** `quotations:create`, `leads:update`
7. **Automatic Notifications:** WhatsApp template with branded PDF proposal sent to customer mobile number.
8. **Automation Rules:** `rule_generate_proposal_pdf` (Renders quotation payload and stores PDF link in Supabase Storage).
9. **AI Actions:** `aiProposalWriter` drafts customized value-proposition summary tailored to prospect's industry.
10. **Reports Updated:** `Gross Revenue Pipeline View (`get_revenue_pipeline` RPC)`, `Weighted Pipeline Forecast`.
11. **Audit Logs Created:** `QUOTATION_SENT` (Actor: User ID, Target: Lead ID, Metadata: `{ deal_value, pdf_url }`).
12. **SLA Rules:** Proposal Delivery SLA: **< 4 Hours** post-meeting completion.
13. **Escalation Rules:** If proposal is un-opened / un-acknowledged after 48 hours, reminder task assigned to Team Lead.
14. **Mobile Behaviour:** PDF proposal preview button added to `LeadDetailScreen.tsx` activity timeline.
15. **Web Behaviour:** Deal card moves to `Quotation` column on Kanban `PipelineBoard.tsx` displaying deal amount in INR (₹).
16. **Failure Scenarios:** PDF generation library timeout or storage upload failure.
17. **Recovery Process:** Fallback plain-text commercial terms generated; Error logged to `system_errors` for IT retry.

---

### 7. NEGOTIATION STAGE

1. **Stage Name:** `COMMERCIAL_NEGOTIATION` (Stage 7.0)
2. **Description:** Active discussions regarding pricing discounts, payment terms, seat limits, and SLA customization.
3. **Entry Criteria:** Prospect acknowledges quotation and requests commercial adjustments; Status set to `Negotiation`.
4. **Exit Criteria:** Agreement reached on pricing terms (Moves to `Won`) or prospect declines (Moves to `Lost`).
5. **Responsible Role:** `floor_manager` / `sub_admin` / `founder`
6. **Permissions Required:** `discounts:approve`, `leads:update`
7. **Automatic Notifications:** Internal alert to Founder if requested discount exceeds 15% margin threshold.
8. **Automation Rules:** `rule_discount_approval_gate` (Blocks status transition to `Won` if discount requires Founder signature).
9. **AI Actions:** `aiObjectionHandler` provides real-time sales battlecard suggestions for pricing objections.
10. **Reports Updated:** `Pipeline Discount Variance Report`, `Negotiation Cycle Time`.
11. **Audit Logs Created:** `NEGOTIATION_UPDATE` (Actor: Manager ID, Target: Lead ID, Metadata: `{ revised_deal_value, discount_percent }`).
12. **SLA Rules:** Negotiation Decision SLA: **< 5 Business Days**.
13. **Escalation Rules:** If deal stays in `Negotiation` > 7 days, Founder notified to intervene with executive closing offer.
14. **Mobile Behaviour:** Negotiation notes and discount requests visible on `65_AILeadInsightScreen.tsx`.
15. **Web Behaviour:** Manager can edit deal value directly inline on `PipelineBoard.tsx`.
16. **Failure Scenarios:** Un-authorized telecaller offers un-approved 50% discount to prospect.
17. **Recovery Process:** RLS policy blocks unauthorized deal updates; System flags transaction and alerts `sub_admin`.

---

### 8. WON STAGE

1. **Stage Name:** `DEAL_CLOSED_WON` (Stage 8.0)
2. **Description:** Customer officially accepts commercial proposal and commits to subscription purchase.
3. **Entry Criteria:** Proposal accepted by customer; Status transitioned to `Converted` or `Won`.
4. **Exit Criteria:** `deal_value` finalized, winning agent credited, and billing handoff triggered.
5. **Responsible Role:** `telecaller` / `team_lead` / `sub_admin`
6. **Permissions Required:** `leads:close_won`
7. **Automatic Notifications:** Company-wide celebration announcement pushed to `TeamAnnouncementsSection.tsx`: *"🎉 New Win! Priya Singh closed Patel Traders for ₹1,20,000!"*.
8. **Automation Rules:** `rule_close_won_handoff` (Locks lead fields from further modification, triggers invoice generation).
9. **AI Actions:** AI calculates final conversion attribution metrics and updates agent leaderboard rank.
10. **Reports Updated:** `Conversion Funnel (Converted Count)`, `Lead Source Yield (Conversion Rate %)`, `Telecaller Leaderboard`.
11. **Audit Logs Created:** `DEAL_WON` (Actor: Agent ID, Target: Lead ID, Metadata: `{ final_deal_value }`).
12. **SLA Rules:** Hand-off to Billing SLA: **Immediate (< 1 Minute)**.
13. **Escalation Rules:** None.
14. **Mobile Behaviour:** Confetti animation renders on `LeadDetailScreen.tsx`; Agent total wins count increments instantly.
15. **Web Behaviour:** Lead row changes background to subtle emerald green (`bg-emerald-500/10`) with `WON` badge.
16. **Failure Scenarios:** Attempting to mark deal as `Won` with `deal_value = 0`.
17. **Recovery Process:** Validation error displayed: *"Deal value must be greater than ₹0 to close as Won."*

---

### 9. INVOICE STAGE

1. **Stage Name:** `INVOICE_GENERATION` (Stage 9.0)
2. **Description:** Creation of legally compliant Indian B2B GST tax invoice containing CGST/SGST (intra-state) or IGST (inter-state) breakdown.
3. **Entry Criteria:** Deal closed as `Won` or manual invoice request initiated by Admin.
4. **Exit Criteria:** Tax invoice generated with unique invoice number (e.g. `INV-2026-0481`), PDF created, and Razorpay Order ID attached.
5. **Responsible Role:** System Billing Engine / `founder`
6. **Permissions Required:** `invoices:create`, `billing:manage`
7. **Automatic Notifications:** Email & WhatsApp sent to customer with PDF invoice attachment and Razorpay payment link.
8. **Automation Rules:** `rule_calculate_gst` (Applies 9% CGST + 9% SGST if state == MH, else 18% IGST), `rule_create_razorpay_order`.
9. **AI Actions:** None (Pure deterministic financial computation).
10. **Reports Updated:** `Accounts Receivable Register`, `GST Tax Output Report`.
11. **Audit Logs Created:** `INVOICE_CREATED` (Actor: SYSTEM/FOUNDER, Target: Invoice ID, Metadata: `{ invoice_number, total_amount, gst }`).
12. **SLA Rules:** Invoice Generation SLA: **< 10 Seconds**.
13. **Escalation Rules:** If Razorpay Order creation fails, alert dispatched to `founder` via email.
14. **Mobile Behaviour:** Inaccessible to telecallers (Admin security restriction).
15. **Web Behaviour:** Invoice listed under `BillingPage.tsx` with `Unpaid` status badge and downloadable PDF link.
16. **Failure Scenarios:** Invalid GSTIN format provided by customer.
17. **Recovery Process:** Invoice generated under B2C default (Consumer); Admin prompted to update GSTIN for revised B2B credit note.

---

### 10. PAYMENT STAGE

1. **Stage Name:** `PAYMENT_COLLECTION` (Stage 10.0)
2. **Description:** Receipt of customer payment via UPI, Credit Card, NetBanking, or Razorpay Webhook confirmation.
3. **Entry Criteria:** Invoice exists in `unpaid` status with active Razorpay Order ID.
4. **Exit Criteria:** Payment signature verified using timing-safe HMAC (`safeEqual`), `billing_intents` replay check passed, and status marked `paid`.
5. **Responsible Role:** System Payment Gateway / `founder`
6. **Permissions Required:** `payments:verify`
7. **Automatic Notifications:** Payment receipt email & SMS sent to customer: *"Payment Received: ₹1,41,600 (Includes 18% GST). Thank you!"*.
8. **Automation Rules:** `rule_verify_payment_hmac` (Validates SHA-256 signature), `rule_activate_subscription_seats` (Increases tenant seat limit).
9. **AI Actions:** None.
10. **Reports Updated:** `Net Collected Revenue`, `Accounts Receivable (Cleared)`.
11. **Audit Logs Created:** `PAYMENT_SUCCESS` (Actor: SYSTEM, Target: Invoice ID, Metadata: `{ razorpay_payment_id, amount }`).
12. **SLA Rules:** Payment Processing & Activation SLA: **< 5 Seconds** post-callback.
13. **Escalation Rules:** If payment webhook fails HMAC verification, transaction logged as `SECURITY_ALERT` and IP throttled.
14. **Mobile Behaviour:** Inaccessible (Admin restricted).
15. **Web Behaviour:** Invoice status badge transitions from yellow `Unpaid` to green `Paid`; `BillingPage.tsx` updates active subscription validity dates.
16. **Failure Scenarios:** Payment replay attack (Attacker re-submits previously captured `razorpay_payment_id`).
17. **Recovery Process:** `billing_intents` table UNIQUE constraint blocks request with `409 Conflict` error; System flags fraud attempt.

---

### 11. SUPPORT STAGE

1. **Stage Name:** `POST_SALE_SUPPORT` (Stage 11.0)
2. **Description:** Onboarding assistance, feature queries, and technical support ticket resolution for active paying customers.
3. **Entry Criteria:** Active paying customer submits support query via in-app chat or email.
4. **Exit Criteria:** Ticket resolved to customer satisfaction; CSAT rating recorded.
5. **Responsible Role:** `sub_admin` / Customer Success Team
6. **Permissions Required:** `support:manage`, `tickets:resolve`
7. **Automatic Notifications:** Ticket acknowledgment notification sent to customer with ticket reference number.
8. **Automation Rules:** `rule_route_support_ticket` (Assigns ticket based on issue category: Billing, Technical, How-To).
9. **AI Actions:** `aiSupportBot` suggests instant self-help KB articles based on ticket description.
10. **Reports Updated:** `Customer Satisfaction (CSAT) Score`, `First Contact Resolution Rate`.
11. **Audit Logs Created:** `TICKET_RESOLVED` (Actor: Support Agent ID, Target: Ticket ID, Metadata: `{ resolution_time_minutes }`).
12. **SLA Rules:** First Response SLA: **< 15 Minutes**; Resolution SLA: **< 4 Hours**.
13. **Escalation Rules:** If SLA breached, ticket automatically escalates to `sub_admin` with HIGH priority tag.
14. **Mobile Behaviour:** Telecaller can view customer support tickets attached to lead profile.
15. **Web Behaviour:** Managed via `SupportPage.tsx` and `ChatInbox.tsx`.
16. **Failure Scenarios:** Un-resolved critical bug blocking customer sales operations.
17. **Recovery Process:** Ticket escalated directly to Engineering Lead; Customer assigned temporary workaround patch.

---

### 12. RENEWAL STAGE

1. **Stage Name:** `SUBSCRIPTION_RENEWAL` (Stage 12.0)
2. **Description:** Proactive account management to secure annual or monthly subscription contract renewal prior to expiration.
3. **Entry Criteria:** Active subscription validity remaining is **<= 30 Days**.
4. **Exit Criteria:** Renewal invoice paid (Validity extended) or Account churned (Moved to Account Paused state).
5. **Responsible Role:** `sub_admin` / `founder` / Account Manager
6. **Permissions Required:** `subscriptions:renew`, `billing:manage`
7. **Automatic Notifications:** Automated renewal reminders dispatched at T-30, T-15, T-7, and T-1 days prior to expiration.
8. **Automation Rules:** `rule_renewal_reminder_sequence` (Triggers WhatsApp & Email renewal links), `rule_lock_expired_account` (Locks non-paying account at T+0).
9. **AI Actions:** `aiChurnPredictor` analyzes 90-day usage trends (dials, logins) and alerts manager if account shows low usage warning.
10. **Reports Updated:** `Net Revenue Retention (NRR)`, `Subscription Renewal Rate (%)`.
11. **Audit Logs Created:** `RENEWAL_COMPLETED` (Actor: SYSTEM/FOUNDER, Target: Company ID, Metadata: `{ new_expiry_date }`).
12. **SLA Rules:** Renewal Confirmation SLA: **<= 7 Days prior to expiration**.
13. **Escalation Rules:** If account shows zero logins in 14 days prior to renewal, Founder conducts executive outreach call.
14. **Mobile Behaviour:** `SubscriptionLockScreen.tsx` displays warning banner if account is within 3 days of expiration.
15. **Web Behaviour:** `TrialBanner.tsx` / `SubscriptionStatusHeader.tsx` turns amber `Renew Soon` with one-click Razorpay payment button.
16. **Failure Scenarios:** Customer payment fails on recurring auto-debit.
17. **Recovery Process:** 3-day grace period granted (`AccountPausedPage.tsx`); Customer retries payment via alternative UPI/Card option.

---

### 13. REFERRAL STAGE

1. **Stage Name:** `CUSTOMER_REFERRAL` (Stage 13.0)
2. **Description:** Leveraging satisfied customer relationships to generate qualified warm referrals and peer recommendations.
3. **Entry Criteria:** Customer CSAT score >= 9/10 OR customer completes 6 months of active subscription.
4. **Exit Criteria:** Referral contact details captured; New lead record generated in Stage 1.0 with `source = 'Referral'`.
5. **Responsible Role:** `telecaller` / Account Manager
6. **Permissions Required:** `leads:create`
7. **Automatic Notifications:** Referral thank-you email sent to referring customer with ₹1,000 credit voucher payload.
8. **Automation Rules:** `rule_apply_referral_credit` (Applies discount credit to referring customer's next invoice upon referral win).
9. **AI Actions:** None.
10. **Reports Updated:** `Referral Revenue Velocity`, `Customer Advocacy Index`.
11. **Audit Logs Created:** `REFERRAL_LOGGED` (Actor: User ID, Target: Lead ID, Metadata: `{ referred_by_company_id }`).
12. **SLA Rules:** Referral Contact SLA: **< 2 Hours** (High-priority warm lead handling).
13. **Escalation Rules:** Referral leads bypass standard queue and route directly to Senior Sales Executive.
14. **Mobile Behaviour:** Telecaller taps "Log Referral" button on `HomeScreen.tsx`.
15. **Web Behaviour:** Referral tracking badge displayed in `LeadsPage.tsx` table under `Source` column.
16. **Failure Scenarios:** Duplicate referral entry.
17. **Recovery Process:** Deduplication engine links referral to existing record and notifies agent.

---

### 14. ARCHIVE STAGE

1. **Stage Name:** `ACCOUNT_ARCHIVE` (Stage 14.0)
2. **Description:** Safe cold-storage archiving or GDPR/DPDP compliant hard deletion of legacy lead records and inactive accounts.
3. **Entry Criteria:** Lead inactive for > 365 days OR customer submits explicit account deletion request under DPDP Act.
4. **Exit Criteria:** Lead record moved to `is_deleted = true` (Soft Archive) OR hard purged via `purge-user-data` Edge Function.
5. **Responsible Role:** `founder` / `sub_admin`
6. **Permissions Required:** `leads:delete`, `admin:purge`
7. **Automatic Notifications:** System confirmation email sent to Founder: *"DPDP Erasure Executed for Company ID: xxx"*.
8. **Automation Rules:** `rule_dpdp_purge_executor` (Executes `purge-user-data` Deno Edge Function).
9. **AI Actions:** None.
10. **Reports Updated:** `Database Storage Utilization (`CleanupWidget.tsx`)`, `Active Data Footprint`.
11. **Audit Logs Created:** `DATA_PURGED` (Actor: Admin ID, Target: User/Company ID, Metadata: `{ deleted_leads, deleted_calls }`).
12. **SLA Rules:** DPDP Erasure SLA: **< 30 Days** from formal request submission.
13. **Escalation Rules:** None.
14. **Mobile Behaviour:** Soft-deleted leads hidden from telecaller views.
15. **Web Behaviour:** Admin can view storage consumption in `CleanupWidget.tsx` and execute bulk cleanup.
16. **Failure Scenarios:** Accidental purging of active customer data.
17. **Recovery Process:** Soft-deleted records recoverable from database within 30-day window (`is_deleted = false`); Hard purges are irreversible (by design).

---

### 15. LOST LEAD STAGE (BONUS RECOVERY STAGE)

1. **Stage Name:** `DEAL_CLOSED_LOST` (Stage 15.0)
2. **Description:** Structured cataloging and root-cause analysis of dropped prospects who declined purchase.
3. **Entry Criteria:** Customer explicitly declines proposal; Status updated to `Rejected`, `Not Interested`, or `Lost`.
4. **Exit Criteria:** Mandatory `lost_reason` selected (Price, Competitor, Feature Gap, No Budget, Unresponsive) and lead archived.
5. **Responsible Role:** `telecaller` / `team_lead`
6. **Permissions Required:** `leads:update`
7. **Automatic Notifications:** None.
8. **Automation Rules:** `rule_schedule_winback_drip` (Queues 90-day re-engagement WhatsApp drip in `scheduled_messages`).
9. **AI Actions:** AI analyzes lost notes to detect recurring competitor mentions (e.g., "Switched to Zoho").
10. **Reports Updated:** `Churn Reason Analytics View (`get_detailed_churn` RPC)`, `Win/Loss Ratio`.
11. **Audit Logs Created:** `DEAL_LOST` (Actor: Agent ID, Target: Lead ID, Metadata: `{ lost_reason, competitor_name }`).
12. **SLA Rules:** Reason Logging SLA: **Immediate upon status change**.
13. **Escalation Rules:** If deal value > ₹5,000,000 marked `Lost`, Floor Manager receives automated audit alert.
14. **Mobile Behaviour:** `PostCallFeedbackSheet.tsx` enforces `lost_reason` dropdown selection before allowing form save.
15. **Web Behaviour:** Lead card turns muted gray (`bg-gray-100`) and moves to `Lost` column on Kanban board.
16. **Failure Scenarios:** Agent selects generic "Other" reason without adding explanatory note.
17. **Recovery Process:** Form validation requires minimum 10-character note if `lost_reason == 'Other'`.

---

## ━━ SUMMARY MATRIX TABLE ━━

| Stage | Responsible Role | Key SLA | Primary AI / Automation Action | Primary Report Updated |
| :--- | :--- | :--- | :--- | :--- |
| **1. Lead Created** | System / Admin | < 30s | Header Auto-Mapper (`aiMapper`) | Lead Source Yield |
| **2. Assignment** | Router / Manager | < 15m | Auto Round-Robin & Skill Match | Speed-to-Lead (TAT) |
| **3. First Call** | Telecaller | < 2m | Gemini AI Call Summarizer | Hourly Call Density |
| **4. Follow-up** | Telecaller | ±15m | Local Push Alert Queue | Overdue Callbacks Index |
| **5. Meeting** | Sales Exec | 24h Update| Auto Calendar Invite Dispatch | Demo Conversion Funnel |
| **6. Quotation** | Team Lead / Admin| < 4h | AI Proposal Summary Writer | Gross Revenue Pipeline |
| **7. Negotiation** | Floor Manager | < 5 Days | AI Objection Battlecards | Discount Variance Report |
| **8. Won** | Telecaller / Admin| < 1m | Leaderboard Score Calculation | Converted Funnel Count |
| **9. Invoice** | Billing Engine | < 10s | Auto GST Calculation (18%) | Accounts Receivable |
| **10. Payment** | Gateway / System | < 5s | HMAC Signature Verification | Net Collected Revenue |
| **11. Support** | Support Team | < 15m | AI Support Bot Self-Help | CSAT Score Analytics |
| **12. Renewal** | Account Manager | T-7 Days | AI Churn Risk Predictor | Net Revenue Retention |
| **13. Referral** | Telecaller / Exec | < 2h | Automated Voucher Issuance | Referral Revenue Velocity|
| **14. Archive** | Founder / System | < 30 Days | DPDP Right to be Forgotten Purge| Storage Footprint Widget|
| **15. Lost Lead** | Telecaller | Immediate| 90-Day Win-Back Queueing | Churn Reason Analytics |

---

**Architectural Statement:** This Business Process Matrix serves as the authoritative blueprint for CallMind CRM's business logic, multi-tenant state transitions, and compliance workflows. It provides enterprise-grade operational rigor matching global CRM benchmarks.
