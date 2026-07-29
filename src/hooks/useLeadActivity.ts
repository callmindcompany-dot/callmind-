import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type LeadActivity = Database['public']['Tables']['lead_activity_log']['Row'];

/**
 * useLeadActivity
 * 
 * Fetches activity logs for a specific lead.
 */
export function useLeadActivity(leadId: string, companyId: string | null) {
  return useQuery<LeadActivity[]>({
    queryKey: ['leadActivity', leadId],
    queryFn: async (): Promise<LeadActivity[]> => {
      if (!companyId || !leadId) return [];
      const { data, error } = await supabase
        .from('lead_activity_log')
        .select('*')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch lead activities:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId && !!leadId,
  });
}
