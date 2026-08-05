# CallMind Production Launch & Top 10 CRM Readiness Checklist

Master verification checklist before deploying CallMind to production in the Indian market.

---

## ━━ 1. DATABASE & SECURITY READINESS ━━
- [x] **RLS Multi-Tenant Verification:** Confirmed 100% tenant data isolation across all tables.
- [x] **Index Performance:** Verified indexes exist on `company_id`, `assigned_to`, `status`, `phone`, and `created_at`.
- [x] **PgBouncer Pooling:** Configured Supabase connection pooler for 10,000+ concurrent mobile app connections.
- [x] **Secrets Management:** Ensured `COOKIE_SECRET`, `CSRF_SECRET`, and `RAZORPAY_KEY_SECRET` are enforced in production `.env`.

---

## ━━ 2. MOBILE APP & TELECOMMUNICATION READINESS ━━
- [x] **Dual SIM Handling:** Validated SIM Slot 1 and SIM Slot 2 selection logic on Android 10+.
- [x] **Offline Queueing:** Verified call logs recorded offline sync automatically upon network reconnection.
- [x] **Google Play Compliance:** Prepared Play Store declaration form justifying `CALL_LOG` permission as core CRM necessity.
- [x] **Admin App Blocker:** Confirmed `founder` and `sub_admin` accounts are blocked from logging into the mobile app.

---

## ━━ 3. INTEGRATIONS & PAYMENTS READINESS ━━
- [x] **Razorpay Webhook Replay Guard:** Verified `billing_intents` prevents double processing of payment events.
- [x] **GST Invoice Generation:** Validated CGST (9%) + SGST (9%) vs IGST (18%) tax calculations and PDF generation.
- [x] **IndiaMART & Lead Webhooks:** Confirmed polling cron resilience and E.164 phone sanitization.

---

## ━━ 4. PERFORMANCE & COMPLIANCE READINESS ━━
- [x] **AI Guardrail Pipeline:** Confirmed 6-layer anti-jailbreak and SQLi filter on all Gemini API calls.
- [x] **DPDP Act Compliance:** Verified `purge-user-data` Edge Function completely erases PII on account deletion request.
- [x] **SEO Pre-rendering:** Generated static HTML files for marketing landing pages to maximize organic search rankings.
