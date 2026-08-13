import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every ingestion attempt must leave a row, especially the ones that failed.
 *
 * Ingestion had no memory. processInboundLead mapped fields, normalised the
 * phone, deduplicated and assigned an owner, and the only trace left was the
 * lead itself -- so "why did that lead not arrive?" had no answer, and every
 * status on the integrations screen ("Live", "Auto-Sync Active", "0 failed
 * syncs", "18ms") had nothing to read and was typed instead.
 *
 * The failing runs are the ones worth having and the easiest to lose: they are
 * exactly the paths that `continue` or return early. So the guard here is not
 * "startRun is called somewhere" but "finishRun is in a finally", which is what
 * makes the early exits count.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const POLLERS = ['indiamart', 'justdial', 'tradeindia', 'facebook'] as const;
const HELPER = 'supabase/functions/_shared/runLog.ts';
const RECEIVER = 'supabase/functions/webhook-receiver/index.ts';
const MIGRATION = 'supabase/migrations/20260819000300_integration_runs.sql';

describe('integration runs are recorded', () => {
  it('every poller opens and closes a run', () => {
    for (const p of POLLERS) {
      const fn = code(`supabase/functions/${p}-poll/index.ts`);
      expect(fn, `${p} does not open a run`).toMatch(
        new RegExp(`startRun\\(supabase, companyId, "${p}"`),
      );
      expect(fn, `${p} does not close one`).toContain('finishRun(supabase, run');
    }
  });

  it('closes the run in a finally, so early exits still count', () => {
    // The `continue` paths are the API errors -- an HTTP failure or a rejected
    // key. Closing outside a finally would record only the runs that went well.
    for (const p of POLLERS) {
      const fn = code(`supabase/functions/${p}-poll/index.ts`);
      expect(fn, `${p} closes its run outside a finally`).toMatch(
        /\}\s*finally\s*\{[\s\S]{0,400}finishRun/,
      );
    }
    expect(code(RECEIVER)).toMatch(/\}\s*finally\s*\{[\s\S]{0,400}finishRun/);
  });

  it('distinguishes a scheduled run from someone pressing Sync Now', () => {
    // A source that only ever runs on 'manual' is not connected in any useful
    // sense, however well each of those runs went.
    for (const p of POLLERS) {
      const fn = code(`supabase/functions/${p}-poll/index.ts`);
      expect(fn, `${p} cannot tell the two apart`).toMatch(/trigger: RunTrigger = "manual"/);
      expect(fn).toMatch(/body\.trigger === "schedule"/);
    }
    // And the scheduler has to send it.
    expect(read('supabase/migrations/20260819000200_integration_poll_schedule.sql'))
      .toMatch(/'trigger',\s*'schedule'/);
  });

  it('grades a partial ingest as partial rather than success or failure', () => {
    for (const p of POLLERS) {
      const fn = code(`supabase/functions/${p}-poll/index.ts`);
      expect(fn).toMatch(/"partial"/);
      expect(fn).toMatch(/errors\.length === 0/);
    }
  });

  it('does not let bookkeeping break ingestion', () => {
    // If the log insert fails the lead has already landed, and losing the
    // record is the lesser harm. This is the one place swallowing is right,
    // and it must stay confined to the helper.
    const helper = code(HELPER);
    expect(helper).toMatch(/catch \(err\)[\s\S]{0,200}console\.error/);
    expect(helper).toMatch(/if \(!handle\.id\) return;/);
  });

  it('truncates the provider error instead of storing a whole page', () => {
    expect(code(HELPER)).toMatch(/\.slice\(0, 1000\)/);
  });

  it('treats a duplicate as a normal outcome, not a failure', () => {
    // A customer enquiring twice is not a broken integration, and marking it
    // failed would put a red mark on a healthy source.
    const recv = read(RECEIVER);
    const dup = recv.slice(recv.indexOf('if (duplicate)'));
    expect(dup.slice(0, 500)).toMatch(/runOutcome = "success"/);
    expect(dup.slice(0, 500)).toMatch(/runDuplicate = 1/);
  });

  it('keeps the run record admin-only and read-only', () => {
    const sql = read(MIGRATION);
    // The error column holds provider responses, which for these vendors carry
    // the API key in the request URL.
    expect(sql).toMatch(/get_my_role\(\) IN \('founder', 'admin'\)/);
    // No write policy: a customer inventing a successful run defeats the point.
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,200}integration_runs[\s\S]{0,200}FOR (ALL|INSERT|UPDATE)/);
  });
});
