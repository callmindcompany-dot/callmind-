/**
 * Generates supabase/migrations/20260802000100_plan_limits_seed.sql from
 * src/config/pricing.ts.
 *
 * Run `npm run gen:plans` after any edit to pricing.ts. The generated file is
 * committed, and src/__tests__/planLimits.sync.test.ts fails if it does not
 * match the config -- so a price change that skips this step cannot ship.
 *
 * Also rewrites the two static files that cannot import TypeScript: the
 * Product JSON-LD offer range in index.html and the pricing line in
 * public/llms.txt.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SEED_PATH = join(root, 'supabase', 'migrations', '20260802000100_plan_limits_seed.sql');

/** NULL means unlimited; 0 means the feature is off. */
const numeric = (value) => {
  if (value === 'unlimited') return 'NULL';
  if (value === false || value === undefined || value === null) return '0';
  return String(value);
};

const bool = (value) => (value ? 'true' : 'false');

const scoring = (value) => {
  if (value === 'advanced') return "'advanced'";
  return value ? "'on'" : "'off'";
};

const api = (value) => {
  if (value === 'read_only') return "'read_only'";
  if (value === 'full_read_write') return "'full_read_write'";
  return value ? "'full_read_write'" : "'off'";
};

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

export function buildSeedSql(plans) {
  const order = ['trial', 'starter', 'growth', 'pro'];
  const rows = order.map((id) => {
    const p = plans[id];
    if (!p) throw new Error(`PRICING_PLANS is missing the "${id}" plan`);
    return `  (${[
      quote(p.id),
      quote(p.name),
      p.monthlyPrice,
      p.annualPrice,
      p.maxSeats,
      p.maxAdmins,
      numeric(p.leadLimit),
      numeric(p.aiDraftLimit),
      numeric(p.aiCreditLimit),
      p.automationRules,
      numeric(p.bulkImport),
      scoring(p.aiLeadScoring),
      bool(p.teamTargets),
      api(p.apiAccess),
      bool(p.pdfExport),
      p.storageGbPerSeat,
      p.storageFlatMb ?? 0,
      p.maxFileSizeMb,
      numeric(p.filesPerLead),
    ].join(', ')})`;
  });

  return `-- GENERATED FILE -- DO NOT EDIT BY HAND.
-- Source: src/config/pricing.ts. Regenerate with \`npm run gen:plans\`.
-- src/__tests__/planLimits.sync.test.ts fails if this drifts from the config.
--
-- Convention: lead_limit / ai_draft_limit / ai_credit_limit / bulk_import use
-- NULL for "unlimited" and 0 for "off". NULL is deliberate: in SQL
-- \`count >= NULL\` is NULL rather than true, so an unlimited plan can never
-- trip a limit check by accident.

BEGIN;

CREATE TABLE IF NOT EXISTS public.plan_limits (
  id                TEXT PRIMARY KEY,
  name              TEXT    NOT NULL,
  monthly_price     INTEGER NOT NULL,
  annual_price      INTEGER NOT NULL,
  max_seats         INTEGER NOT NULL,
  max_admins        INTEGER NOT NULL,
  lead_limit        BIGINT,
  ai_draft_limit    INTEGER,
  ai_credit_limit   INTEGER,
  automation_rules  INTEGER NOT NULL DEFAULT 0,
  bulk_import       INTEGER,
  ai_lead_scoring   TEXT    NOT NULL DEFAULT 'off',
  team_targets      BOOLEAN NOT NULL DEFAULT false,
  api_access        TEXT    NOT NULL DEFAULT 'off',
  pdf_export        BOOLEAN NOT NULL DEFAULT false,
  storage_gb_per_seat INTEGER NOT NULL DEFAULT 0,
  -- A flat company-wide grant in MB, used instead of the per-seat allowance.
  -- Zero means "use the per-seat figure". Only the trial sets it.
  storage_flat_mb   INTEGER NOT NULL DEFAULT 0,
  max_file_size_mb  INTEGER NOT NULL DEFAULT 0,
  files_per_lead    INTEGER,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_limits_scoring_chk CHECK (ai_lead_scoring IN ('off', 'on', 'advanced')),
  CONSTRAINT plan_limits_api_chk     CHECK (api_access IN ('off', 'read_only', 'full_read_write'))
);

-- For databases that ran an earlier version of this seed, before storage
-- limits existed. Must precede the INSERT below, which writes these columns.
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS storage_gb_per_seat INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_flat_mb     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_file_size_mb    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS files_per_lead      INTEGER;


INSERT INTO public.plan_limits (
  id, name, monthly_price, annual_price, max_seats, max_admins,
  lead_limit, ai_draft_limit, ai_credit_limit, automation_rules, bulk_import,
  ai_lead_scoring, team_targets, api_access, pdf_export,
  storage_gb_per_seat, storage_flat_mb, max_file_size_mb, files_per_lead
) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  monthly_price    = EXCLUDED.monthly_price,
  annual_price     = EXCLUDED.annual_price,
  max_seats        = EXCLUDED.max_seats,
  max_admins       = EXCLUDED.max_admins,
  lead_limit       = EXCLUDED.lead_limit,
  ai_draft_limit   = EXCLUDED.ai_draft_limit,
  ai_credit_limit  = EXCLUDED.ai_credit_limit,
  automation_rules = EXCLUDED.automation_rules,
  bulk_import      = EXCLUDED.bulk_import,
  ai_lead_scoring  = EXCLUDED.ai_lead_scoring,
  team_targets     = EXCLUDED.team_targets,
  api_access       = EXCLUDED.api_access,
  pdf_export       = EXCLUDED.pdf_export,
  storage_gb_per_seat = EXCLUDED.storage_gb_per_seat,
  storage_flat_mb  = EXCLUDED.storage_flat_mb,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  files_per_lead   = EXCLUDED.files_per_lead,
  updated_at       = NOW();

-- Anyone signed in may read the price list; nobody may write it. There is
-- deliberately no INSERT/UPDATE/DELETE policy, so the table is writable only
-- by migrations and the service role. Without that, a customer could raise
-- their own limits with a single supabase-js call.
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_limits_read ON public.plan_limits;
CREATE POLICY plan_limits_read ON public.plan_limits
  FOR SELECT TO authenticated USING (true);

COMMIT;
`;
}

