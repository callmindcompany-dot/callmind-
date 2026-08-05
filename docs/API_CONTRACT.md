# CALLMIND CRM — MASTER API CONTRACT SPECIFICATION (`API_CONTRACT.md`)

**Author:** Principal API Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Express.js REST Backend (`server.ts`) & Supabase Deno Edge Functions

---

## ━━ 1. REST & EDGE API ENDPOINT REGISTRY ━━

| Category | Endpoint | Method | Auth | Body Schema (Zod) | Success Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/trial/status` | `GET` | Bearer JWT | None | `{ isTrial: true, daysLeft: 7 }` |
| **Leads** | `/v1/webhooks/incoming/:companyId`| `POST` | Webhook Secret| `{ name, phone, source }` | `{ success: true, lead_id }` |
| **Leads** | `/v1/routing/auto-assign` | `POST` | Bearer JWT | `{ lead_id }` | `{ assigned_to: "user-id" }` |
| **AI Router**| `/api/ai/generate` | `POST` | Bearer JWT | `{ type, raw_notes }` | `{ summary, suggested_status }`|
| **Payments**| `/api/payments/create-order` | `POST` | Bearer JWT (`founder`)| `{ planId, seats }` | `{ order_id, amount }` |
| **Payments**| `/api/payments/verify` | `POST` | Bearer JWT (`founder`)| `{ razorpay_payment_id, signature }`| `{ success: true, invoice_url }`|

---

## ━━ 2. SECURITY & ERROR CODE STANDARDS ━━

- **401 Unauthorized:** Invalid or expired Supabase JWT token.
- **403 Forbidden:** User role lacks required permission scope.
- **409 Conflict:** Duplicate webhook payment replay attempt (`billing_intents`).
- **429 Too Many Requests:** IP rate limit exceeded (Max 100 req/min).

---

**CTO Approval:** API Contracts locked for Web & Mobile SDK consumption.
