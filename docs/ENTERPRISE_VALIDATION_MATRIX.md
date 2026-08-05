# CALLMIND CRM — ENTERPRISE VALIDATION MATRIX (EVM)

**Author:** Principal Enterprise Solution Architect & CTO  
**Date:** July 31, 2026  
**Target System:** CallMind Multi-Tenant AI CRM Monorepo  
**Compliance & Design Standard:** Enterprise Class (Salesforce Financial Services / SAP S/4HANA / Microsoft Dynamics 365 Architecture)

---

## ━━ EXECUTIVE VALIDATION ARCHITECTURE ━━

The **Enterprise Validation Matrix (EVM)** defines the deterministic, zero-trust validation rules, field constraints, permission gates, error handling routines, and automated recovery protocols across CallMind CRM. It guarantees that developers have explicit, non-ambiguous validation logic for every module, eliminating runtime guessing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ZERO-TRUST VALIDATION PIPELINE                        │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│ 1. FORMAT   │ 2. SANITIZE │ 3. SECURITY │ 4. RBAC     │ 5. BUSINESS LOGIC   │
│ Validation  │ & Cleanse   │ & Dup Check │ Permission  │ Approval & Recovery │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
```

---

## ━━ 1. LEAD CREATION & INGESTION VALIDATION ━━

### Core Rules & Constraints

| Field / Check | Type / Format | Validation Constraint | Error Code | Recovery Action |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Name** | `String` | Required. Min length 2, Max 100. Strips HTML/Script tags. | `ERR_NAME_INVALID` | Prompt user to supply valid name string. |
| **Mobile Number** | `String` | Required. Must normalize to E.164 (`+91XXXXXXXXXX`). 10-digit Indian mobile range `[6-9]XXXXXXXXX`. | `ERR_PHONE_FORMAT` | Strip spaces/dashes; reject if digits < 10 or invalid prefix. |
| **Email Address** | `String (Optional)`| RFC 5322 Regex compliance. | `ERR_EMAIL_INVALID` | Flag email as invalid; allow lead creation with phone only. |
| **Country Code** | `String` | Default `IN` (`+91`). If missing, prepend `+91`. | `ERR_COUNTRY_CODE` | Prepend `+91` automatically before DB insert. |
| **Duplicate Check** | `Database Query` | Lookup `(company_id, phone)` within 24-hour window. | `ERR_DUPLICATE_FOUND` | Intercept ➔ Execute Merge / Cooldown logic. |
| **Blacklist Check** | `Array Lookup` | Check against tenant `blacklisted_numbers` table. | `ERR_NUMBER_BLACKLISTED` | Reject lead insertion; log to `audit_logs`. |
| **Spam Detection** | `Rate Limit` | > 10 leads from same IP in 60s ➔ Flag as bot spam. | `ERR_SPAM_DETECTED` | Block request; trigger CAPTCHA challenge. |

### Duplicate Resolution Logic
```
[Inbound Lead Payload] ──► [E.164 Phone Normalization]
                                      │
                                      ▼
                        [Query: company_id + phone]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼ (Duplicate Exists)                          ▼ (New Number)
      [Check Cooldown Window (7 Days)]                 [Insert Lead (status='New')]
     ├── Inside Cooldown  ──► Merge Comments & Update
     └── Outside Cooldown ──► Re-open Lead as Unseen
