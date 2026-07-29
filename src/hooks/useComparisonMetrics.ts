import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ComparisonMetrics } from '@/types/reports';

export function useComparisonMetrics(
  companyId: string | null,
  dateRange: string,
  customRange?: { start: string; end: string },
  enabled: boolean = false
) {
  return useQuery<ComparisonMetrics | null>({
    queryKey: ['reports', 'comparisonMetrics', companyId, dateRange, customRange],
    queryFn: async (): Promise<ComparisonMetrics | null> => {
      if (!companyId) return null;

      // 1. Calculate Period Boundaries
      const now = new Date();
      let currentStart = new Date();
      let currentEnd = new Date();
      let previousStart = new Date();
      let previousEnd = new Date();

      if (dateRange === 'Today') {
        currentStart.setHours(0, 0, 0, 0);
        currentEnd.setHours(23, 59, 59, 999);
        
        previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateRange === '7 Days') {
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentStart.setHours(0, 0, 0, 0);
        
        previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
      } else if (dateRange === '30 Days') {
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        currentStart.setHours(0, 0, 0, 0);
        
        previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
      } else if (dateRange === 'This Month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (dateRange === 'Custom' && customRange?.start && customRange?.end) {
        currentStart = new Date(customRange.start);
        currentStart.setHours(0, 0, 0, 0);
        
        currentEnd = new Date(customRange.end);
        currentEnd.setHours(23, 59, 59, 999);

        const durationMs = currentEnd.getTime() - currentStart.getTime();
        previousStart = new Date(currentStart.getTime() - durationMs - 1);
        previousEnd = new Date(currentStart.getTime() - 1);
      } else {
        // Default to This Month parameters
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }

      const { data, error } = await supabase.rpc('get_comparison_metrics', {
        p_company_id: companyId,
        p_current_start: currentStart.toISOString(),
        p_current_end: currentEnd.toISOString(),
        p_previous_start: previousStart.toISOString(),
        p_previous_end: previousEnd.toISOString()
      });

      if (error) {
        console.error("useComparisonMetrics RPC failed:", error);
        throw error;
      }
      return data || null;
    },
    enabled: !!companyId && enabled,
    staleTime: 60000,
  });
}
