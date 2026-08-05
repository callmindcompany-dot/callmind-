import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface DashboardSummary {
  total_leads: number;
  total_calls: number;
  conversions: number;
  connects: number;
}

export function useDashboardSummary(companyId: string | null) {
  return useQuery<DashboardSummary>({
    queryKey: ['reports', 'dashboardSummary', companyId],
    queryFn: async (): Promise<DashboardSummary> => {
      if (!companyId) return { total_leads: 0, total_calls: 0, conversions: 0, connects: 0 };
      
      const { data, error } = await supabase
        .rpc('get_reports_summary', { p_company_id: companyId });

      if (error) {
        console.error('Error fetching dashboard summary:', error);
        throw error;
      }

      if (data && data.length > 0) {
        return {
          total_leads: Number(data[0].total_leads) || 0,
          total_calls: Number(data[0].total_calls) || 0,
          conversions: Number(data[0].conversions) || 0,
          connects: Number(data[0].connects) || 0,
        };
      }
      
      return { total_leads: 0, total_calls: 0, conversions: 0, connects: 0 };
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
