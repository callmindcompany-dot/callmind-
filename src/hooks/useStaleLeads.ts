import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface StaleLead {
  id: string;
  name: string;
  phone: string;
  source: string;
  last_contacted_at: string | null;
}

export function useStaleLeads(companyId: string | null) {
  return useQuery<StaleLead[]>({
    queryKey: ['reports', 'staleLeads', companyId],
    queryFn: async (): Promise<StaleLead[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .rpc('get_stale_leads', { p_company_id: companyId });

      if (error) {
        console.error('Error fetching stale leads:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
