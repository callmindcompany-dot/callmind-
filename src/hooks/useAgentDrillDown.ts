import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AgentDrillDownData } from '@/types/reports';

export function useAgentDrillDown(
  agentId: string | null,
  companyId: string | null,
  dateRange: string,
  customRange?: { start: string; end: string }
) {
  return useQuery<AgentDrillDownData | null>({
    queryKey: ['reports', 'agentDrillDown', agentId, companyId, dateRange, customRange],
    queryFn: async (): Promise<AgentDrillDownData | null> => {
      if (!agentId || !companyId) return null;

      // 1. Fetch Assigned Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, status, last_contacted_at, created_at')
        .eq('company_id', companyId)
        .eq('assigned_to', agentId);
      if (leadsError) throw leadsError;

      // 2. Fetch Calls list
      let callsQuery = supabase
        .from('calls')
        .select('id, timestamp, duration, outcome, lead_id')
        .eq('company_id', companyId)
        .eq('created_by', agentId);

      const now = new Date();
      if (dateRange === 'Today') {
        callsQuery = callsQuery.gte('timestamp', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        callsQuery = callsQuery.gte('timestamp', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        callsQuery = callsQuery.gte('timestamp', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        callsQuery = callsQuery.gte('timestamp', start);
      } else if (dateRange === 'Custom' && customRange?.start) {
        callsQuery = callsQuery.gte('timestamp', customRange.start);
        if (customRange.end) {
          callsQuery = callsQuery.lte('timestamp', customRange.end);
        }
      }

      const { data: callsData, error: callsError } = await callsQuery;
      if (callsError) throw callsError;

      // 3. Fetch Attendance log
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('id, type, timestamp')
        .eq('company_id', companyId)
        .eq('user_id', agentId)
        .order('timestamp', { ascending: false });
      if (attendanceError) throw attendanceError;

      // 4. Fetch Goals and Targets (Fallback to settings default)
      const { data: settingsData, error: settingsError } = await supabase
        .from('team_settings')
        .select('settings')
        .eq('company_id', companyId)
        .single();
      
      const settings = settingsData?.settings || {};
      const targetCalls = settings.target_calls || 50;
      const targetConversions = settings.target_conversions || 5;

      const actualCalls = callsData?.length || 0;
      const actualConversions = (leadsData || []).filter(l => l.status?.toLowerCase() === 'converted').length;

      // Resolve lead names for calls
      const resolvedCalls = (callsData || []).map(call => {
        const matchingLead = (leadsData || []).find(l => l.id === call.lead_id);
        return {
          id: call.id,
          timestamp: call.timestamp,
          duration: call.duration,
          outcome: call.outcome,
          lead_name: matchingLead ? matchingLead.name : 'Unknown Lead'
        };
      });

      // 5. Fetch Lead Status Changes by Agent
      let activityQuery = supabase
        .from('lead_activity_log')
        .select('from_status, to_status')
        .eq('company_id', companyId)
        .eq('created_by', agentId)
        // Column is activity_type, not type — the writers (useLeadNotes,
        // LeadDetail) and src/types/supabase.ts all use activity_type. This
        // query would have errored with "column does not exist".
        .eq('activity_type', 'status_change');

      if (dateRange === 'Today') {
        activityQuery = activityQuery.gte('created_at', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        activityQuery = activityQuery.gte('created_at', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        activityQuery = activityQuery.gte('created_at', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        activityQuery = activityQuery.gte('created_at', start);
      } else if (dateRange === 'Custom' && customRange?.start) {
        activityQuery = activityQuery.gte('created_at', customRange.start);
        if (customRange.end) {
          activityQuery = activityQuery.lte('created_at', customRange.end);
        }
      }

      const { data: activityData } = await activityQuery;

      const statusChangeCounts: Record<string, number> = {};
      (activityData || []).forEach((act: any) => {
        if (act.from_status && act.to_status) {
          const key = `${act.from_status} → ${act.to_status}`;
          statusChangeCounts[key] = (statusChangeCounts[key] || 0) + 1;
        }
      });

      const statusChangesList = Object.entries(statusChangeCounts).map(([transition, count]) => {
        const [from_status, to_status] = transition.split(' → ');
        return { from_status, to_status, count };
      });

      return {
        leads: (leadsData || []).map(l => ({
          id: l.id,
          name: l.name,
          status: l.status,
          last_contacted_at: l.last_contacted_at,
          created_at: l.created_at
        })),
        calls: resolvedCalls,
        attendance: (attendanceData || []).map(att => ({
          id: att.id,
          type: att.type,
          timestamp: att.timestamp
        })),
        goals: {
          target_calls: targetCalls,
          actual_calls: actualCalls,
          target_conversions: targetConversions,
          actual_conversions: actualConversions
        },
        statusChanges: statusChangesList
      };
    },
    enabled: !!agentId && !!companyId,
    staleTime: 30000,
  });
}
