# CallMind Subscription Rules & Razorpay Integration

How plans, limits and payments actually work. **Do not put numbers in this
file.** Prices and limits live in one place only — `src/config/pricing.ts` —
and are pushed into Postgres by `npm run gen:plans`, which writes
`supabase/migrations/20260802000100_plan_limits_seed.sql`. A test
(`src/__tests__/planLimits.sync.test.ts`) fails the build if the two disagree.

An earlier version of this document listed a fourth set of prices, seat caps
and lead limits that matched neither the config nor the code, which is exactly
why nothing numeric is written here any more. To read the current figures:

```bash
node -e "console.table(require('tsx/cjs').require('./src/config/pricing.ts', __filename).PRICING_PLANS)"
```

---

## 1. Tiers

Four values are legal in `companies.plan`, enforced by a CHECK constraint:
`trial`, `starter`, `growth`, `pro`.

- **trial** — not sold. The entitlement set a company holds during the free
  trial, and the set it falls back to if a subscription lapses.
- **starter / growth / pro** — purchasable, **each from a single seat**. Plans
  differ by capability, not by team size; `maxSeats` is the only seat-based
  boundary. A five-person team that wants AI lead scoring buys Growth.

`companies.plan_status` is one of `trialing`, `active`, `past_due`, `expired`,
`cancelled`. A company at `expired` or `cancelled` is resolved to trial limits
by `get_company_limits()`, not locked out of its own data.

---

## 2. Where limits are enforced

The database is the boundary. The browser holds an authenticated supabase-js
client, so anything enforced only in React can be skipped from devtools — for a
long time every limit in this product was React-only, and none of them applied.

Enforced in Postgres (`supabase/migrations/20260802000200_plan_enforcement.sql`):

| Limit | Mechanism |
| :--- | :--- |
| Seats, admins | `BEFORE INSERT OR UPDATE` trigger on `users`. Covers UPDATE too, because re-enabling a disabled member consumes a seat. |
| Leads | `AFTER INSERT ... FOR EACH STATEMENT` trigger on `leads` with a transition table, so a bulk import chunk is checked once and rolls back whole. |
| Automation rules | `BEFORE INSERT` trigger on `automation_rules`. |
| Team targets | `BEFORE INSERT` trigger on `targets`. |
| AI credits | `consume_ai_credit()` RPC, called by `src/routes/ai.ts` before dispatching to Gemini. Increments `ai_usage` atomically. |
| Storage & File Limits | `trg_enforce_storage_limit` trigger on `documents` (migration `20260803000000_documents.sql`). Checks total company `storage_used_bytes` against `includedStorageMb` + addon, plan `max_file_size_mb`, and `files_per_lead`. Express route `/v1/documents/presign` also pre-validates size and quotas before issuing R2 PUT URLs. |
| Plan and seat tampering | `protect_billing_columns()` trigger on `companies` — only the service role may change `plan`, `plan_status`, `seat_limit`, `plan_expires_at`, `trial_ends_at` or `billing_cycle`. |

All of these functions are `SECURITY DEFINER` with `SET search_path = public`,
and key off `NEW.company_id` rather than `get_my_company_id()` — that helper
reads the JWT, and service-role writes have none.

Enforced in the client only (`src/hooks/usePlan.ts`), because they gate reads
rather than row writes: PDF/report export, API access tier, bulk import
availability, AI lead scoring. `usePlan` deliberately **fails open** if its
query fails; the database is still there to say no.

CallMind staff bypass all limits via `isGodMode` (an internal email list). A
customer's own founder does **not** — `isFounder` is true for every tenant.

---

## 3. Razorpay integration

### Pricing is server-side

`/api/payments/create-order` derives the amount from `PRICING_PLANS`. The
client may send an `amount`, but it is only compared: a mismatch returns 400
rather than being silently overridden, so a client bug is loud rather than
mispriced. `/verify` re-prices the order and checks it against the amount
Razorpay actually captured.

### Flow

1. `/api/payments/create-order` validates plan, seats (1 … `maxSeats`) and term
   (1 or 12 months), prices it, and stamps the purchase into the Razorpay order
   `notes`. Those notes — not the request body — are the authoritative record.
2. The user pays in the Razorpay modal.
3. `/api/payments/verify` checks the HMAC SHA-256 signature with
   `crypto.timingSafeEqual`, refetches the order, and requires
   `status === 'paid'`.
4. The caller must be an admin or founder of the company the order names.
5. Replay guard: `billing_intents` has a unique index on
   `razorpay_payment_id`, so one payment cannot be redeemed twice.
6. `companies` is updated with `plan`, `plan_status`, `seat_limit`,
   `billing_cycle` and `plan_expires_at`.
7. If that update fails, the payment has already been captured — the request
   records a `needs_reconciliation` intent and returns 202 with an honest
   message, rather than a 500 telling a paying customer their payment failed.

The webhook at `/v1/webhooks/razorpay` goes through the same validation. It
previously defaulted to `growth` and 10 seats when notes were absent, which
granted a plan nobody bought; it now ignores such events and logs them.

### GST

- Base = seats × per-seat price × months.
- Billing state Maharashtra → CGST 9% + SGST 9%.
- Any other state → IGST 18%.
- Total = base + GST.

**Not yet implemented.** The billing page applies a flat 18% and does not split
CGST/SGST versus IGST by state. Tracked separately; do not read this section as
a description of current behaviour.