```

### Role-Based Action Matrix

| Role | Single Lead Create | Bulk CSV Import | Webhook Intake | Lead Hard Delete |
| :--- | :--- | :--- | :--- | :--- |
| **`founder`** | ✔ Allowed | ✔ Allowed | ✔ System Managed | ✔ Allowed |
| **`sub_admin`** | ✔ Allowed | ✔ Allowed | ✔ System Managed | ✔ Allowed |
| **`floor_manager`** | ✔ Allowed | ❌ Blocked | ❌ System Managed | ❌ Blocked |
| **`team_lead`** | ✔ Allowed | ❌ Blocked | ❌ System Managed | ❌ Blocked |
| **`telecaller`** | ✔ Allowed (Quick Create) | ❌ Blocked | ❌ System Managed | ❌ Blocked |

---

## ━━ 2. LEAD ASSIGNMENT & ROTATION VALIDATION ━━

### Pre-Assignment Eligibility Gates

| Check Item | Validation Rule | Pass Condition | Failure Action |
| :--- | :--- | :--- | :--- |
| **Agent Role** | Target user must be `telecaller`, `team_lead`, or `floor_manager`. | `role IN ('telecaller', 'team_lead', 'floor_manager')` | Exclude agent from rotation. |
| **Agent Status** | Target user must be active in `agent_status`. | `agent_status.status = 'online'` | Skip to next agent in queue. |
| **Shift Clock-In** | Agent must have verified GPS/Selfie clock-in today. | `clock_in_time >= CURRENT_DATE AND clock_out_time IS NULL` | Skip agent; notify Team Lead. |
| **Daily Capacity** | Assigned calls today must not exceed SIM daily limit. | `calls_today < daily_call_limit` (Default: 200) | Mark agent capacity full. |
| **Branch / City Match**| If company enforces city routing, lead city must match agent city. | `lead.city = agent.assigned_city` OR `agent.city = 'ALL'` | Fallback to default pool. |
| **Skill Match** | Match lead custom tags to agent specialized skills. | `lead.custom_data.tags ∩ agent.skills ≠ ∅` | Rotate within fallback agents. |

---

## ━━ 3. INVOICE & GST TAX VALIDATION ━━

### Financial & Tax Calculation Rules

```
Subtotal Amount (Excluding Tax) = Sum(Line Items) - Allowed Discount
IF Customer State == Company State (Intra-state):
   CGST (9%) = Subtotal * 0.09
   SGST (9%) = Subtotal * 0.09
   IGST (0%) = 0.00
ELSE (Inter-state):
   CGST (0%) = 0.00
   SGST (0%) = 0.00
   IGST (18%) = Subtotal * 0.18

Total Invoice Amount = Subtotal + CGST + SGST + IGST (Rounded to Nearest ₹1.00)
```

### Validation Bounds

| Field / Rule | Constraint | Approval Gate | Error Code |
| :--- | :--- | :--- | :--- |
| **GSTIN Format** | Must match Indian GSTIN regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` | None | `ERR_INVALID_GSTIN` |
| **PAN Number** | Extracted from 3rd to 10th char of GSTIN (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) | None | `ERR_INVALID_PAN` |
| **Max Discount %** | Discount <= 15% ➔ Auto-approved.<br>Discount > 15% ➔ Requires Founder signature. | `founder` Role Signature required | `ERR_DISCOUNT_EXCEEDED` |
| **Invoice Currency**| Hard-coded to `INR` (`₹`). | None | `ERR_CURRENCY_MISMATCH` |
| **Rounding Rule** | Standard Half-Up rounding to nearest integer INR. | None | N/A |

---

## ━━ 4. PAYMENT & WEBHOOK VALIDATION ━━

### Security & Replay Attack Defense

```
[Inbound Razorpay Webhook Payload]
                 │
                 ▼
[Verify Header: x-razorpay-signature]
                 │
                 ▼
[Crypto HMAC SHA-256 Verification (`safeEqual`)]
                 ├── Signature Mismatch ──► HTTP 400 Bad Request & Security Alert
                 └── Signature Valid ────► [Lookup payment_id in `billing_intents`]
                                                         │
                                      ┌──────────────────┴──────────────────┐
                                      ▼ (ID Exists in DB)                   ▼ (New Payment ID)
                             [HTTP 409 Conflict: Replay]          [Insert ID into `billing_intents`]
                                                                  [Update Subscription Seats]
```

### Validation Constraints

| Check Item | Validation Constraint | Error Response | Action |
| :--- | :--- | :--- | :--- |
| **HMAC Signature** | `crypto.timingSafeEqual(calculatedBuf, headerBuf)` | `400 Bad Request` | Drop connection; log IP to `security_logs`. |
| **Replay Attack** | `razorpay_payment_id` MUST BE UNIQUE in `billing_intents`. | `409 Conflict` | Ignore duplicate webhook dispatch safely. |
| **Order Amount Match**| `payment.amount == order.amount_due` (in paise). | `422 Unprocessable` | Hold payment in escrow; alert `founder`. |
| **Partial Payment** | Partial payments disabled unless explicit plan installment flag is true. | `400 Bad Request` | Reject partial payment; prompt full amount. |
| **Refund Request** | Refunds strictly processed by `founder` role via Razorpay API. | `403 Forbidden` | Block non-founder refund attempts. |

---

## ━━ 5. MEETING & SCHEDULING VALIDATION ━━

### Scheduling Constraint Rules

