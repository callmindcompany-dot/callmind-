import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface AgentInfo {
  email: string;
  name: string;
}

export function useAgents(companyId: string | null) {
  return useQuery<AgentInfo[]>({
    queryKey: ['agents', companyId],
    queryFn: async (): Promise<AgentInfo[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('users')
        .select('email, name, display_name')
        .eq('company_id', companyId)
        .neq('status', 'disabled');

      if (error) {
        console.error('Failed to query agents list:', error);
        throw error;
      }

      return (data || []).map(row => ({
        email: row.email,
        name: row.name || row.display_name || row.email
      }));
    },
    enabled: !!companyId,
    staleTime: 30000
  });
}
