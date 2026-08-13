import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface DetailedHealthStats {
  totalLeads: number;
  leadsToday: number;
  sourceCounts: Record<string, number>;
  activeIntegrationsCount: number;
  failedSyncs24h: number;
  /** The plan's lead ceiling. `null` means the plan has none. */
  leadLimit: number | null;
  isRateLimited: boolean;
}

/**
 * Telemetry for the integration health screen.
 *
 * Everything here used to be reported as fact whether or not it had been
 * measured, and four of the numbers could not have been right:
 *
 *   Three queries -- team_settings, import_logs and audit_logs -- had their
 *   `error` destructured away and fell back to `|| []`. "0 failed syncs in 24h"
 *   carried exactly as much information as a network error, and the screen said
 *   "All channels sync healthy" either way.
 *
 *   activeIntegrationsCount counted team_settings.facebook_config,
 *   indiamart_config and five more. None of those columns has ever existed, so
 *   the count was 0 for every company however many they had connected. They
 *   live in integration_credentials now.
 *
 *   isRateLimited scanned the same non-existent columns for lastSyncErrors, so
 *   it was permanently false and the header badge permanently "Operational".
 *
 *   avgWebhookResponseTime is gone. It parsed "123ms" out of audit log details,
 *   nothing has ever written that, and it fell back to a literal 18 -- a number
 *   presented as a measurement that was chosen by hand. The screen printed
 *   "18ms / Ultra low latency response" to every customer forever.
 *
 *   apiQuotaUsagePct divided by a hardcoded 5,000, which is not the lead limit
 *   of any plan: they are 1,000 / 50,000 / 250,000 / unlimited in
 *   src/config/pricing.ts. The real ceiling is read from plan_limits now, and
 *   the percentage is computed where it is displayed.
 */
export function useIntegrationHealth(companyId: string | null) {
  return useQuery<DetailedHealthStats>({
    queryKey: ['integrationHealthDetailed', companyId],
    queryFn: async (): Promise<DetailedHealthStats> => {
      if (!companyId) throw new Error('companyId is required');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. Lead volume and where it came from
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('source, created_at')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (leadsError) throw leadsError;

      const totalLeads = (leads || []).length;
      const leadsToday = (leads || []).filter(
        (l) => l.created_at && new Date(l.created_at) >= todayStart,
      ).length;

      const sourceCounts: Record<string, number> = {};
      (leads || []).forEach((row) => {
        const src = row.source || 'Unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });

      // 2. Which integrations are switched on, and whether any is rate limited.
      //    A telecaller is refused this table by design; that is not a failure
      //    worth blocking the screen on, but anything else is.
      const { data: creds, error: credsError } = await supabase
        .from('integration_credentials')
        .select('provider, config, is_active')
        .eq('company_id', companyId);

      if (credsError && credsError.code !== '42501') throw credsError;

      const activeIntegrationsCount = (creds ?? []).filter((c) => c.is_active).length;

      const isRateLimited = (creds ?? []).some((c) => {
        const errs = (c.config as { lastSyncErrors?: unknown[] } | null)?.lastSyncErrors ?? [];
        return errs
          .map((e) => String(e).toLowerCase())
          .some((e) => e.includes('429') || e.includes('rate limit') || e.includes('ratelimit'));
      });

      // 3. Imports that failed in the last day
      const { data: failedLogs, error: failedError } = await supabase
        .from('import_logs')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'failed')
        .gte('created_at', yesterday.toISOString());

      if (failedError) throw failedError;

      // 4. The plan's real lead ceiling. NULL in plan_limits means unlimited,
      //    which is the same convention src/config/pricing.ts uses.
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('plan')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) throw companyError;

      let leadLimit: number | null = null;
      if (company?.plan) {
        const { data: planRow, error: planError } = await supabase
          .from('plan_limits')
          .select('lead_limit')
          .eq('id', company.plan)
          .maybeSingle();

        if (planError) throw planError;
        // bigint arrives as a string from PostgREST; 50000 === '50000' is false.
        leadLimit = planRow?.lead_limit == null ? null : Number(planRow.lead_limit);
      }

      return {
        totalLeads,
        leadsToday,
        sourceCounts,
        activeIntegrationsCount,
        failedSyncs24h: (failedLogs || []).length,
        leadLimit,
        isRateLimited,
      };
    },
    enabled: !!companyId,
    refetchInterval: 15_000,
  });
}
