import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type Call = Database['public']['Tables']['calls']['Row'];

/**
 * useLeadCalls
 * 
 * Fetches calls logged for a specific lead.
 */
export function useLeadCalls(leadId: string, companyId: string | null) {
  return useQuery<Call[]>({
    queryKey: ['leadCalls', leadId],
    queryFn: async (): Promise<Call[]> => {
      if (!companyId || !leadId) return [];
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Failed to fetch lead calls:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId && !!leadId,
  });
}
