import type { IntegrationRunSummary } from '@/hooks/useIntegrationRuns';

/**
 * What a lead source is actually doing, derived rather than declared.
 *
 * The hub used to have two states, "Live" and "Setup Ready", decided by
 * whether a config object existed. So a source whose key had been revoked on
 * Tuesday looked exactly like one that had delivered a lead a minute ago, and
 * both looked exactly like one that had never run at all. Every card said
 * "Live" and "Auto-Sync Active" whether or not anything was scheduled --
 * nothing was.
 *
 * The state that mattered most and did not exist is `idle`. A quiet source and
 * a broken source are indistinguishable from lead volume alone, and they need
 * opposite responses: one is fine, the other is losing you business every hour.
 * Telling them apart needs the run history, which is why this could not be
 * written before integration_runs existed.
 */

export type IntegrationHealth =
  | 'not_connected'
  | 'never_run'
  | 'working'
  | 'idle'
  | 'degraded'
  | 'broken';

/** How leads from this source are supposed to arrive. */
export type DeliveryKind = 'polled' | 'push' | 'manual';

export interface IntegrationStateInput {
  connected: boolean;
  delivery: DeliveryKind;
  /** Only meaningful for `polled`: whether a cron job exists for it. */
  scheduled?: boolean;
  summary?: IntegrationRunSummary;
}

export interface IntegrationState {
  health: IntegrationHealth;
  /** Short label for the badge. */
  label: string;
  /** One line under it, saying what to do or what happened. */
  detail: string;
  /** Sort key: lower comes first, because it needs attention sooner. */
  priority: number;
  tone: 'ok' | 'warn' | 'bad' | 'idle';
}

/** Two consecutive failures is a pattern; one is a blip worth watching. */
export const BROKEN_AFTER_CONSECUTIVE_FAILS = 2;

/** A scheduled source with no leads for this long is quiet, not necessarily broken. */
export const IDLE_AFTER_HOURS = 48;

const hoursSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms < 0 ? 0 : ms / 3_600_000;
};

/** "4 minutes ago", "3 days ago". Null input gives null. */
export function timeAgo(iso: string | null): string | null {
  const h = hoursSince(iso);
  if (h === null) return null;
  if (h < 1 / 60) return 'just now';
  if (h < 1) return `${Math.round(h * 60)} min ago`;
  if (h < 24) return `${Math.round(h)} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function deriveIntegrationState(input: IntegrationStateInput): IntegrationState {
  const { connected, delivery, scheduled, summary } = input;

  if (!connected) {
    return {
      health: 'not_connected',
      label: 'Not connected',
      detail: 'Add credentials to start receiving leads',
      priority: 60,
      tone: 'idle',
    };
  }

  // Connected but nothing has ever run. For a polled source with no schedule
  // this is the common and invisible case: the customer has done their part
  // and the product is simply not going to fetch anything.
  if (!summary || !summary.last_run_at) {
    if (delivery === 'polled' && !scheduled) {
      return {
        health: 'never_run',
        label: 'Never run',
        detail: 'Automatic sync is off — use Sync Now, or switch it on',
        priority: 20,
        tone: 'warn',
      };
    }
    return {
      health: 'never_run',
      label: 'Never run',
      detail: delivery === 'push' ? 'Waiting for the first delivery' : 'No runs recorded yet',
      priority: 30,
      tone: 'warn',
    };
  }

  const lastRun = timeAgo(summary.last_run_at);

  if (summary.consecutive_fails >= BROKEN_AFTER_CONSECUTIVE_FAILS) {
    return {
      health: 'broken',
      label: 'Broken',
      detail: `${summary.consecutive_fails} runs failed in a row — last ${lastRun}`,
      priority: 0,
      tone: 'bad',
    };
  }

  if (summary.consecutive_fails > 0 || summary.last_outcome === 'partial') {
    return {
      health: 'degraded',
      label: 'Degraded',
      detail:
        summary.last_outcome === 'partial'
          ? `Some leads did not import — last run ${lastRun}`
          : `Last run failed ${lastRun}, earlier ones worked`,
      priority: 10,
      tone: 'warn',
    };
  }

  // Healthy, but is it doing anything? A polled source with no schedule only
  // runs when a person remembers to press a button, which is worth saying out
  // loud rather than colouring green.
  if (delivery === 'polled' && !scheduled) {
    return {
      health: 'idle',
      label: 'Manual only',
      detail: `Automatic sync is off — last run ${lastRun}`,
      priority: 25,
      tone: 'warn',
    };
  }

  const quietFor = hoursSince(summary.last_success_at ?? summary.last_run_at);
  if (summary.leads_24h === 0 && quietFor !== null && quietFor > IDLE_AFTER_HOURS) {
    return {
      health: 'idle',
      label: 'Idle',
      detail: `Running fine, no leads for ${Math.round(quietFor / 24)} days`,
      priority: 40,
      tone: 'idle',
    };
  }

  return {
    health: 'working',
    label: 'Working',
    detail:
      summary.leads_24h > 0
        ? `${summary.leads_24h} lead${summary.leads_24h === 1 ? '' : 's'} today — last run ${lastRun}`
        : `Last run ${lastRun}, no leads yet today`,
    priority: 50,
    tone: 'ok',
  };
}
