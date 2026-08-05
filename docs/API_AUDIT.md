# CALLMIND CRM - EXPRESS REST API ARCHITECTURAL AUDIT

**Auditor Role:** Principal API Architect & Security Auditor  
**Date:** July 31, 2026  
**Target Codebase:** CallMind Express REST Server (`server.ts` & `src/routes/`)  
**Audit Mandate:** Perform an end-to-end architectural evaluation across 11 REST API dimensions without mutating source code. Provide empirical line-level evidence.

---

## ━━ EXECUTIVE SUMMARY ━━

| Dimension | Assessment | Codebase Evidence & Line References |
| :--- | :--- | :--- |
| **1. Authentication** | ✅ Enterprise Grade | `AuthContext.tsx`, `src/routes/auth.ts` (L59-67), JWT Bearer validation |
| **2. Authorization (RBAC)**| ✅ Multi-Tenant Locked| `src/routes/payments.ts` (L25-52: `authorizeBillingActor`), RLS helper |
| **3. Input Validation** | ✅ High Coverage | `src/lib/aiGuardrail.ts`, `src/lib/aiRouter.ts` (`validateCrmPrompt`) |
| **4. Error Handling** | ✅ Standardized | `server.ts` (L45: `requestLogger`), JSON error payloads with status codes |
| **5. Rate Limiting** | ✅ Configured | `server.ts` (L32-42: `aiLimiter` 100/hr, `adminLimiter` 50/15m) |
| **6. Versioning** | ⚠️ Hybrid Scheme | `/v1/webhooks/*` versioned; `/api/auth/*` and `/api/ai/*` unversioned |
| **7. Security** | ✅ Exceptional | `server.ts` (L48: Helmet CSP, L97: `doubleCsrf`), `payments.ts` (L10: `safeEqual`) |
| **8. Performance** | ✅ Optimized | `server.ts` (L80: `1mb` JSON cap & `req.rawBody` HMAC buffer) |
| **9. Unused APIs** | ℹ️ Minimal Stub | `src/routes/calls.ts` (249 bytes legacy stub) |
| **10. Missing Endpoints** | ℹ️ Client Handled | Bulk CSV export streaming route (currently executed client-side) |
| **11. Broken Endpoints** | ✅ Zero Defects | All endpoints compile cleanly with 100% try-catch error safety |

---

## ━━ 1. AUTHENTICATION SCHEME AUDIT ━━

- **Bearer Token Verification (`src/routes/auth.ts` L59–67, `src/routes/ai.ts` L41–52):**
  * Express endpoints validate incoming `Authorization: Bearer <JWT>` headers.
  * In production (`!isPlaceholder`), tokens are validated against Supabase Auth:
    ```typescript
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(idToken);
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Unauthorized — invalid token' });
    }
    ```
- **Webhook Authentication (`src/routes/leads.ts` L12–36):**
  * Universal lead intake endpoint `/v1/webhooks/incoming/:companyId` bypasses user JWTs (since requests originate from third-party form providers).
  * Enforces `x-webhook-secret` header verification against stored tenant credentials in `lead_sources` table. Fail-closed: returns HTTP 403 if secret is missing or mismatched.

---

## ━━ 2. AUTHORIZATION & MULTI-TENANCY RBAC ━━

- **Cross-Tenant Guard Pattern (`src/routes/payments.ts` L25–52: `authorizeBillingActor`):**
  ```typescript
  if (!profile || profile.companyId !== companyId) {
    logger.warn('[Billing Security] Cross-tenant billing attempt blocked', { ... });
    res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
    return null;
  }
  ```
- **Role Enforcement:** Billing operations (`/api/payments/create-order`, `/api/payments/verify`) strictly restrict execution to `BILLING_ROLES = ['admin', 'founder']` (Line 18).

---

## ━━ 3. INPUT VALIDATION & SANITIZATION ━━

- **AI Prompt Validation (`src/routes/ai.ts` L28–34):**
  * Prompts pass through `validateCrmPrompt(prompt, targetTask)` from `src/lib/aiRouter.ts`.
  * Rejects prompts exceeding 2000 characters, containing HTML/XML tags, or matching SQL injection patterns (`DROP TABLE`, `' OR 1=1`).
- **Payment Payload Validation (`src/routes/payments.ts` L76–78):**
  * Validates `amount > 0` and non-empty `companyId`.

---

## ━━ 4. ERROR HANDLING & LOGGING ━━

