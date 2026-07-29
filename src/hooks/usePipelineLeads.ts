import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type Lead = Database['public']['Tables']['leads']['Row'];

/**
 * usePipelineLeads
 * 
 * Fetches all active leads for the scoped company from Supabase.
 */
export function usePipelineLeads(companyId: string | null) {
  return useQuery<Lead[]>({
    queryKey: ['pipelineLeads', companyId],
    queryFn: async (): Promise<Lead[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (error) {
        console.error('Failed to fetch pipeline leads:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!companyId,
  });
}
