# CallMind — engineering rules

Read this before changing anything. Every rule below exists because the
opposite already happened in this codebase and cost weeks.

UI and styling rules live in `.agents/AGENTS.md`. Mobile has its own
`mobile/AGENTS.md`, which you must read before writing any Expo code.

---

## The one rule everything else follows from

**Documentation in this repository has been wrong more often than right.**

Forty-nine audit documents claimed "✅ Complete" and "9.5/10" for features that
did not work. They were written by reading `.sql` files instead of querying the
database: `full_master_supabase_setup.sql` declares 19 tables, so an audit
recorded "19 tables ✅" — the database had 7, because nobody had run the script.

So: **verify against the code and the database, never against a document.** If
you cannot verify a claim, say so plainly instead of repeating it.

---

## Errors

**A failed query must throw. Never `return []`.**

```ts
// Wrong. This is how five broken integrations went unnoticed for months.
if (error) {
  console.warn('query failed', error);
  return [];
}

// Right.
if (error) throw error;
```

An empty array is indistinguishable from "no data". The user sees an empty
screen, concludes there is nothing there, and nobody learns the query failed.
Twenty-seven hooks did this. Inside a React Query `queryFn`, throwing is
correct — it gives the UI an `isError` to render.

Screens must distinguish "failed" from "empty". "No leads yet" shown after a
failure is the bug.

---

## Types

`src/types/supabase.ts` is **hand-maintained**. There is no codegen step.

It once declared thirty columns on `leads` when the schema created eighteen.
TypeScript believed the declaration, approved the insert, and Postgres rejected
it at runtime — which is why adding a lead by hand failed silently for a long
time.

**Before using a column, confirm a migration creates it.** Before adding one to
the type, write the migration. Prefer deleting a field from the type over
leaving one that does not exist.

No `as any`. No `@ts-ignore`. A `@ts-ignore` is how the `FixedSizeList` crash
shipped: it hid a missing export until the leads screen threw at runtime.

---

## Tenancy and authorization

This is a multi-tenant CRM. Every one of the following was a real hole.

**Tenancy comes from `app_metadata`, never `user_metadata`.** A signed-in user
can write their own `user_metadata`; reading `company_id` or `role` from it lets
anyone move themselves into another tenant.

**`role === 'founder'` is a tenant role, not a platform privilege.** Every
customer gets it on signup. Platform-owner actions — impersonation, the Founder
Hub, cross-tenant tools — check the email allow-list in `INTERNAL_TEAM_EMAILS`.

**Never authorize on a company id from the request.** Resolve it from the
caller's verified profile, or compare the supplied one against that profile
before trusting it. `authorizeBillingActor` in `src/routes/payments.ts` is the
reference implementation.

**`server.ts` mounts routers with no global auth middleware.** Each route file
guards itself. `/api/sla` shipped with four endpoints and none at all.

**Fail closed.** An unset allow-list means nobody, not everybody.

---

## Database

Enforcement lives in Postgres. The browser holds an authenticated supabase-js
client, so anything enforced only in React can be skipped from devtools. For a
long time every plan limit in this product was React-only and none applied.

Every trigger function:

```sql
SECURITY DEFINER
SET search_path = public   -- mandatory: blocks schema shadowing
```

and keys off **`NEW.company_id`**, never `public.get_my_company_id()`. That
helper reads the JWT (`20260718_secure_rls.sql`), and service-role and webhook
writes have no JWT — it resolves to NULL and waves them through.

Views need `security_invoker = on`, or they run as owner and bypass RLS on the
base tables.

RLS policies follow `tenant_<action>_<table>`, keyed on
`company_id = public.get_my_company_id()`.

Limit breaches raise `P0001` with a user-safe `MESSAGE` and machine-readable
`DETAIL`, which `src/lib/planErrors.ts` parses:

```
DETAIL = '{"code":"PLAN_LIMIT","metric":"seats","used":10,"limit":10}'
```

Bulk paths need statement-level triggers with a transition table, not per-row —
a CSV import inserts in chunks, and a per-row trigger runs the same count once
per row.

---

## Numbers

**Prices and limits live in `src/config/pricing.ts` and nowhere else.**

They were once in four places at once — the website, the billing page, the
trial modal and the docs — all different, so a trial user was quoted one price
and charged another.

`npm run gen:plans` pushes the config into Postgres and rewrites the JSON-LD in
`index.html` and `public/llms.txt`. `src/__tests__/planLimits.sync.test.ts`
fails the build if any of them drift.

Entitlement is asked through `usePlan()`. Do not add a second check.

**No numbers in prose.** Documents point at the code that holds the value.
Never write "✅ Complete" or a score out of ten — if something needs certifying,
certify it with a test.

---

## Never invent data

A chart with no data shows nothing. It does not show a plausible shape.

Both of these shipped:

```ts
stackedData: [{ name: 'Mar', v1: 40, v2: 24, v3: 20 }, ...]  // Recharts demo values
budgetVal = parseFloat(lead.estimated_budget) || 500          // invented revenue
```

and a heat map spread one real count across seven cells so it looked like
weekly variation.

The same applies to marketing copy. "500+ businesses", "24/7 support", "reply
within 2 hours", "selfie and GPS attendance verification" were all published
and none were true.

---

## Tests

**Verify a test can fail.** Reintroduce the fault, watch it fail, restore.

Two tests written in this repo caught nothing on the first attempt: one matched
commented-out code, so a disabled guard read as present; another accepted an
imported symbol as proof it was called. A test that cannot fail is worse than no
test, because it is believed.

Do not weaken a test to make it pass.

---

## Before you finish

```bash
npx tsc --noEmit     # clean
npx vitest run       # all passing
npm run build        # succeeds
```

If the change is visible in the browser, open it and look. Report what you
actually observed — console output, a screenshot, a query result — not what you
expect.

If something is blocked or you could not verify it, say which part and why.
Partial work reported honestly is useful; work reported as complete when it is
not is how this codebase got into the state these rules describe.

---

## Current standing facts

- **Migrations are not applied automatically.** Several are pending; code that
  depends on a new column will fail until its migration is run.
- Mobile is Expo — read `https://docs.expo.dev/versions/v57.0.0/` before
  writing any Expo code, per `mobile/AGENTS.md`.
- Documents go to Cloudflare R2, metadata to Postgres. R2 has no row-level
  security; tenant isolation for files is entirely the application's job.
- `leads.id` is `TEXT`, not UUID.
- The AI provider is Gemini Flash. Do not add a second provider.
