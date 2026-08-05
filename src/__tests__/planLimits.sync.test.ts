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
import { PRICING_PLANS } from '../config/pricing';

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
    // Starter has bulk import off -> 0, not NULL (NULL would mean unlimited).
    expect(sql).toMatch(/\('starter',[^\n]*, 0, 'off', false, 'off', false, \d+, \d+, \d+(?:, \d+)?\)/);
    // The trial's storage is a flat MB grant, so its per-seat figure is 0.
    expect(sql).toMatch(/\('trial',[^\n]*, false, 0, 500, \d+(?:, \d+)?\)/);
  });
});
