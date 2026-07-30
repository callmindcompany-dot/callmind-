# CallMind Component Map and Codebase Blueprint

This document is the absolute source of truth for the CallMind CRM application. It maps every component, route, schema, migration, security constraint, and business logic pipeline. It is optimized for both human developers and AI coding agents to understand the system architecture down to the smallest detail.

---

## 1. Core Product and Business Profile

CallMind CRM is a multi-tenant SaaS telecalling platform designed for business owners in India to manage customer leads, dial customers directly, and monitor employee call attendance.

* **Target Audience:** Small business owners in India managing teams of 10 to 50 telecallers.
* **Telecaller User Persona:** Low-to-moderate tech comfort; using low-end mobile devices or desktops.
* **Budget Sensitivity:** Pre-revenue stage; API and server infrastructure spends are extremely tight. Performance and token usage must be optimized.
* **Key Non-Negotiables:** Lead ingestion robustness, real-time round-robin routing, call logging reliability, data isolation, and GDPR/DPDP compliant data deletion.

---

## 2. Tech Stack and Core Dependencies

The application uses a hybrid architecture combining a high-performance Express server with a Supabase PostgreSQL database and Deno Edge Functions:

1. **Frontend:** React 19 SPA (Vite-powered), TypeScript, Vanilla CSS (with tailwindcss v4), Framer Motion (premium UI animations), TanStack Query v5 (state queries), React Router DOM v7.
2. **Backend Server:** Node.js Express server running TSX in development, and bundled to CommonJS (`dist/server.cjs`) for production. Exposes ports and manages long-running ingestion/polling loops.
3. **Database (Supabase PostgreSQL):** Extensively utilizes Postgres triggers, indexes, and Row Level Security (RLS) policies.
4. **Serverless (Supabase Edge Functions):** Deno-based TypeScript edge endpoints.
5. **AI Processing:** Google Gemini API via `@google/genai` (model: `gemini-flash-latest`).

---

## 3. Repository Directory Structure

* `src/`: Containing the entire React source.
  * `components/`: UI screens, dashboard sections, and modal components.
  * `config/`: Application configuration variables.
  * `features/`: Domain-specific modules (leads, analytics).
  * `hooks/`: Custom React hooks (billing, context accessors).
  * `lib/`: Database adapter mapping and helper libraries.
    * `dbAdapter.ts`: Unified adapter supporting Supabase and mock memory db.
    * `sanitize.ts`: Input sanitization and escape helpers.
  * `routes/`: Modular Express router files.
    * `admin.ts`: Remote wipe, bulk lead reassignment.
    * `ai.ts`: Gemini AI generation wrapper.
    * `auth.ts`: Trial registration and status checks.
    * `calls.ts`: Call logs creation and fetching.
    * `leads.ts`: IndiaMART/TradeIndia background cron loop, webhooks.
  * `services/`: Supabase query wrappers.
  * `types/`: Shared TypeScript definitions.
  * `utils/`: Formatter classes and timestamps compatibility adapters.
    * `timestamp.ts`: Firestore/Supabase Timestamp compatibility helper.
  * `App.tsx`: Root React SPA router and sidebar layout.
  * `AuthContext.tsx`: React auth context (implements session sync).
  * `CompanyContext.tsx`: Tenant isolation provider.
  * `ProtectedRoute.tsx`: Route guards, Role gates, Trial lockout overlays.
  * `main.tsx`: Mounts SPA; initializes Sentry error tracking.
* `supabase/`:
  * `functions/`: 24 Deno Edge Functions.
    * `_shared/`: Shared Edge Functions logic.
      * `rateLimit.ts`: Deno in-memory rate-limiter check (30 reqs/min).
    * `impersonate-company/`: Dynamic magic-link cookie setter.
    * `purge-user-data/`: GDPR / DPDP right-to-be-forgotten deletion logic.
  * `migrations/`: PostgreSQL database migrations.
* `Dockerfile`: Multi-stage production build configuration.
* `docker-compose.yml`: Production container orchestrator.
* `package.json`: NPM configuration and dependencies.
* `schema.sql`: Database schema initialization script.
* `tsconfig.json`: TypeScript compilation options.
* `vite.config.ts`: Vite compiler rules and proxy configurations.

---

## 4. Database and Tenancy Architecture

