import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AgentPerformance } from '@/types/reports';
import { applyDateWindow, applyDimensionFilters, type ReportFilters } from '@/lib/reportFilters';

export function useAgentPerformanceReport(companyId: string | null, filters: ReportFilters) {
  return useQuery<AgentPerformance[]>({
    queryKey: ['reports', 'agentPerformance', companyId, filters],
    queryFn: async (): Promise<AgentPerformance[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('agent_performance')
        .select('*')
        .eq('company_id', companyId);

      // agent_performance.date is a DATE column, so it takes date literals.
      query = applyDateWindow(query, 'date', 'date', filters.dateRange, filters.customRange);
      query = applyDimensionFilters(query, filters, { agent: 'agent_id' });

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
