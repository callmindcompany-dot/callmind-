# CallMind API Reference Manual

Complete API specifications for the CallMind Express.js REST Server and Supabase Deno Edge Functions.

---

## ━━ 1. AUTHENTICATION & HEADERS ━━

### Standard Headers
All requests to protected endpoints require:
```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
Content-Type: application/json
x-csrf-token: <CSRF_TOKEN_HEADER> (For non-GET mutating Express routes)
```

---

## ━━ 2. EXPRESS.JS REST ENDPOINTS ━━

Base Path: `/v1` or `/api`

### A. Authentication & Trial Management (`/api/auth`, `/api/trial`)
* `GET /api/trial/status`
  * **Headers:** `Authorization: Bearer <JWT>`
  * **Response:** `{ success: true, isTrial: true, daysRemaining: 5, seatsLimit: 4, leadsLimit: 1000 }`
* `POST /api/trial/start`
  * **Description:** Triggers 7-day free trial initialization upon user onboarding.
  * **Body:** `{ companyName: "Acme Corp", industry: "Real Estate" }`
  * **Response:** `{ success: true, plan: "trial", expiresAt: "2026-08-07T00:00:00Z" }`
* `GET /api/auth/impersonate-login`
  * **Description:** Allows Super Admin to securely impersonate a tenant.
  * **Query:** `?company_id=<UUID>`
  * **Response:** Sets `HttpOnly, Secure, SameSite=Strict` session cookie.

### B. Lead Management & Webhooks (`/v1`)
* `POST /v1/webhooks/incoming/:companyId`
  * **Description:** Universal inbound lead webhook for custom site forms, IndiaMART, and Meta Lead Ads.
  * **Headers:** `Content-Type: application/json` or `X-Hub-Signature-256`
  * **Body:** `{ name: "Rahul Sharma", phone: "+919876543210", email: "rahul@example.com", source: "Website" }`
  * **Response:** `{ success: true, lead_id: "uuid", assigned_to: "agent_uuid" }`
* `POST /v1/routing/auto-assign`
  * **Description:** Triggers Round-Robin assignment logic for unassigned leads.
  * **Body:** `{ lead_id: "<UUID>", company_id: "<UUID>" }`
  * **Response:** `{ success: true, assigned_agent: "<UUID>", agent_name: "Priya Singh" }`

### C. Artificial Intelligence & Guardrails (`/api/ai`)
* `POST /api/ai/generate`
  * **Limiter:** 100 requests / hour / IP.
  * **Body:** 
    ```json
    {
      "type": "call_summary",
      "raw_notes": "Client interested in Pro plan, needs demo on Friday 3 PM",
      "lead_context": { "name": "Vikram Patel", "company": "Patel Traders" }
    }
    ```
  * **Response:** 
    ```json
    {
      "success": true,
      "summary": "Prospect requested Pro plan demo for Friday at 3:00 PM.",
      "suggested_status": "Interested",
      "next_action": "Schedule Demo"
    }
    ```

### D. Billing & Razorpay Payments (`/api/payments`, `/v1/webhooks/razorpay`)
* `POST /api/payments/create-order`
  * **Body:** `{ planId: "growth", seats: 10, isAnnual: true }`
  * **Response:** `{ order_id: "order_Kj98xLk1", amount: 958800, currency: "INR", key_id: "rzp_live_xxx" }`
* `POST /api/payments/verify`
  * **Body:** 
    ```json
    {
      "razorpay_order_id": "order_Kj98xLk1",
      "razorpay_payment_id": "pay_Kj99MmM2",
      "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
    ```
  * **Response:** `{ success: true, invoice_url: "https://.../invoice-1002.pdf" }`
* `POST /v1/webhooks/razorpay`
  * **Description:** Asynchronous webhook handler for Razorpay payment captured/failed events. Validates raw body HMAC signature.

---

## ━━ 3. SUPABASE EDGE FUNCTIONS (DENO) ━━

Hosted at: `https://[SUPABASE_PROJECT_REF].supabase.co/functions/v1/`

| Edge Function | Purpose | Input / Trigger | Output |
| :--- | :--- | :--- | :--- |
| `indiamart-poll` | Polls IndiaMART CRM API for new leads | Cron schedule (Every 10m) | Inserts new leads into `leads` table |
| `justdial-poll` | Polls JustDial API lead feed | Cron schedule (Every 10m) | Inserts new leads into `leads` table |
| `tradeindia-poll` | Polls TradeIndia leads | Cron schedule (Every 10m) | Inserts new leads into `leads` table |
| `send-whatsapp-message` | Sends WhatsApp Business API template | HTTP POST / Automation Engine | `{ status: "queued", message_id: "wamid..." }` |
| `send-email` | Sends transactional email via SMTP | HTTP POST / Automation Engine | `{ status: "sent", message_id: "..." }` |
| `execute-automation-rules`| Evaluates no-code triggers on lead mutation | DB Webhook on `leads` | Triggers downstream actions |
| `purge-user-data` | Hard deletes company data for compliance | HTTP POST (Super Admin) | `{ deleted_leads: 1420, deleted_calls: 5800 }` |

---

## ━━ 4. RATE LIMITING & SECURITY ━━

1. **AI Rate Limiter:** 100 requests per 60 minutes per IP.
2. **Admin Endpoint Limiter:** 50 attempts per 15 minutes per IP.
3. **Double CSRF:** All mutating Express endpoints validate double-submit cookies.
4. **Helmet CSP:** Restricts script execution strictly to verified origins (`razorpay.com`, self).
