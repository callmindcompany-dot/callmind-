import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every inbound lead gets an owner the same way.
 *
 * The Integrations screen offers Manual and "Round Robin (Auto) — circulate
 * equally among active telecallers". One of the eight sources honoured it.
 *
 * The Express route behind /v1/webhooks/incoming/<id> calls
 * processInboundLead(), which reads the setting and rotates the team. The four
 * marketplace pollers and the edge webhook receiver each wrote
 * `assigned_to: "unassigned"` as a literal. So a company that switched Round
 * Robin on still had every IndiaMART, JustDial, TradeIndia and Facebook lead
 * dropped into a pool with nobody's name on it, and handed them out by hand,
 * while the setting told them the leads were being circulated.
 *
 * A second, quieter mismatch sat underneath it. team_settings.assignment_mode
 * defaults to 'round_robin' in the schema; the Integrations panel saves
 * 'RoundRobin'. Both code paths compared exactly, so a company that had never
 * opened the setting sat on a default that reads as Round Robin to a person and
 * matched nothing in the code.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const POLLERS = ['indiamart', 'justdial', 'tradeindia', 'facebook'] as const;
const RECEIVER = 'supabase/functions/webhook-receiver/index.ts';
const HELPER = 'supabase/functions/_shared/assignLead.ts';

/** The normalisation both sides must agree on. */
const isRoundRobin = (mode: string | null | undefined) =>
  (mode ?? '').replace(/[^a-z]/gi, '').toLowerCase() === 'roundrobin';

describe('inbound leads get an owner', () => {
  it('no ingest path hardcodes "unassigned" any more', () => {
    for (const p of POLLERS) {
      expect(code(`supabase/functions/${p}-poll/index.ts`), `${p} still hardcodes it`)
        .not.toMatch(/assigned_to:\s*"unassigned"/);
    }
    expect(code(RECEIVER)).not.toMatch(/assigned_to:\s*"unassigned"/);
  });

  it('every ingest path asks the same router', () => {
    for (const p of POLLERS) {
      const fn = code(`supabase/functions/${p}-poll/index.ts`);
      expect(fn, `${p} does not route`).toMatch(new RegExp(`pickAssignee\\(supabase, companyId, "${p}"\\)`));
    }
    expect(code(RECEIVER)).toMatch(/pickAssignee\(supabase, companyId, source\)/);
  });

  it('falls back to the pool rather than losing the lead', () => {
    // A routing failure must not cost the company the lead: unassigned is
    // visible to everyone, which a wrong assignment is not.
    const helper = code(HELPER);
    expect(helper).toMatch(/catch \(err\)[\s\S]{0,300}return UNASSIGNED/);
    // Admins and founders are not in the calling rotation.
    expect(helper).toMatch(/role !== "admin" && role !== "founder"/);
    // The rotation order must be stable or the shared counter means nothing.
    expect(helper).toMatch(/\.sort\(\)/);
  });

  it('uses the atomic counter, so two runs cannot pick the same agent', () => {
    expect(code(HELPER)).toMatch(/rpc\("increment_routing_index"/);
  });

  it('accepts how the setting is actually spelled, on both sides', () => {
    // The schema default and the client disagree; a company on the default was
    // silently treated as Manual.
    expect(isRoundRobin('round_robin')).toBe(true);
    expect(isRoundRobin('RoundRobin')).toBe(true);
    expect(isRoundRobin('Round Robin')).toBe(true);
    expect(isRoundRobin('Manual')).toBe(false);
    expect(isRoundRobin(null)).toBe(false);
    expect(isRoundRobin('')).toBe(false);

    // Both implementations must normalise, or the two paths disagree about
    // what the same stored value means.
    expect(code(HELPER)).toMatch(/replace\(\/\[\^a-z\]\/gi, ""\)\.toLowerCase\(\) === "roundrobin"/);
    expect(code('src/lib/dbAdapter.ts')).toMatch(
      /replace\(\/\[\^a-z\]\/gi, ''\)\.toLowerCase\(\) === 'roundrobin'/,
    );
  });
});
