# CALLMIND CRM — PAYMENT INTEGRATION MODULE (`PAYMENT_MODULE.md`)

> **Status:** Built
> **Implemented in:** `src/routes/payments.ts`, `src/config/pricing.ts`, `supabase/migrations/20260706_billing.sql`, `supabase/migrations/20260802000000_plan_columns_consolidation.sql`
> **Last verified:** 2026-08-01

**Author:** Principal Payment Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Razorpay REST API & Webhook Handler (`src/routes/payments.ts`)


---

## ━━ 1. PAYMENT FLOW & REPLAY PROTECTION ━━

```
[Customer Pays via UPI / Card] ──► [Razorpay Webhook Callback]
                                            │
                                            ▼
                    [HMAC SHA-256 Signature Verification]
                                            │
                                            ▼
                     [Check `billing_intents` Payment ID]
                     ├── Duplicate ID ──► HTTP 409 Conflict (Replay Blocked)
                     └── New Payment ───► Mark Invoice Paid & Update Seats
```

---

**CTO Approval:** Payment Module specification approved.
