# CALLMIND CRM — PRODUCTION CHECKLIST V2 (PCv2)

**Author:** DevOps & Infrastructure  
**Target System:** Production Deployment Pipeline (`server.ts`, `vite.config.ts`, `supabase/migrations/`)

---

## ━━ EXECUTIVE PRODUCTION CHECKLIST ━━

The **Production Checklist V2 (PCv2)** defines the verification criteria across Environment Secrets, Database Migration, Security Hardening, Mobile Release, and Billing Integrity for CallMind CRM.

---

## ━━ 1. PRE-FLIGHT DEPLOYMENT CHECKLIST ━━

| Category | Verification Item | Verification Method |
| :--- | :--- | :--- |
| **Secrets Hardening** | `COOKIE_SECRET` and `CSRF_SECRET` in `.env` | Boot time assertion in `server.ts` |
| **Service Role Scope** | `SUPABASE_SERVICE_ROLE_KEY` excluded from client bundle | Verification in `vite.config.ts` |
| **Database RLS** | RLS enabled on PostgreSQL tables | Enforced by migrations in `supabase/migrations/` |
| **Database Indexing** | Performance indexes on `leads` table | Defined in `supabase/migrations/` |
| **Razorpay Verification** | HMAC SHA-256 payment signature & `billing_intents` replay defense | Implemented in `src/routes/payments.ts` |
| **Mobile Android** | Google Play Store call log permissions | Declared in `mobile/app.json` |
| **AI Multi-Key** | Gemini API key pool routing | Configured in `src/lib/aiRouter.ts` |
| **DPDP Compliance** | Data erasure handler | Implemented in `supabase/functions/` |

---
