# CallMind — system context

What this repository actually contains, checked against the code and the
database rather than against other documents. Anything here that you cannot
confirm by reading the file it names should be treated as stale and corrected.

No scores, no completion marks, no numbers in prose — see `AGENTS.md`. Where a
figure matters, this points at the file that holds it.

---

## Stack

| Part | Where |
|---|---|
| Web app | React 19 + Vite + Tailwind, `src/components/` |
| Mobile app | Expo SDK 51 (`react-native` 0.74.5), `mobile/` — read `mobile/AGENTS.md` first |
| Server | Express, `server.ts` mounting `src/routes/` |
| Database | Postgres on Supabase, `supabase/migrations/` |
| Object storage | Cloudflare R2 via `@aws-sdk/client-s3`, `src/routes/documents.ts` |
| AI | Gemini Flash only, `src/routes/ai.ts` and `src/lib/aiRouter.ts` |
| Prices and quotas | `src/config/pricing.ts`, pushed to Postgres by `scripts/gen-plan-limits.mjs`, enforced by `supabase/migrations/20260802000200_plan_enforcement.sql` |

`src/lib/dbAdapter.ts` exports a Firestore-shaped facade (`db.collection(…)`,
`FieldValue`, `Timestamp`) over supabase-js. It is real — it translates
camelCase to snake_case and issues Supabase queries — but it is a compatibility
layer left from the Firestore era, and it is the reason several server writes
name columns that do not exist: nothing type-checks a string passed to
`.collection()`.

---

## Authentication and tenancy

`POST /api/auth/sync-app-metadata` (`src/routes/auth.ts:274`) verifies the
token, reads `company_id` and `role` server-side from `public.users`, and writes
them into Supabase Auth `app_metadata`, ignoring anything in the request body.

`get_my_company_id()` and `get_my_role()` read `auth.jwt() -> app_metadata`.
Both are `SECURITY DEFINER`. Enforcement triggers must key off
`NEW.company_id` instead — service-role and webhook writes carry no JWT, so the
helpers resolve to NULL for them.

---

## Calling, on mobile

The app dials with `tel:` through `Linking.openURL` (`mobile/App.tsx`,
`dialNumber`). There is no VoIP, no carrier integration, and no audio recording
or storage — the privacy policy says so and nothing contradicts it.

That means the app cannot know which SIM was used, and cannot know whether a
call connected. What it measures is elapsed time between handing off to the
dialler and coming back, which `PostCallFeedbackSheet` labels as such.

After the form, `callOutcome.ts` maps the outcome to a lead status. Closed leads
leave the queue; `last_contact_at` sinks a just-tried lead below the ones nobody
has called. `priorityQueue.ts` holds the ordering.

Deleting an account goes through `delete_my_account()`
(`supabase/migrations/20260818000000_account_deletion.sql`), from both the
mobile screen and the web settings page. It unassigns leads rather than deleting
them and refuses to remove a workspace's only administrator.
`scripts/account-deletion-proof.mjs` exercises it against the real database.

---

## Documents

`POST /v1/documents/presign` (`src/routes/documents.ts:114`) validates plan
limits and issues a presigned PUT to R2. `POST /v1/documents/confirm` (`:215`)
writes the metadata row.

R2 has no row-level security. Tenant isolation for files is entirely the
application's job.

---

## Inbound lead ingestion

`processInboundLead` in `src/lib/dbAdapter.ts` is the path for Meta Ads,
IndiaMART and generic webhooks, reached from `src/routes/leads.ts`.

**It could not complete until 2026-08-10.** Every write in it named columns that
do not exist, and each was fixed by dropping the write rather than adding a
column, because in every case something real already carried the meaning:

* The `leads` insert named `isNew` and `holdUntil` — `is_new` and `hold_until`
  after the adapter snake-cases them. Neither exists, so the insert failed with
  `42703` before anything else ran and no inbound lead was ever stored.
  `is_unseen` already carries what `is_new` was reaching for, and
  `hold_outbound_trigger` is the whole night-hold state on its own.

