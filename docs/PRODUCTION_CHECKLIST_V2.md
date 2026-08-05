# CALLMIND CRM — PRODUCTION CHECKLIST V2 (PCv2)

**Author:** Principal DevOps & Infrastructure Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Production Deployment Pipeline (Vite Web + Node.js Server + Expo Android APK + Supabase DB)

---

## ━━ EXECUTIVE PRODUCTION CHECKLIST ━━

The **Production Checklist V2 (PCv2)** defines the pre-flight verification items across Environment Secrets, Database Migration, Security Hardening, Mobile Release, and Billing Integrity before declaring CallMind CRM live for Indian commercial customers.

---

## ━━ 1. PRE-FLIGHT DEPLOYMENT CHECKLIST ━━

| Category | Verification Item | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Secrets Hardening**| `COOKIE_SECRET` and `CSRF_SECRET` > 32 chars in `.env` | ✅ PASSED | Boot time strict assertion in `server.ts` |
| **Service Role Scope**| `SUPABASE_SERVICE_ROLE_KEY` excluded from Vite client bundle | ✅ PASSED | Inspection of `vite.config.ts` bundle map |
| **Database RLS** | RLS enabled on all 19 PostgreSQL tables | ✅ PASSED | Supabase Security Advisor scan |
| **Database Indexing**| GIN index on `leads.custom_data`, composite index on `leads(company_id, phone)` | ✅ PASSED | Query plan inspection (`EXPLAIN ANALYZE`) |
| **Razorpay Verification**| HMAC SHA-256 payment signature & `billing_intents` replay defense verified | ✅ PASSED | Payment simulation test suite |
| **Mobile Android** | Google Play Store `READ_CALL_LOG` permission declaration accepted | ✅ PASSED | Play Console Release dashboard |
| **AI Multi-Key** | 3 Gemini API keys configured in round-robin rotation pool | ✅ PASSED | `aiRouter.ts` key pool health check |
| **DPDP Compliance** | Hard erasure function `purge-user-data` operational | ✅ PASSED | Deno Edge Function execution test |

---

**CTO Final Sign-Off:** CallMind CRM is 100% certified and ready for Production Deployment in the Indian B2B/B2C Enterprise Market.
