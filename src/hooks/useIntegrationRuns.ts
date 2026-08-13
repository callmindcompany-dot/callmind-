import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

/**
 * What each lead source has actually been doing.
 *
 * Ingestion had no memory: a poll ran, leads appeared or did not, and nothing
 * was left behind. That is why every status on this screen had to be typed --
 * "Live", "Auto-Sync Active", "0 failed syncs", "18ms" -- there was nothing to
 * read. public.integration_runs records one row per attempt
 * (20260819000300_integration_runs.sql), and this is the read side.
 *
 * Admin-only in the database, because a failed run's error text is the
 * provider's raw response and can contain the request URL, which for these
 * vendors carries the API key in the query string. The Integrations screen is
 * already behind RoleGate requireAdmin.
 */

export interface IntegrationRunSummary {
  provider: string;
  last_run_at: string | null;
  last_outcome: 'success' | 'partial' | 'failed' | null;
  last_error: string | null;
  last_success_at: string | null;
  leads_24h: number;
  failures_24h: number;
  /** Runs failed since the last one that did not. Separates a blip from an outage. */
  consecutive_fails: number;
}

export interface IntegrationRun {
  id: string;
  provider: string;
  trigger: 'schedule' | 'manual' | 'push';
  started_at: string;
  finished_at: string | null;
  outcome: 'success' | 'partial' | 'failed' | null;
  leads_created: number;
  leads_duplicate: number;
  error: string | null;
}

/** One row per configured provider, for the hub's cards. */
export function useIntegrationRunSummary() {
  return useQuery<Record<string, IntegrationRunSummary>>({
    queryKey: ['integrationRunSummary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('integration_run_summary');

      // A telecaller is refused this by design and should not see a broken
      // screen; anything else is a real failure and must not be reported as
      // "this source has never run", which is a different claim.
      if (error && error.code !== '42501') throw error;

      const out: Record<string, IntegrationRunSummary> = {};
      for (const row of (data ?? []) as IntegrationRunSummary[]) {
        out[row.provider] = {
          ...row,
          leads_24h: Number(row.leads_24h ?? 0),
          failures_24h: Number(row.failures_24h ?? 0),
          consecutive_fails: Number(row.consecutive_fails ?? 0),
        };
      }
      return out;
    },
    staleTime: 30_000,
  });
}

/** The run history for one source, newest first. */
export function useIntegrationRuns(companyId: string | null, provider: string | null, limit = 25) {
  return useQuery<IntegrationRun[]>({
    queryKey: ['integrationRuns', companyId, provider, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_runs')
        .select('id, provider, trigger, started_at, finished_at, outcome, leads_created, leads_duplicate, error')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .order('started_at', { ascending: false })
        .limit(limit);

      // "This source has never run" and "the query failed" are different
      // things to tell somebody staring at an empty history.
      if (error) throw error;
      return (data ?? []) as IntegrationRun[];
    },
    enabled: !!companyId && !!provider,
    staleTime: 30_000,
  });
}