### Database Schema Core Tables (`schema.sql`):
* `users`: `id` (PK, text), `email` (unique), `name`, `phone`, `role` (`founder` | `tester` | `user`), `onboarding_status`, `company_id` (tenant reference), `plan_status`.
* `leads`: `id` (PK, text), `company_id`, `name`, `phone`, `status` (`New`, `Contacted`, `Interested`, etc.), `assigned_to` (FK to `users.id`), `source`, `custom_data` (JSONB).
* `calls`: `id` (PK), `company_id`, `lead_id`, `phone`, `duration`, `status`, `ai_summary`, `created_by` (FK to `users.id`), `recording_url`.
* `audit_logs`: `id` (PK), `company_id`, `user_id`, `action`, `category`, `target`, `metadata` (JSONB).
* `attendance_logs`: `id` (PK), `company_id`, `user_id`, `type` (`punch_in` | `punch_out`), `timestamp`, `device_info`.
* `invites`: `id` (PK), `company_id`, `token`, `join_code`, `status` (`active` | `expired` | `revoked`), `used_count`, `max_uses`.
* `agent_status`: `id` (PK), `user_id`, `user_name`, `company_id`, `status` (`active` | `on_call` | `offline`), `last_seen`.
* `subscriptions`: `id` (PK, UUID), `company_id`, `plan_id` (`starter` | `professional` | `enterprise`), `status` (`active` | `trial`), `seats_limit`, `billing_cycle`, `starts_at`, `ends_at`.
* `billing_intents`: `id` (PK, UUID), `user_id`, `user_email`, `company_id`, `plan_id`, `seats`, `duration_months`, `total_amount`, `status` (`pending` | `completed`), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
* `invoices`: `id` (PK, UUID), `company_id`, `invoice_number` (unique), `amount`, `status` (`paid` | `unpaid`), `billing_period_start`, `billing_period_end`, `pdf_url`, `created_at`.

