import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PRICING_PLANS } from '../config/pricing';
import { describePlan, MARKETING_PLANS } from '../website/data/planCopy';

/**
 * A plan may not advertise a capability that has no implementation.
 *
 * Five did. They were checked against the live database and the source on
 * 13 Aug 2026, and every one of them was on a paid card:
 *
 *   AI lead scoring      Growth sold `true`, Pro sold `"advanced"`. Every lead
 *                        in the database had a null neural_score, and no code
 *                        writes the column -- the leads list only reads and
 *                        sorts by it, which is what made it look built.
 *   REST API             Growth sold "read_only", Pro "full_read_write". No
 *                        api_keys table, no issuance, no route that
 *                        authenticates a customer key.
 *   WhatsApp Business    Growth and Pro. Neither direction reached Meta, and
 *                        the send path reported success anyway.
 *   Pipeline stages      All three, as 5 / 15 / unlimited. No pipeline_stages
 *                        table; every tenant has the same stages, so the
 *                        number rose with the price and nothing else did.
 *   365 days audit logs  Pro. No retention anywhere, and pg_cron is not
 *                        installed on this database to run one.
 *
 * The checks below are deliberately tied to the implementation rather than
 * hardcoding `false`, so that switching a flag on in the same change that
 * builds the feature passes, and switching it on alone does not. That is the
 * distinction the pricing page could not make on its own: it renders straight
 * from src/config/pricing.ts, so a flag flipped by hand becomes a public claim
 * with nothing behind it.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Every source file that could plausibly implement a feature. */
const walk = (dir: string, out: string[] = []): string[] => {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
};

const SOURCES = [
  ...walk('src/components'),
  ...walk('src/hooks'),
  ...walk('src/routes'),
  ...walk('src/services'),
  ...walk('src/lib'),
  ...walk('supabase/functions'),
];

const ALL_PLANS = Object.values(PRICING_PLANS);

describe('every plan claim has an implementation', () => {
  it('does not sell AI lead scoring while nothing writes a score', () => {
    // A write looks like `neural_score:` inside an insert/update payload.
    // Reads (`row.neural_score`) and the sort map (`column: 'neural_score'`)
    // do not match, and src/types is excluded because a declaration is not an
    // implementation -- that distinction is what this repo's type file got
    // wrong when it declared thirty columns on an eighteen-column table.
    const writers = SOURCES.filter((f) => /\bneural_score\s*:/.test(read(f)));

    if (writers.length === 0) {
      for (const plan of ALL_PLANS) {
        expect(plan.aiLeadScoring, `${plan.id} sells scoring that nothing computes`).toBe(false);
      }
    }
  });

  it('does not sell a REST API while no key can be issued or accepted', () => {
    const migrations = fs
      .readdirSync(path.join(ROOT, 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'));
    const hasKeyTable = migrations.some((f) =>
      /create table[^;]*\b(api_keys|workspace_api_keys)\b/i.test(read(`supabase/migrations/${f}`)),
    );

    if (!hasKeyTable) {
      for (const plan of ALL_PLANS) {
        expect(plan.apiAccess, `${plan.id} sells an API with no key table`).toBe(false);
      }
    }
  });

  it('does not sell WhatsApp sending until a real send has been seen', () => {
    /*
     * This used to look for graph.facebook.com in the sender, because the plan
     * was to call Meta directly. It sends through the customer's own BSP now
     * (WATI, Interakt or AiSensy), so that string is the wrong signal.
     *
     * Dispatch code existing is also not enough on its own. The request shapes
     * came from published documentation and have never been run against a live
     * account -- there is no test account for any of the three -- so "it
     * compiles and looks right" is exactly the confidence this repository has
     * been burned by. The gate is a human confirming a message arrived, which
     * is what flipping this constant records.
     *
     * When somebody sends a real WhatsApp message from CallMind and sees it on
     * a phone, set this to true in the same change that sets whatsappType.
     */
    const VERIFIED_AGAINST_A_LIVE_ACCOUNT = false;

    if (!VERIFIED_AGAINST_A_LIVE_ACCOUNT) {
      for (const plan of ALL_PLANS) {
        expect(plan.whatsappType, `${plan.id} sells WhatsApp sending nobody has watched work`).toBe(
          'manual',
        );
      }
    }

    // Whatever the flag says, the sender must not be a stub again. Comments
    // stripped: the file's own docstring quotes the fabricated
    // "wamid.HBgLOTE5..." it used to return, and matching that would fail the
    // file for describing the bug it fixed.
    const sender = read('supabase/functions/send-whatsapp-message/index.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(sender).toContain('sendTemplate');
    expect(sender).not.toMatch(/wamid\./);
  });

  it('prints none of the five removed claims on any card', () => {
    const forbidden = [
      /pipeline stage/i,
      /AI lead scoring/i,
      /REST API/i,
      /WhatsApp Business API/i,
      /approved templates/i,
      /audit logs?/i,
    ];

    for (const plan of ALL_PLANS) {
      for (const line of describePlan(plan)) {
        for (const pattern of forbidden) {
          expect(line, `${plan.id} advertises "${line}"`).not.toMatch(pattern);
        }
      }
    }
  });

  it('claims no plan is popular before one has been bought', () => {
    // Zero completed payments exist. "Most Popular" was a fact about customers
    // that do not exist, in the same family as "500+ businesses".
    for (const plan of MARKETING_PLANS) {
      expect(plan.badge ?? '').not.toMatch(/popular/i);
    }
  });

  it('describes each plan by something that separates it from the one below', () => {
    // Growth's line named "automation, AI scoring and team targets": scoring
    // does not exist and team targets are on every plan including the trial,
    // so one of the three was a reason to pay.
    for (const plan of MARKETING_PLANS) {
      expect(plan.description).not.toMatch(/AI scoring|API access|multi-team hierarchy/i);
    }
  });
});
