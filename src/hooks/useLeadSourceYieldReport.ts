import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { LeadSourceYield } from '@/types/reports';
import { applyDateWindow, applyDimensionFilters, type ReportFilters } from '@/lib/reportFilters';

/**
 * What each channel returns.
 *
 * Like the funnel, this ignored the period button because the view had no date
 * to filter on. It does now (20260820000300).
 *
 * The view no longer returns conversion_rate, and this is the reason: a rate
 * cannot be summed across days. Adding 10% and 40% gives 50%, and averaging
 * them gives 25% when the true figure depends on how many leads each day
 * carried. Counts are summed here and the division happens once, at the end.
 */
export function useLeadSourceYieldReport(companyId: string | null, filters: ReportFilters) {
  return useQuery<LeadSourceYield[]>({
    queryKey: ['reports', 'leadSourceYield', companyId, filters],
    queryFn: async (): Promise<LeadSourceYield[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('lead_source_yield')
        .select('source, lead_count, converted_count, deal_value_total, date')
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'date', 'date', filters.dateRange, filters.customRange);
      query = applyDimensionFilters(query, filters, { source: 'source' });

      const { data, error } = await query;
      if (error) throw error;

      const totals = new Map<string, { leads: number; converted: number; value: number }>();
      for (const row of (data ?? []) as Array<{
        source: string; lead_count: number; converted_count: number; deal_value_total: number | string;
      }>) {
        const acc = totals.get(row.source) ?? { leads: 0, converted: 0, value: 0 };
        acc.leads += row.lead_count;
        acc.converted += row.converted_count;
        // PostgREST can hand numeric back as a string; Number() before adding.
        acc.value += Number(row.deal_value_total) || 0;
        totals.set(row.source, acc);
      }

      return [...totals.entries()]
        .map(([source, t]) => ({
          source,
          lead_count: t.leads,
          converted_count: t.converted,
          deal_value_total: t.value,
          conversion_rate: t.leads > 0 ? Math.round((t.converted / t.leads) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.lead_count - a.lead_count);
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
