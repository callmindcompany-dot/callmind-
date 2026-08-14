import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { FunnelStep } from '@/types/reports';
import { applyDateWindow, applyDimensionFilters, type ReportFilters } from '@/lib/reportFilters';

/**
 * How many leads sit at each stage.
 *
 * This ignored the period button entirely until conversion_funnel gained a
 * date column (20260820000300), because there was nothing to filter on: the
 * view had one row per company and status and returned the same all-time
 * answer whichever period was lit.
 *
 * The view is now one row per day, so the days in the window are summed here.
 *
 * These are stages, not steps -- leads.status has no CHECK constraint and the
 * names are per company, so the database does not know that Contacted comes
 * after New. Anything drawn from this must not imply an order the data does
 * not carry.
 */
export function useConversionFunnelReport(companyId: string | null, filters: ReportFilters) {
  return useQuery<FunnelStep[]>({
    queryKey: ['reports', 'conversionFunnel', companyId, filters],
    queryFn: async (): Promise<FunnelStep[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('conversion_funnel')
        .select('status, count, date')
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'date', 'date', filters.dateRange, filters.customRange);
      query = applyDimensionFilters(query, filters, { status: 'status' });

      const { data, error } = await query;
      if (error) throw error;

      const totals = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ status: string; count: number }>) {
        totals.set(row.status, (totals.get(row.status) ?? 0) + row.count);
      }

      return [...totals.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