* The `import_logs` insert named `source`, `leadId`, `assignedTo` and
  `routingReason`. That table is the CSV importer's — `id, company_id, filename,
  row_count, status, created_at`, with `filename` NOT NULL — and records file
  imports, not webhook deliveries. The trail now goes to `lead_activity_log`.

* Round-robin read `teamSettings.assignmentRule`; the column is
  `assignment_mode`. The read was always `undefined`, so `'Manual'` applied to
  every company whatever they had chosen and the `RoundRobin` branch was
  unreachable. It now reads the real column — but that means the branch has
  never executed against production data, and is unproven beyond a unit level.

* The night-hold release in `src/routes/leads.ts` wrote `holdUntil: 'Released'`,
  so no held lead was ever released. Its `catch` then demoted the resulting
  "does not exist" to a debug line reading *"Leads hold schema pending"*, which
  is how a write against a column that had never been created ran quietly for as
  long as it did. Every error from that job is reported now.

`scripts/lead-ingestion-proof.mjs` writes the current shapes against the real
schema and asserts the old ones still fail.

**Seven settings remain inert.** `activeAgentIds`, `smartDeduplication`,
`dedupeWindowDays`, `holdNightLeads`, `nightHours`, `categoryAgentMap` and
`welcomeTemplate` have no columns on `team_settings`, which holds
`require_approval`, `assignment_mode`, `rotting_threshold`,
`hide_phone_numbers`, `device_limit`, `leads_statuses` and `default_stage`. They
are now constants with a comment saying so, rather than reads that could only
ever return `undefined`. Making any of them configurable means writing a
migration first.

Force-assignment (`POST /routing/force/:companyId/:leadId`) always worked and
does reach `increment_routing_index`.

---

## Specifications in `docs/`

These describe intent. Each is only as current as the last time somebody checked
it against the code, so treat the file it names as the authority.

**Backed by code that runs:**
`DOCUMENT_MANAGEMENT.md` · `BRANCH_REGION_HIERARCHY.md` · `GLOBAL_SEARCH.md` ·
`NOTIFICATION_CENTER.md` · `AUDIT_LOG_SYSTEM.md` · `PAYMENT_MODULE.md` ·
`AI_ENGINE_V2.md`

**Partly built:**
`WORKFLOW_AUTOMATION_V2.md` — `automation_rules` is created in
`supabase/migrations/20260717999996_scheduled_messages.sql:25`, not in an
`automation_rules_migration.sql`; that file does not exist.
`INVOICE_BILLING_MODULE.md` — PDF generation in `src/routes/payments.ts`.
`OFFLINE_SYNC_ENGINE.md` — the mobile half exists (`mobile/src/services/sync.ts`
and a rendered offline banner); the server-side worker does not.
`ACTIVITY_FEED.md` — `activity_stream` is queried by `src/hooks/useTeam.ts:210`;
nothing writes to it.

**Not built:**
`DUPLICATE_DETECTION_ENGINE.md` · `QUOTATION_MODULE.md` · `RENEWAL_MODULE.md` ·
`SUPPORT_MODULE.md`

---

## Standing facts

* Migrations are not applied automatically. Code depending on a new column fails
  until its migration is run.
* `src/types/supabase.ts` is hand-maintained. It has repeatedly declared columns
  the database does not have — most recently `agent_status.location`, which made
  the team page render "Unknown Location" for every agent.
* `leads.id` is `TEXT`, not UUID. `auth.uid()` is `uuid`.
* There is no `CHECK` constraint on `leads.status`; any string is accepted.
* `pg_cron` is not installed, and `cron.job` does not exist. Nothing scheduled
  runs on its own, including `expire_trials()`.
* `leads.assigned_to` holds a user id. `callbacks.assigned_to` holds an email.
