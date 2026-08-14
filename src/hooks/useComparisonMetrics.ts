import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ComparisonMetrics } from '@/types/reports';
import { resolveDateWindow, resolvePreviousWindow, type ReportFilters } from '@/lib/reportFilters';

/**
 * This period against the one before it.
 *
 * The previous window is derived from the current one, so the two are always
 * the same length and always touch without overlapping. The old version worked
 * both out separately from the period name and disagreed with itself: the
 * 7 Days and 30 Days branches never set an end at all, so "current" ran to the
 * moment the page loaded while "previous" ran to a midnight, and the two spans
 * being compared were different lengths.
 *
 * get_comparison_metrics did not exist when this hook was written. It does now
 * (20260820000200_fix_report_functions.sql).
 */
export function useComparisonMetrics(
  companyId: string | null,
  filters: ReportFilters,
  enabled: boolean = false,
) {
  return useQuery<ComparisonMetrics | null>({
    queryKey: ['reports', 'comparisonMetrics', companyId, filters],
    queryFn: async (): Promise<ComparisonMetrics | null> => {
      if (!companyId) return null;

      const current = resolveDateWindow(filters.dateRange, filters.customRange);
      const previous = resolvePreviousWindow(current);

      // An open-ended custom range has no length, so there is nothing to
      // compare it against. Saying so beats inventing a span.
      if (!current.fromInstant || !current.toInstant || !previous.fromInstant) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_comparison_metrics', {
        p_company_id: companyId,
        p_current_start: current.fromInstant,
        p_current_end: current.toInstant,
        p_previous_start: previous.fromInstant,
        p_previous_end: previous.toInstant,
      });
      if (error) throw error;

      // The function returns one row; supabase-js hands back an array.
      return (Array.isArray(data) ? data[0] : data) ?? null;
    },
    enabled: !!companyId && enabled,
    staleTime: 60000,
  });
}
