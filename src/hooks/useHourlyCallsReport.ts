import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { HourlyCallDensity } from '@/types/reports';
import { applyDateWindow, type ReportFilters } from '@/lib/reportFilters';

/**
 * When calls happen, by hour and day.
 *
 * The rows are returned at the grain the view stores them -- one per (hour,
 * day) -- because the two things that read this need different shapes. The
 * hour-of-day chart wants the days summed; the weekday heat map needs the
 * dates kept so it can tell a Monday from a Friday. Collapsing here would
 * force the heat map to invent the day back, and a heat map in this codebase
 * has already once spread a single real count across seven cells so it looked
 * like weekly variation.
 *
 * Hours with no calls are not filled in. An empty hour is a real thing to see
 * here: it is the lunch break, or the hour nobody is dialling.
 */
export function useHourlyCallsReport(companyId: string | null, filters: ReportFilters) {
  return useQuery<HourlyCallDensity[]>({
    queryKey: ['reports', 'hourlyCalls', companyId, filters],
    queryFn: async (): Promise<HourlyCallDensity[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('hourly_call_density')
        .select('hour, call_count, date')
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'date', 'date', filters.dateRange, filters.customRange);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as HourlyCallDensity[];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

/**
 * Totals per hour of day, for the hour-of-day chart. Without this a 30-day
 * range draws thirty overlapping points at every hour and reads as noise.
 */
export function sumByHour(rows: HourlyCallDensity[]): Array<{ hour: number; call_count: number }> {
  const byHour = new Map<number, number>();
  for (const row of rows) {
    byHour.set(row.hour, (byHour.get(row.hour) ?? 0) + row.call_count);
  }
  return [...byHour.entries()]
    .map(([hour, call_count]) => ({ hour, call_count }))
    .sort((a, b) => a.hour - b.hour);
}
