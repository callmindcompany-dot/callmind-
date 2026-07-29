import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface ActivityEvent {
  id: string;
  agentName: string;
  leadName: string;
  action: string;
  timestamp: string;
}

/**
 * useLiveActivity
 * 
 * Fetches the latest 10 call activity events from Supabase.
 * Uses a polling refetch interval as a robust fallback.
 */
export function useLiveActivity(companyId: string | null) {
  return useQuery({
    queryKey: ['liveActivity', companyId],
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!companyId) return [];

      // Fetch calls in descending order
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (callsError) {
        console.error('Failed to fetch live calls:', callsError);
        throw callsError;
      }

      const callsList = callsData || [];
      if (callsList.length === 0) return [];

      // Fetch corresponding leads names in parallel
      const leadIds = Array.from(new Set(callsList.map((c: any) => c.lead_id).filter(Boolean)));
      const leadsMap = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        (leadsData || []).forEach(l => leadsMap.set(l.id, l.name));
      }

      // Fetch corresponding agents names in parallel
      const agentIds = Array.from(new Set(callsList.map((c: any) => c.created_by).filter(Boolean)));
      const agentsMap = new Map<string, string>();
      if (agentIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name, name')
          .in('id', agentIds);
        (usersData || []).forEach(u => agentsMap.set(u.id, u.display_name || u.name || 'Agent'));
      }

      return callsList.map((call: any): ActivityEvent => {
        const leadName = call.lead_id ? (leadsMap.get(call.lead_id) || 'Lead') : 'Lead';
        const agentName = call.created_by ? (agentsMap.get(call.created_by) || call.created_by.split('@')[0]) : 'Agent';
        return {
          id: call.id,
          agentName,
          leadName,
          action: `Logged call: ${call.outcome || 'Answered'}`,
          timestamp: call.timestamp || new Date().toISOString()
        };
      });
    },
    enabled: !!companyId,
    refetchInterval: 10000, // Refresh activity feed every 10 seconds
  });
}