/** Rewrites the JSON-LD offer range that ships in index.html. */
function patchIndexHtml(plans) {
  const path = join(root, 'index.html');
  const prices = ['starter', 'growth', 'pro'].flatMap((id) => [
    plans[id].monthlyPrice,
    plans[id].annualPrice,
  ]);
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(/("lowPrice"\s*:\s*)"[^"]*"/, `$1"${low}"`)
    .replace(/("highPrice"\s*:\s*)"[^"]*"/, `$1"${high}"`)
    .replace(/("offerCount"\s*:\s*)"[^"]*"/, `$1"3"`);

  if (before !== after) writeFileSync(path, after);
  return { low, high, changed: before !== after };
}

/** Rewrites the pricing sentences in public/llms.txt. */
function patchLlmsTxt(plans, trial) {
  const path = join(root, 'public', 'llms.txt');
  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(
      /starting at ₹\d+ on annual billing/,
      `starting at ₹${plans.starter.annualPrice} on annual billing`,
    )
    .replace(/A \d+-day free trial/, `A ${trial.trialDays}-day free trial`)
    .replace(/includes \d+ telecallers/, `includes ${trial.includedTelecallers} telecallers`);

  if (before !== after) writeFileSync(path, after);
  return before !== after;
}

// Run through tsx (see the `gen:plans` script) so the TypeScript config can be
// imported directly rather than duplicated here.
async function main() {
  const { PRICING_PLANS, FREE_TRIAL_CONFIG } = await import('../src/config/pricing.ts');

  writeFileSync(SEED_PATH, buildSeedSql(PRICING_PLANS));
  console.log('wrote supabase/migrations/20260802000100_plan_limits_seed.sql');

  const html = patchIndexHtml(PRICING_PLANS);
  console.log(
    `index.html JSON-LD offer range ${html.low}-${html.high}` +
      (html.changed ? ' (updated)' : ' (already current)'),
  );

  console.log(`public/llms.txt ${patchLlmsTxt(PRICING_PLANS, FREE_TRIAL_CONFIG) ? '(updated)' : '(already current)'}`);
}

if (process.argv[1] && process.argv[1].endsWith('gen-plan-limits.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
