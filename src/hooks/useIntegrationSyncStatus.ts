import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

/**
 * Whether each lead source is actually on a schedule.
 *
 * The integrations hub used to state this from a string literal: cards read
 * "Live", "Auto-Sync Active" and "New enquiries syncing automatically" whenever
 * a config existed. Nothing was ever scheduled -- the four poll functions were
 * invoked from a Sync Now button and nowhere else, because pg_cron was not
 * installed -- so a customer who connected IndiaMART and walked away received
 * nothing while the screen told them it was live.
 *
 * public.integration_sync_status() reports what cron.job actually holds
 * (20260819000200_integration_poll_schedule.sql). Asking it means the claim
 * cannot drift from the truth again: with no schedule the card says manual, and
 * there is no string to edit to make it say otherwise.
 */

export type SyncProvider = 'indiamart' | 'justdial' | 'tradeindia' | 'facebook';

export interface SyncStatusRow {
  provider: SyncProvider;
  /** The cron expression, e.g. "*&#47;10 * * * *". Null when unscheduled. */
  schedule: string | null;
  is_scheduled: boolean;
}

/** "*&#47;10 * * * *" -> "every 10 minutes". Falls back to the raw expression. */
export function describeSchedule(schedule: string | null): string | null {
  if (!schedule) return null;
  const everyN = schedule.match(/^\*\/(\d+) \* \* \* \*$/);
  if (everyN) {
    const n = Number(everyN[1]);
    return `every ${n} minute${n === 1 ? '' : 's'}`;
  }
  return schedule;
}

export function useIntegrationSyncStatus() {
  return useQuery<Record<SyncProvider, SyncStatusRow>>({
    queryKey: ['integrationSyncStatus'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('integration_sync_status');

      // Throwing rather than assuming "unscheduled": the two states drive
      // different sentences on the card, and guessing one of them is how the
      // wrong sentence got there in the first place.
      if (error) throw error;

      const out = {} as Record<SyncProvider, SyncStatusRow>;
      for (const row of (data ?? []) as SyncStatusRow[]) {
        out[row.provider] = { ...row, is_scheduled: row.is_scheduled === true };
      }
      return out;
    },
    // A schedule changes when somebody runs a SQL function, not while the page
    // is open. No need to ask often.
    staleTime: 5 * 60_000,
  });
}
