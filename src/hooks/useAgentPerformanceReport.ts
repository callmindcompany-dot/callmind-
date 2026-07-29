import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AgentPerformance } from '@/types/reports';

export function useAgentPerformanceReport(
  companyId: string | null,
  dateRange: string,
  selectedAgent?: string,
  customRange?: { start: string; end: string }
) {
  return useQuery<AgentPerformance[]>({
    queryKey: ['reports', 'agentPerformance', companyId, dateRange, selectedAgent, customRange],
    queryFn: async (): Promise<AgentPerformance[]> => {
      if (!companyId) return [];
      
      let queryBuilder = supabase
        .from('agent_performance')
        .select('*')
        .eq('company_id', companyId);

      const now = new Date();
      if (dateRange === 'Today') {
        queryBuilder = queryBuilder.eq('date', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        queryBuilder = queryBuilder.gte('date', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        queryBuilder = queryBuilder.gte('date', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        queryBuilder = queryBuilder.gte('date', start);
      } else if (dateRange === 'Custom' && customRange?.start) {
        queryBuilder = queryBuilder.gte('date', customRange.start);
        if (customRange.end) {
          queryBuilder = queryBuilder.lte('date', customRange.end);
        }
      }

      if (selectedAgent && selectedAgent !== 'All Agents') {
        queryBuilder = queryBuilder.eq('agent_id', selectedAgent);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        console.error("useAgentPerformanceReport failed:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
