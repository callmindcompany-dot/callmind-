import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The health screen may not report a number it did not measure.
 *
 * Four of its figures could not have been right, and there was no error state
 * at all, so a failed request rendered as a confident row of zeroes:
 *
 *   Three queries -- team_settings, import_logs, audit_logs -- had `error`
 *   destructured away and fell back to `|| []`. "0 failed syncs" and "the query
 *   failed" produced the same screen, captioned "All channels sync healthy".
 *
 *   activeIntegrationsCount counted seven team_settings.*_config columns, none
 *   of which has ever existed, so it was 0 for every company. isRateLimited
 *   scanned the same columns, so the header badge was permanently
 *   "Operational".
 *
 *   avgWebhookResponseTime parsed "123ms" out of audit log details that nothing
 *   writes, and fell back to a literal 18 in both the hook and the component.
 *   Every customer was shown "18ms / Ultra low latency response" as telemetry.
 *
 *   apiQuotaUsagePct divided by a hardcoded 5,000. The real ceilings are
 *   1,000 / 50,000 / 250,000 / unlimited in src/config/pricing.ts.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const HOOK = 'src/hooks/useIntegrationHealth.ts';
const VIEW = 'src/components/integrations/HealthDashboard.tsx';

describe('the health screen reports only what it measured', () => {
  it('throws on every query rather than falling back to a fallback', () => {
    const hook = code(HOOK);
    // One `if (…error) throw` per query. Swallowing any of them puts the
    // original fault back for that metric alone, which is harder to spot.
    const throws = hook.match(/if \([a-zA-Z]*[Ee]rror[^)]*\) throw/g) ?? [];
    expect(throws.length, 'a query result is being ignored again').toBeGreaterThanOrEqual(4);
    expect(hook).not.toMatch(/const \{ data: \w+ \} = await supabase/);
  });

  it('invents no latency figure', () => {
    const hook = code(HOOK);
    const view = code(VIEW);
    expect(hook).not.toMatch(/avgWebhookResponseTime/);
    expect(view).not.toMatch(/avgWebhookResponseTime/);
    // The literal fallback existed in both files.
    expect(view).not.toMatch(/\|\|\s*18\}?ms/);
    expect(view).not.toMatch(/Ultra low latency/i);
  });

  it('uses the plan lead limit instead of a hardcoded one', () => {
    const hook = code(HOOK);
    const view = code(VIEW);
    expect(hook).toContain('plan_limits');
    expect(hook).toMatch(/leadLimit/);
    // 5,000 is not the ceiling of any plan.
    expect(view, 'the invented quota is back').not.toMatch(/5,?000 leads/);
    expect(hook).not.toMatch(/const leadLimit = 5000/);
  });

  it('counts integrations from the table they actually live in', () => {
    const hook = code(HOOK);
    expect(hook).toContain('integration_credentials');
    for (const dead of ['facebook_config', 'indiamart_config', 'justdial_config', 'webhook_config']) {
      expect(hook, `${dead} does not exist on team_settings`).not.toContain(dead);
    }
  });

  it('renders a failure as unknown, not as zero', () => {
    const view = code(VIEW);
    expect(view).toMatch(/isError/);
    // The distinction has to reach the reader in words, not just in styling.
    expect(view).toMatch(/not zero|unknown/i);
  });

  it('does not caption an empty result as healthy', () => {
    const view = code(VIEW);
    // A channel that has never run also reports zero failures.
    expect(view).not.toMatch(/All channels sync healthy/);
    expect(view).not.toMatch(/Live syncing active/);
  });
});
