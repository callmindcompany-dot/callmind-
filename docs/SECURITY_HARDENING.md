# CALLMIND CRM — SECURITY HARDENING ARCHITECTURE (`SECURITY_HARDENING.md`)

**Author:** Chief Information Security Officer (CISO) & CTO  
**Date:** July 31, 2026  
**Target System:** CallMind Monorepo (Web, Mobile, Express, Supabase DB)  
**Security Standard:** OWASP Top 10 Enterprise Hardening Compliance

---

## ━━ 1. DEFENSE-IN-DEPTH SECURITY MATRIX ━━

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FIVE-LAYER SECURITY PIPELINE                      │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ 1. TRANSPORT │ 2. WEB APP   │ 3. API & SEC │ 4. RLS DB    │ 5. DATA PII │
│ SSL/TLS 1.3  │ Helmet CSP   │ Double CSRF  │ Tenant Isolation│ E.164 Mask │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

---

## ━━ 2. CORE SECURITY PROTOCOLS ━━

1. **Multi-Tenant Isolation (RLS):** Supabase Row-Level Security functions (`get_my_company_id()`) enforce strict tenant data boundaries across all 19 database tables.
2. **Timing-Safe HMAC Verification:** Payment webhooks verified using `crypto.timingSafeEqual()` in `src/routes/payments.ts` to neutralize side-channel timing attacks.
3. **Double-Submit Cookie CSRF:** Express server enforces `csrf-csrf` middleware on all state-changing REST routes.
4. **Content Security Policy (CSP):** Helmet HTTP security headers configured with script/style nonce restrictions in `server.ts`.
5. **Prompt Injection Guardrails:** 6-layer input filter (`aiGuardrail.ts`) scrubs prompt injection, system prompt extraction, and SQLi attempts prior to calling Gemini APIs.
6. **Replay Attack Defense:** `billing_intents` table enforces `UNIQUE(razorpay_payment_id)` constraint, preventing duplicate payment webhook processing.
7. **SaaS Provider Founder Hub Perimeter:** `FounderHub` (`/founder-hub`) is strictly restricted to the **SaaS Platform Owner Company (Founders & Co-Founders)** via `hasFounderHubAccess` (`isSuperFounder = true`). All client tenant admins, founders, and users are strictly blocked.

---

**CTO Approval:** Security Hardening Architecture certified for production deployment.
