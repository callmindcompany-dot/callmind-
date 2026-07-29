import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { CallReportRecord } from '@/types/reports';

export function useCallsReport(
  companyId: string | null,
  dateRange: string,
  agentId?: string,
  customRange?: { start: string; end: string }
) {
  return useQuery<CallReportRecord[]>({
    queryKey: ['reports', 'callsReportList', companyId, dateRange, agentId, customRange],
    queryFn: async (): Promise<CallReportRecord[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('calls')
        .select(`
          id,
          duration,
          outcome,
          timestamp,
          created_by,
          lead_id
        `)
        .eq('company_id', companyId);

      const now = new Date();
      if (dateRange === 'Today') {
        query = query.gte('timestamp', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === 'Custom' && customRange?.start) {
        query = query.gte('timestamp', customRange.start);
        if (customRange.end) {
          query = query.lte('timestamp', customRange.end);
        }
      }

      if (agentId && agentId !== 'All Agents') {
        query = query.eq('created_by', agentId);
      }

      const { data: calls, error: callsError } = await query.order('timestamp', { ascending: false }).limit(200);
      if (callsError) throw callsError;

      if (!calls || calls.length === 0) return [];

      // Fetch users to map agent names
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;

      // Fetch leads to map lead names and phone numbers
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('company_id', companyId);
      if (leadsError) throw leadsError;

      return calls.map(c => {
        const agent = (users || []).find(u => u.id === c.created_by);
        const lead = (leads || []).find(l => l.id === c.lead_id);
        
        return {
          id: c.id,
          agent_name: agent ? (agent.display_name || agent.name || agent.email) : 'System / Unassigned',
          lead_name: lead ? lead.name : 'Unknown Lead',
          phone: lead ? lead.phone : null,
          duration: c.duration,
          outcome: c.outcome,
          timestamp: c.timestamp
        };
      });
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
