import { describe, it, expect } from 'vitest';
import {
  deriveIntegrationState,
  timeAgo,
  BROKEN_AFTER_CONSECUTIVE_FAILS,
  IDLE_AFTER_HOURS,
} from '../lib/integrationState';
import type { IntegrationRunSummary } from '../hooks/useIntegrationRuns';

/**
 * The hub had two states -- "Live" and "Setup Ready" -- decided by whether a
 * config object existed. A source whose key was revoked on Tuesday looked
 * identical to one that had delivered a lead a minute ago, and both looked
 * identical to one that had never run. Every card also said "Auto-Sync Active"
 * while nothing was scheduled.
 *
 * The state that matters most and did not exist is `idle`: a quiet source and a
 * broken source cannot be told apart by lead volume, and they need opposite
 * responses. That distinction is the reason for this module.
 */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const summary = (over: Partial<IntegrationRunSummary> = {}): IntegrationRunSummary => ({
  provider: 'indiamart',
  last_run_at: hoursAgo(0.2),
  last_outcome: 'success',
  last_error: null,
  last_success_at: hoursAgo(0.2),
  leads_24h: 3,
  failures_24h: 0,
  consecutive_fails: 0,
  ...over,
});

describe('deriveIntegrationState', () => {
  it('says not connected before there are credentials', () => {
    const s = deriveIntegrationState({ connected: false, delivery: 'polled' });
    expect(s.health).toBe('not_connected');
    // Not an error state -- nobody has done anything wrong yet.
    expect(s.tone).toBe('idle');
  });

  it('separates a working source from one that has never run', () => {
    expect(deriveIntegrationState({ connected: true, delivery: 'polled', scheduled: true }).health)
      .toBe('never_run');
    expect(
      deriveIntegrationState({
        connected: true, delivery: 'polled', scheduled: true, summary: summary(),
      }).health,
    ).toBe('working');
  });

  it('warns when a connected source has no schedule at all', () => {
    // The invisible case: the customer has done their part and the product is
    // never going to fetch anything. This used to read "Live".
    const never = deriveIntegrationState({ connected: true, delivery: 'polled', scheduled: false });
    expect(never.health).toBe('never_run');
    expect(never.detail).toMatch(/Automatic sync is off/);
    expect(never.tone).toBe('warn');

    const ran = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: false, summary: summary(),
    });
    expect(ran.label).toBe('Manual only');
    expect(ran.tone).toBe('warn');
  });

  it('calls it broken only after a run of failures, not one', () => {
    const one = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({ consecutive_fails: 1, last_outcome: 'failed' }),
    });
    expect(one.health).toBe('degraded');

    const many = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({ consecutive_fails: BROKEN_AFTER_CONSECUTIVE_FAILS, last_outcome: 'failed' }),
    });
    expect(many.health).toBe('broken');
    expect(many.priority).toBeLessThan(one.priority);
  });

  it('treats a partial import as degraded', () => {
    // Some leads landed and some did not: not a failure, not fine.
    const s = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({ last_outcome: 'partial' }),
    });
    expect(s.health).toBe('degraded');
    expect(s.detail).toMatch(/did not import/);
  });

  it('distinguishes quiet from broken', () => {
    // This is the whole point. Both have zero leads today.
    const quiet = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({
        leads_24h: 0,
        last_success_at: hoursAgo(IDLE_AFTER_HOURS + 24),
        last_run_at: hoursAgo(IDLE_AFTER_HOURS + 24),
      }),
    });
    const broken = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({ leads_24h: 0, consecutive_fails: 4, last_outcome: 'failed' }),
    });

    expect(quiet.health).toBe('idle');
    expect(broken.health).toBe('broken');
    expect(quiet.tone).not.toBe('bad');
    expect(broken.priority).toBeLessThan(quiet.priority);
  });

  it('does not call a healthy source idle just for a slow day', () => {
    // No leads today, but it succeeded an hour ago. That is a slow day.
    const s = deriveIntegrationState({
      connected: true, delivery: 'polled', scheduled: true,
      summary: summary({ leads_24h: 0, last_success_at: hoursAgo(1), last_run_at: hoursAgo(1) }),
    });
    expect(s.health).toBe('working');
  });

  it('does not ask a push source about its schedule', () => {
    // Google Ads and webhooks are delivered by the sender; having no cron job
    // is normal for them and must not read as a fault.
    const s = deriveIntegrationState({
      connected: true, delivery: 'push', scheduled: false, summary: summary(),
    });
    expect(s.health).toBe('working');
  });

  it('orders the states so the broken ones come first', () => {
    const p = (i: Parameters<typeof deriveIntegrationState>[0]) => deriveIntegrationState(i).priority;
    const broken = p({ connected: true, delivery: 'polled', scheduled: true, summary: summary({ consecutive_fails: 3, last_outcome: 'failed' }) });
    const degraded = p({ connected: true, delivery: 'polled', scheduled: true, summary: summary({ consecutive_fails: 1, last_outcome: 'failed' }) });
    const working = p({ connected: true, delivery: 'polled', scheduled: true, summary: summary() });
    const absent = p({ connected: false, delivery: 'polled' });

    expect(broken).toBeLessThan(degraded);
    expect(degraded).toBeLessThan(working);
    expect(working).toBeLessThan(absent);
  });
});

describe('timeAgo', () => {
  it('reads the way a person would say it', () => {
    expect(timeAgo(null)).toBeNull();
    expect(timeAgo(hoursAgo(0.005))).toBe('just now');
    expect(timeAgo(hoursAgo(0.5))).toBe('30 min ago');
    expect(timeAgo(hoursAgo(5))).toBe('5 hr ago');
    expect(timeAgo(hoursAgo(24))).toBe('1 day ago');
    expect(timeAgo(hoursAgo(72))).toBe('3 days ago');
  });

  it('does not report a future timestamp as negative', () => {
    // Clock skew between the database and the browser is normal.
    expect(timeAgo(new Date(Date.now() + 60_000).toISOString())).toBe('just now');
  });
});
