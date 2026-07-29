import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { LeadSourceYield } from '@/types/reports';

export function useLeadSourceYieldReport(companyId: string | null) {
  return useQuery<LeadSourceYield[]>({
    queryKey: ['reports', 'leadSourceYield', companyId],
    queryFn: async (): Promise<LeadSourceYield[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('lead_source_yield')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error("useLeadSourceYieldReport failed:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
