/**
 * The anti-drift guard.
 *
 * Prices and limits live in src/config/pricing.ts; Postgres reads them from
 * public.plan_limits, seeded by a generated migration. If someone edits one
 * side and not the other, the app and the database start enforcing different
 * numbers -- silently, because nothing would otherwise notice.
 *
 * This test reads the generated SQL back and compares it to the config. It
 * fails if they disagree, and the fix is always `npm run gen:plans`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSeedSql, SEED_PATH } from '../../scripts/gen-plan-limits.mjs';
import { PRICING_PLANS, resolveLimit } from '../config/pricing';

describe('plan_limits seed', () => {
  it('matches src/config/pricing.ts', () => {
    const onDisk = readFileSync(SEED_PATH, 'utf8');
    const expected = buildSeedSql(PRICING_PLANS);

    // Normalise line endings: git may check the file out with CRLF on Windows.
    expect(onDisk.replace(/\r\n/g, '\n')).toBe(expected.replace(/\r\n/g, '\n'));
  });

  it('seeds every plan id the companies CHECK constraint allows', () => {
    const sql = readFileSync(SEED_PATH, 'utf8');
    for (const id of ['trial', 'starter', 'growth', 'pro']) {
      expect(sql).toContain(`('${id}',`);
    }
  });

  it('grants no write policy on plan_limits', () => {
    // A customer who could UPDATE this table could raise their own limits.
    const sql = readFileSync(SEED_PATH, 'utf8');
    expect(sql).toMatch(/FOR SELECT TO authenticated/);
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
  });

  it('encodes unlimited as NULL and off as 0, never as a huge number', () => {
    const sql = readFileSync(SEED_PATH, 'utf8');
    // Pro is unlimited on leads, drafts, credits and bulk import.
    expect(sql).toMatch(/\('pro', 'Pro', \d+, \d+, \d+, \d+, NULL, NULL, NULL, \d+, NULL,/);
    // The convention that matters, checked on the value rather than on a
    // column position: `false` means off and must seed as 0, because NULL in
    // plan_limits means unlimited. An earlier version of this test pinned the
    // whole starter row by regex and broke the moment a capability moved.
    expect(PRICING_PLANS.trial.bulkLeadExport).toBe(false);
    expect(sql).not.toMatch(/,\s*NULL\s*,[^\n]*-- off/);
    // The trial's storage is a flat MB grant, so its per-seat figure is 0.
    expect(PRICING_PLANS.trial.storageGbPerSeat).toBe(0);
    expect(PRICING_PLANS.trial.storageFlatMb).toBe(500);
  });
});

/**
 * Paying must never take something away.
 *
 * The trial samples the product — a small bulk import, team targets, PDF
 * reports — so that a company can see what it is buying. The moment it does
 * that, every one of those has to survive the purchase, or converting from the
 * trial to Starter *removes* features and the customer is worse off for paying
 * ₹699 a seat.
 *
 * This is easy to break by accident: the two are edited in different places in
 * the same file, months apart, and nothing else would notice. Before this test
 * existed the trial had every capability off and so did Starter, which hid the
 * problem by making both equally empty.
 */
describe('a customer never loses a capability by paying', () => {
  const LADDER = ['trial', 'starter', 'growth', 'pro'] as const;

  /** Capability flags, as a comparable number. Off is 0, on is 1. */
  const BOOLEAN_FEATURES = [
    'teamTargets', 'pdfExport', 'bulkLeadExport', 'videoUpload', 'emailFromOwnDomain',
  ] as const;

  /** Numeric or "unlimited" allowances. */
  const NUMERIC_LIMITS = [
    'maxSeats', 'maxAdmins', 'leadLimit', 'aiDraftLimit', 'aiCreditLimit',
    'pipelineStages', 'automationRules', 'bulkImport', 'filesPerLead',
    'recycleBinDays', 'leadSources', 'maxFileSizeMb',
  ] as const;

  it.each(LADDER.slice(0, -1).map((lower, i) => [lower, LADDER[i + 1]] as const))(
    '%s never has more than %s',
    (lowerId, higherId) => {
      const lower = PRICING_PLANS[lowerId];
      const higher = PRICING_PLANS[higherId];

      for (const f of BOOLEAN_FEATURES) {
        if (lower[f] === true) {
          expect(higher[f], `${higherId} drops ${f} that ${lowerId} has`).toBe(true);
        }
      }

      for (const m of NUMERIC_LIMITS) {
        const a = resolveLimit(lower[m] as never);
        const b = resolveLimit(higher[m] as never);
        expect(b, `${higherId}.${m} (${b}) is below ${lowerId}.${m} (${a})`).toBeGreaterThanOrEqual(a);
      }
    },
  );

  it('the trial samples something worth paying to keep', () => {
    // A trial with every capability off shows the buyer nothing, which is how
    // this started: trial and Starter were both empty, so converting bought
    // volume and no new ability at all.
    const sampled = BOOLEAN_FEATURES.filter((f) => PRICING_PLANS.trial[f] === true);
    expect(sampled.length, 'the trial demonstrates no capability').toBeGreaterThan(0);
    expect(resolveLimit(PRICING_PLANS.trial.bulkImport)).toBeGreaterThan(0);
  });

  it('switches on nothing that is not built', () => {
    // Verified against the code, not assumed: nothing writes leads.neural_score,
    // no route authenticates a workspace API key, and no route sends a WhatsApp
    // message. Sampling these on the trial would demonstrate an empty screen.
    expect(PRICING_PLANS.trial.aiLeadScoring).toBe(false);
    expect(PRICING_PLANS.trial.apiAccess).toBe(false);
    expect(PRICING_PLANS.trial.whatsappType).toBe('manual');
    expect(PRICING_PLANS.trial.smsCredits).toBeUndefined();
    expect(PRICING_PLANS.trial.whiteLabel).toBeUndefined();
  });
});