| Constraint | Rule | Failure Action | Error Message |
| :--- | :--- | :--- | :--- |
| **Past Date** | `meeting_time > NOW()` | Reject creation | *"Cannot schedule a meeting in the past."* |
| **Double Booking** | `agent_id` has no conflicting meeting within `[start_time, end_time]` window. | Block slot | *"Agent is already booked for a demo at this time."* |
| **Timezone Standard**| All timestamps normalized to UTC in DB; converted to `Asia/Kolkata` (IST) on client. | Auto-convert | N/A |
| **Reminder Trigger** | Local push alert + WhatsApp reminder scheduled at `meeting_time - 10 minutes`. | Queue task | N/A |
| **Calendar Sync** | Google/Outlook `.ics` invite dispatched to prospect email. | Retry background | Log calendar sync retry. |

---

## ━━ 6. CALL & POST-CALL DISPOSITION VALIDATION ━━

### Telephony State & Feedback Rules

| Item | Validation Rule | Failure State | Recovery Action |
| :--- | :--- | :--- | :--- |
| **Dialer Intent** | Mobile app launches `tel:number` intent via native Android CallManager. | Dialer fail | Fallback to secondary SIM slot. |
| **Duration Capture** | Call duration logged in seconds (`duration >= 0`). | Negative duration | Normalize to `0` seconds. |
| **Outcome Selection**| Mandatory selection: `connected`, `busy`, `no_answer`, `invalid`, `voicemail`. | Blank selection | Block feedback sheet submission. |
| **Voice Note Limit** | Dictation length capped at 5 minutes audio / 2000 characters text. | Over limit | Truncate text; inform agent. |
| **Lost Reason Rule** | If outcome/status set to `Lost`/`Rejected`, `lost_reason` dropdown IS MANDATORY. | Missing reason | Highlight dropdown in red; block submit. |

---

## ━━ 7. AUTOMATION ENGINE VALIDATION ━━

### Trigger-Condition-Action Validation

```
[Event Trigger (e.g. status_changed)] ──► [Evaluate JSON Conditions (AND/OR)]
                                                          │
                                       ┌──────────────────┴──────────────────┐
                                       ▼ (Conditions Pass)                   ▼ (Conditions Fail)
                            [Execute Actions Array]                   [Log Event Ignored]
```

| Validation Check | Rule | Error Action |
| :--- | :--- | :--- |
| **Max Rules Limit** | Company automation rules count <= `max_automation_rules` (Plan cap). | Reject rule creation; prompt upgrade. |
| **Infinite Loop Guard**| Rule cannot trigger an event that directly re-triggers itself. | Block execution cycle; alert Admin. |
| **Template Validation**| WhatsApp Meta template must be in `APPROVED` status before sending. | Fallback to standard SMS/Email. |

---

## ━━ 8. COMPLIANCE & DATA PURGE VALIDATION ━━

### DPDP Act / GDPR Right to be Forgotten

| Stage | Action | Validation Requirement | Audit Entry |
| :--- | :--- | :--- | :--- |
| **1. Verification** | User requests deletion | Must verify user identity via OTP + `founder` approval signature. | `PURGE_REQUESTED` |
| **2. Dependency Check**| Check pending billing | Company cannot be purged if unpaid invoices exist. | `PURGE_BLOCKED_UNPAID` |
| **3. Hard Erasure** | Delete `leads`, `calls` | Execute `purge-user-data` Deno Edge Function in transaction. | `PURGE_EXECUTED` |
| **4. Anonymization** | Anonymize `users` | Update email to `purged-{id}@deleted.callmind`, clear phone number. | `USER_ANONYMIZED` |

---

## ━━ SUMMARY MATRIX: MODULE ERROR RECOVERY PROTOCOLS ━━

| Module | Primary Failure | Fallback Strategy | Alert Target |
| :--- | :--- | :--- | :--- |
| **Lead Ingestion** | Vendor API Timeout | Retry cron loop with exponential backoff (1m, 5m, 15m). | `system_errors` Table |
| **Round-Robin** | No Agents Online | Lead placed in `Unassigned Pool`; reassigned on first agent clock-in. | `floor_manager` Push Alert |
| **AI Generation** | Gemini Rate Limit | Auto-rotate to secondary API key in `aiRouter.ts` pool. | Silent Server Log |
| **Razorpay Payment** | Signature Mismatch | Immediate request rejection; client redirected to retry page. | Security Log & `founder` Email |
| **Offline Sync** | Network Disconnect | Persist call log to mobile `AsyncStorage` (`@callmind_unsynced_calls`). | Mobile Offline Banner |

---

**CTO Validation Approval:** This Enterprise Validation Matrix is fully approved as the technical specification for all backend validation middleware, database constraints, React Hook Form schemas, and mobile input guards.