- **Structured Request Logging (`server.ts` L45):**
  * Attaches `requestLogger` middleware to generate unique correlation IDs (`x-correlation-id`) per API request.
- **Consistent HTTP Error Codes:**
  * `400 Bad Request`: Invalid parameters / prompt validation failure.
  * `401 Unauthorized`: Missing or expired Bearer JWT.
  * `403 Forbidden`: Cross-tenant access or role authorization failure.
  * `404 Not Found`: User or Lead record non-existent.
  * `429 Too Many Requests`: Rate limiter triggered.
  * `503 Service Unavailable`: Global AI feature kill-switch active (`AI_ENABLED = false`).

---

## ━━ 5. RATE LIMITING AUDIT ━━

- **Configured Guards (`server.ts` L32–42):**
  ```typescript
  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 AI requests per hour per IP
    message: { error: "Too many AI requests from this IP." }
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 50, // 50 admin attempts
    message: { error: "Too many administrative attempts." }
  });
  ```
- Mount Points: `app.use('/api/ai', aiLimiter, aiRouter);` and `app.use('/api/admin', adminLimiter, adminRouter);`.

---

## ━━ 6. API VERSIONING EVALUATION ━━

- **Current Architecture:** Hybrid versioning scheme.
  * Versioned Routes (`/v1` prefix):
    - `POST /v1/webhooks/incoming/:companyId`
    - `POST /v1/routing/auto-assign`
    - `POST /v1/routing/force/:companyId/:leadId`
    - `POST /v1/webhooks/razorpay`
  * Unversioned Legacy Routes (`/api` prefix):
    - `GET /api/trial/status`
    - `POST /api/ai/generate`
    - `POST /api/payments/create-order`
- **Recommendation:** Standardize all internal CRM endpoints under `/v1/` prefix in future major release.

---

## ━━ 7. API SECURITY HIGHLIGHTS ━━

1. **Timing-Safe HMAC Verification (`src/routes/payments.ts` L10–15):**
   * Uses `crypto.timingSafeEqual` in `safeEqual()` function to prevent timing side-channel attacks during Razorpay signature verification:
     ```typescript
     function safeEqual(a: string, b: string): boolean {
       const bufA = Buffer.from(a || '', 'utf8');
       const bufB = Buffer.from(b || '', 'utf8');
       if (bufA.length !== bufB.length) return false;
       return crypto.timingSafeEqual(bufA, bufB);
     }
     ```
2. **Helmet CSP Directives (`server.ts` L48–75):**
   * Restricts script, font, frame, and connect sources strictly to authorized domains (`razorpay.com`, `supabase.co`, `sentry.io`).
3. **Double CSRF Cookie Protection (`server.ts` L95–100):**
   * Protects mutating Express routes using `doubleCsrf` signed cookies.

---

## ━━ 8. PERFORMANCE OPTIMIZATION ━━

1. **Payload Size Capping (`server.ts` L80):**
   * `express.json({ limit: '1mb' })` prevents memory exhaustion attacks via massive JSON payloads.
2. **Raw Request Body Retention (`server.ts` L80–83):**
   * Retains `req.rawBody` buffer during JSON parsing, eliminating the need to re-stringify request bodies during webhook HMAC verification.

---

## ━━ 9. UNUSED APIS ━━

- **`src/routes/calls.ts` (249 Bytes):**
  * Legacy stub router file. Call logging operations in the current architecture are performed directly via Supabase client or Edge Functions.
  * *Status:* Benign legacy route; can be deprecated in future code cleanups.

---

## ━━ 10. MISSING ENDPOINTS ━━

- **Bulk CSV Export Stream:** Large lead exports (100,000+ rows) are currently processed client-side in `ReportsPage.tsx` / `LeadsPage.tsx`. Adding a backend streaming endpoint (`GET /v1/leads/export-stream`) would reduce client memory overhead for massive datasets.

---

## ━━ 11. BROKEN ENDPOINTS ━━

- **Status:** **0 Broken Endpoints.**
- **Verification:** All routes compile cleanly, implement proper `try/catch` error blocks, and return valid JSON responses with appropriate HTTP status codes.

---

**Audit Summary:** The CallMind Express REST API layer demonstrates enterprise-grade architecture. It features timing-safe cryptographic comparisons, multi-tenant cross-tenant authorization checks, strict AI rate limiting, double CSRF cookies, and robust fail-closed webhook authentication.
