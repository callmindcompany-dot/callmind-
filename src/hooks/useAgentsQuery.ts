import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

type UserRow = Database['public']['Tables']['users']['Row'];

export interface AgentData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  companyId: string;
}

/**
 * useAgentsQuery
 * 
 * Fetches active telecallers / agents from Supabase users table.
 */
export function useAgentsQuery(companyId: string | null) {
  return useQuery({
    queryKey: ['agents', companyId],
    queryFn: async (): Promise<AgentData[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (error) {
        console.error('Failed to fetch agents:', error);
        throw error;
      }

      // Filter and map to AgentData camelCase format
      return (data || [])
        .filter(u => u.role !== 'disabled' && u.role !== 'removed' && u.role !== 'removed_from_company')
        .map((u: UserRow) => ({
          id: u.id,
          name: u.display_name || u.name || 'Agent',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role || 'Agent',
          status: u.status || 'active',
          companyId: u.company_id,
        }));
    },
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds caching
  });
}
