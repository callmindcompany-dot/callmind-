import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { describeSchedule } from '../hooks/useIntegrationSyncStatus';

/**
 * The hub may not claim automatic syncing it cannot demonstrate.
 *
 * Every polled card said "Live" and "Auto-Sync Active" the moment a config
 * existed, and "New enquiries syncing automatically" in the description.
 * Nothing was scheduled: the four poll functions are invoked from a single
 * pollNowMutation behind a Sync Now button, pg_cron was not installed, the only
 * GitHub workflow has no `schedule:` trigger, and there is no Vercel or Netlify
 * cron config. A customer who connected IndiaMART and walked away received
 * nothing while the screen told them it was live.
 *
 * The fix is not better wording. It is that the sentence is now derived from
 * cron.job through public.integration_sync_status(), so it cannot be typed back
 * in. These guard that property rather than the presence of any given string.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const HUB = 'src/components/integrations/IntegrationHub.tsx';
const HOOK = 'src/hooks/useIntegrationSyncStatus.ts';
const MIGRATION = 'supabase/migrations/20260819000200_integration_poll_schedule.sql';

describe('the hub cannot invent a sync schedule', () => {
  it('states no polled status as a literal', () => {
    const hub = code(HUB);
    expect(hub, 'the old claim is back').not.toMatch(/Auto-Sync Active/i);
    expect(hub).not.toMatch(/syncing automatically/i);
    expect(hub).not.toMatch(/polling active/i);
  });

  it('derives the four polled cards from the database', () => {
    const hub = code(HUB);
    expect(hub).toContain('useIntegrationSyncStatus');
    // Each polled provider goes through the same helper, so none of them can
    // be given a hand-written status.
    for (const provider of ['indiamart', 'justdial', 'tradeindia', 'facebook']) {
      expect(hub, `${provider} is not derived`).toContain(`polled('${provider}'`);
    }
  });

  it('says "manual" when there is no schedule, rather than nothing', () => {
    // The dangerous state is a connected source with no schedule: that is
    // exactly when the old card said "Live". It has to name the limitation.
    const hub = code(HUB);
    expect(hub).toMatch(/Manual sync only/i);
  });

  it('throws instead of assuming unscheduled when the query fails', () => {
    const hook = code(HOOK);
    expect(hook).toMatch(/if \(error\) throw error;/);
    expect(hook).not.toMatch(/return \{\} as/);
  });

  it('reads the schedule from cron.job, and exposes no command', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/FROM \(VALUES[\s\S]*?LEFT JOIN cron\.job/);
    // command is what would carry a secret if one were ever inlined there.
    const fnBody = sql.slice(sql.indexOf('integration_sync_status'));
    expect(fnBody.slice(0, fnBody.indexOf('$$;'))).not.toMatch(/j\.command/);
  });

  it('keeps the service key out of the cron command', () => {
    const sql = read(MIGRATION);
    // The job calls a function that reads Vault at run time; the key must not
    // be interpolated into cron.schedule, because cron.job.command is plain text.
    expect(sql).toMatch(/cron\.schedule\('poll-indiamart'/);
    expect(sql).toMatch(/run_integration_poll\('indiamart'\)/);
    expect(sql).toMatch(/vault\.decrypted_secrets/);
  });

  it('refuses to poll rather than doing nothing quietly', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/RAISE EXCEPTION[\s\S]{0,200}not configured/i);
  });

  it('turns a cron expression into something a customer can read', () => {
    expect(describeSchedule('*/10 * * * *')).toBe('every 10 minutes');
    expect(describeSchedule('*/1 * * * *')).toBe('every 1 minute');
    expect(describeSchedule(null)).toBeNull();
    // Anything unrecognised falls through rather than being described wrongly.
    expect(describeSchedule('0 9 * * 1')).toBe('0 9 * * 1');
  });

  it('has the pollers reading the table the credentials actually live in', () => {
    // Phase 1 moved credentials off team_settings, which never had the columns
    // these functions selected -- so every poll failed with 42703 whether it
    // was scheduled or not.
    for (const provider of ['indiamart', 'justdial', 'tradeindia', 'facebook']) {
      const fn = read(`supabase/functions/${provider}-poll/index.ts`);
      expect(fn, `${provider}-poll still reads team_settings`).not.toMatch(
        /from\("team_settings"\)/,
      );
      expect(fn).toContain('integration_credentials');
    }
    // The webhook receiver had the same fault, and it is the one path that
    // needs no scheduler at all.
    const wh = read('supabase/functions/webhook-receiver/index.ts');
    expect(wh).toContain('integration_credentials');
    expect(wh).not.toMatch(/select\("webhook_config, googleads_config/);
  });
});