### Recent Database Migrations:
* `supabase/migrations/20260706_billing.sql`: Initializes `subscriptions`, `billing_intents`, and `invoices` tables with RLS policies enabled.
* `supabase/migrations/20260729_payments_hardening.sql`: Adds `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `billing_intents` and creates a `UNIQUE INDEX` on `razorpay_payment_id` for payment replay attack prevention.

### Multi-Tenancy Isolation Model (RLS):
The database strictly isolates client organizations by executing Row-Level Security policies on every table containing a `company_id` column.
The migration file `supabase/migrations/20260718_secure_rls.sql` enforces these policies.

#### RLS Definer Helpers:
1. `public.get_my_company_id()`: Returns the caller's company identifier. Marked as `SECURITY DEFINER` to prevent infinite recursion during queries on the `users` table.
   ```sql
   CREATE OR REPLACE FUNCTION public.get_my_company_id()
   RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
     SELECT company_id FROM public.users WHERE id = auth.uid()::text;
   $$;
   ```
2. `public.get_my_role()`: Resolves the caller's role string.
   ```sql
   CREATE OR REPLACE FUNCTION public.get_my_role()
   RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
     SELECT role FROM public.users WHERE id = auth.uid()::text;
   $$;
   ```

#### RLS Policy Structure:
Policies must be split explicitly per operation to prevent insertion bypasses:
* **SELECT:** `USING (company_id = public.get_my_company_id())`
* **INSERT:** `WITH CHECK (company_id = public.get_my_company_id())`
* **UPDATE:** `USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id())`
* **DELETE:** `USING (company_id = public.get_my_company_id())`

#### Special User Policies:
A security policy `users_self_read` is declared: `USING (id = auth.uid()::text)`. This allows new users whose `company_id` is still `NULL` to read their own profile row, unblocking the workspace onboarding flow.

---

## 5. Express Backend Routing and API Specification

The Node Express server runs on port `3000` (exposing `/api/*` and `/v1/*`).

### `src/routes/payments.ts` (Billing & Razorpay Integration)
* `/api/payments/create-order` [POST]: Authenticates user (`admin` or `founder` role guard), verifies caller tenancy, calculates order amount in paise (`amount * 100`), and creates a Razorpay Order via `razorpayInstance.orders.create()`. Attaches authoritative purchase notes (`companyId`, `planId`, `seats`, `durationMonths`, `userId`) to the order.
* `/api/payments/verify` [POST]: Validates Razorpay HMAC SHA-256 payment signature using constant-time string comparison (`safeEqual`). Fetches order status directly from Razorpay API (`orders.fetch(razorpay_order_id)`), verifying `order.status === 'paid'`. Reads metadata directly from server-side order notes to prevent client-side plan/price tampering. Checks `billing_intents` for payment replay (`409 Conflict`), updates `companies` subscription status (`active`, `plan`, `seat_limit`, `plan_expires_at`), logs invoice record in `invoices`, and records intent as `completed`.
* `/v1/webhooks/razorpay` [POST]: Unauthenticated webhook endpoint mounted before CSRF middleware. Verifies `x-razorpay-signature` against request raw body buffer (`req.rawBody`) using `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured` & `subscription.charged` events for automated plan activation and extension.

### `src/routes/auth.ts`
* `/api/trial/status` [GET]: Resolves the user's trial configuration, calculating days remaining, maximum leads capacity, and consumption logs.
* `/api/trial/start` [POST]: Initializer starting the 7-day trials period, setting limits (500 leads, 30 AI drafts).
* `/api/trial/extend` [POST]: Extends an active trial by 3 days. Restricted to a maximum of 1 extension trigger per company.
* `/api/auth/impersonate-login` [GET]: Securely parses the HTTP-only `impersonate_token` cookie, clears the cookie header, and redirects the browser session to the target admin landing page.

### `src/routes/leads.ts`
* `/v1/webhooks/facebook` [POST] & `/v1/webhooks/generic` [POST]: Inbound JSON parsers receiving leads metadata from ad platforms.
* **Background Ingestion Cron:** Spawns a background loop polling IndiaMART (`https://utils.indiamart.com/api/detail`) and TradeIndia APIs every 10 minutes using credentials stored in the `lead_sources` table.

### `src/routes/admin.ts`
* `/api/admin/remote-wipe` [POST]: Sets `force_wipe: true` and invalidates all session refresh tokens for a target agent. Restricted to the Master Admin.
* `/api/admin/bulk-reassign` [POST]: Reassigns all leads assigned to `sourceUserId` to `targetUserId`. Updates leads in atomic database transactions.

### `src/routes/ai.ts`
* `/api/ai/generate` [POST]: Strips HTML tags, parses system guidelines, enforces token budgets, and sends the prompt to the Gemini API wrapper.

### `src/routes/calls.ts`
* `/api/calls/log` [POST] & `/api/calls/list` [GET]: Manages call records, durations, interest states, and AI transcription snippets.

---

## 6. Supabase Deno Edge Functions Spec

Edge Functions are written in Deno TypeScript, requiring Deno standard library modules.

### Shared Security and Rate Limiting (`_shared/rateLimit.ts`):
Tracks incoming requests inside a memory map (`Map<string, number[]>`) using a sliding window. Evicts timestamps older than 60 seconds.
* **Throttling Threshold:** Max 30 requests/minute.
* **Bypass:** `OPTIONS` preflight requests bypass rate-limits.
* **Identifier:** Resolves key using `Authorization` token header (logged-in users) falling back to `x-forwarded-for` (anonymous callers).

### `supabase/functions/impersonate-company/index.ts`
Generates short-lived magic links using the Supabase Auth Admin API.
* **Authorization:** Requires caller session to resolve to a user whose role in the `users` table is `founder`.
* **Token Delivery:** Delivers the token back to the browser via a secure `Set-Cookie` header (`HttpOnly; Secure; SameSite=Strict; Max-Age=300`) to prevent local storage scraping.

### `supabase/functions/purge-user-data/index.ts`
Enforces GDPR / DPDP right-to-be-forgotten erasure mandates.
* **Authorization:** Restricts deletion actions to the authenticated user ID matching the deletion target.
* **Operations:**
  1. Deletes all entries in `leads` belonging to the user.
  2. Deletes all entries in `calls` initiated by the user.
  3. Purges user action items from `audit_logs`.
  4. Deletes the core credentials using `auth.admin.deleteUser()`.
  5. Anonymizes the profile row in `users` (`email` set to `purged-{id}@deleted.callmind`, `name` to `Deleted User`, `phone` to `null`).

---

## 7. Frontend Core Architecture

* **`App.tsx`:** Coordinates sidebar navigation, handles global theme bindings, and reads `companies` collection flags in real-time to toggle visible features.
* **`AuthContext.tsx`:** Supabase authentication provider. Keeps track of authenticated state (`user`), custom profile metadata (`profile`), and user status flags (`isReady`).
* **`ProtectedRoute.tsx`:** Central security gate. Redirects unauthenticated users to `/login`, forces incomplete profiles to `/onboarding`, and suspends expired trial structures by loading the `UpgradeModal` overlay.
* **`LeadsPage.tsx`:** High-performance CRM dashboard. Implements virtual list windowing via `@tanstack/react-virtual` to support rendering up to 100,000 lead cells.
* **`PlatformAuditLog.tsx`:** Production auditor interface. Renders download histories, data exports, and configuration updates.
  * **CSV Formula Safe:** Prevents CSV formula injections during export. If a field content begins with a functional formula character (`=`, `+`, `-`, `@`), it prefixes the cell with an apostrophe (`'`) to neutralize Excel execution.

---

## 8. Critical System Workflows

```
  [Inbound Lead] ──> [Sanitize Phone] ──> [Smart Deduplication Check]
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            ▼ (Duplicate Found)                           ▼ (New Lead)
                  [Merge Comments/Activity]                     [Fetch Online Agents]
                  [Flag as Unseen/Update]                                 │
                                                                          ▼
                                                                [City/Skill Filter]
                                                                          │
                                                                          ▼
                                                              [Round-Robin Allocation]
```

### Lead Ingestion and Smart Deduplication:
1. Normalizes phone numbers to standard format (e.g. `+91XXXXXXXXXX`).
2. Performs a lookup check: `.where("phone", "==", phone).where("companyId", "==", companyId)`.
3. If a duplicate lead is found and `smartDeduplication` is enabled, it checks the cooldown timeframe (default: 7 days).
4. If within cooldown, it merges comments, updates `updatedAt`, sets `isUnseen: true`, and logs the action to `import_logs` as `duplicate_updated` rather than creating a new record.

### Automated Round-Robin Assignment Rotation:
1. Rentention / selection checks: fetches all agents belonging to the company.
2. Filters out inactive agents if `routing_exclude_inactive` is active.
3. Filters agents by matching skills (e.g., matching "villa", "luxury" queries) and geographical coverage (`leadData.city`).
4. Loads the routing state index pointer from the `routing_state` database record.
5. Increments the index (`nextIndex = (lastIndex + 1) % availableAgents.length`) and assigns the lead.
6. Saves the updated index back. Asserts locking protocols to avoid concurrent race duplicates.

### AI Sanitizer and Jailbreak Guards:
Server-side filtering at `/api/ai/generate` intercepts queries before hitting Gemini:
* **Payload Caps:** Prompt length restricted to a maximum of 2,000 characters.
* **Cleanse Filter:** Strips HTML/Script elements and rejects prompts with SQL command structures.
* **Jailbreak Detection:** Matches inputs against a regex block checking for common override command overrides (e.g. `ignore previous instructions`, `you are now developer mode`, `DAN`). Returns a 400 Bad Request if jailbreaks are matched.

---

## 9. Infrastructure and Production Setup

### Multi-Stage Dockerfile:
* **Stage 1 (Builder):** Uses `node:20-alpine`, installs dependencies via `npm ci --legacy-peer-deps`, copies source elements, and runs `npm run build` (which compiles client-side code and bundles the Express router via esbuild).
* **Stage 2 (Runner):** Uses `node:20-alpine`, copies production bundles, installs production dependencies, exposes port `3000`, and triggers startup via `CMD ["npm", "start"]`.

### docker-compose.yml:
Orchestrates the server container. Maps local ports to host `3000:3000` and forwards system environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`).

### Sentry Observability:
Client-side exceptions, routing drops, and rendering bugs are logged via `@sentry/react` configured in `src/main.tsx`. Backend Edge Function failures are logged inside catch blocks.

---

## 10. Custom Style and Design Guidelines

The CallMind platform follows a premium, light-themed glassmorphism interface.

* **Colors System (CSS Variables):**
  * Brand Primary: `--color-brand-500` (`#3b82f6`) | Main CTA Accent: `--color-brand-600` (`#2563eb`)
  * Body background: Light grays. Modals/Drawers: Translucent white (`bg-white/95`) with light gray boundaries (`border-gray-150`).
* **Typography Standards:**
  * Headers / Summaries: Display Font `"Outfit"`, uppercase, italicized tracking.
  * Lists / Forms / Body Text: Sans Font `"Inter"`.
* **Interactive Utility Transitions:**
  * Glass Card Surfaces: `.glass-card` incorporates drop-shadow offsets and scaling hover effects.
  * Action items: `.btn-tactile` scales buttons slightly down on click (`0.97`) and up on hover (`1.01`).
  * Scrollbars: `.custom-scrollbar` class must keep scrollbar channels narrow (4px) and gray.

---

## 11. Mobile Telecaller Application Architecture

For full architectural documentation, screen catalog, offline-sync protocols, and security rules of the React Native / Expo mobile app, refer to:
👉 **[MOBILE_APP_MAP.md](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/MOBILE_APP_MAP.md)**

### Key Highlights of Mobile App Architecture:
1. **53 Screen Inventory:** Modular React Native components covering Auth, Onboarding, Telephony DialPad, Active Call Floating Overlay, Post-Call Feedback, Lead CRM, AI Sales Battlecards, Attendance, Leaderboards, Inbox, and Settings.
2. **Strict Mobile Role Guard:** Mobile app permits login exclusively for `telecaller`, `team_lead`, and `floor_manager` roles. Admin/Founder logins are blocked with an explicit error directing them to the web dashboard.
3. **Offline-First Synchronization Engine (`sync.ts`):** Unsynced call logs are persisted locally in AsyncStorage (`@callmind_unsynced_calls`). When network connectivity is re-established, pending call logs are batch-uploaded to the Supabase `calls` table.
4. **Attendance Verification:** GPS location coordinates + selfie photo verification clock-in/out tracking (`AttendanceScreen.tsx`).
5. **System Language Standardization:** Single standard language model (English) across the application for high AI performance and consistency.

