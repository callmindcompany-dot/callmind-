import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { CallDispositionRecord } from '@/types/reports';
import {
  applyDateWindow,
  applyDimensionFilters,
  type ReportFilters,
} from '@/lib/reportFilters';
import { NOT_RECORDED } from '@/lib/callOutcomes';

/**
 * How calls ended, for the disposition donut.
 *
 * This used to fold everything through a CANONICAL_OUTCOMES list of
 * Answered / Busy / Wrong Number / Not Interested / Callback / No Answer, and
 * anything absent from it became "Other". The mobile app writes 'Connected',
 * which was not on that list -- so every single answered call in the product
 * was being drawn as "Other", and the one slice a manager most wants to see was
 * the one slice that did not exist.
 *
 * There is no CHECK constraint on calls.outcome, so no list written here can
 * stay true. It now groups by the value actually stored. A new outcome appears
 * as itself rather than disappearing into a bucket, which is the point: an
 * unexpected value is information, not noise to be swept up.
 *
 * A missing outcome used to be relabelled 'No Answer'. Nobody knows that. It is
 * reported as not recorded.
 */
export function useCallDisposition(
  companyId: string | null,
  filters: ReportFilters,
) {
  return useQuery<CallDispositionRecord[]>({
    queryKey: ['reports', 'callDisposition', companyId, filters],
    queryFn: async (): Promise<CallDispositionRecord[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('calls')
        .select('outcome')
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'timestamp', 'timestamp', filters.dateRange, filters.customRange);
      query = applyDimensionFilters(query, filters, { agent: 'agent_id' });

      const { data, error } = await query;
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ outcome: string | null }>) {
        const key = row.outcome?.trim() || NOT_RECORDED;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return [...counts.entries()]
        .map(([outcome, count]) => ({ outcome, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
