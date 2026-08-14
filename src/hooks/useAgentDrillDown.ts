import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AgentDrillDownData } from '@/types/reports';
import { applyDateWindow, type ReportFilters } from '@/lib/reportFilters';

export function useAgentDrillDown(
  agentId: string | null,
  companyId: string | null,
  filters: ReportFilters,
) {
  return useQuery<AgentDrillDownData | null>({
    queryKey: ['reports', 'agentDrillDown', agentId, companyId, filters],
    queryFn: async (): Promise<AgentDrillDownData | null> => {
      if (!agentId || !companyId) return null;

      // 1. Fetch Assigned Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, status, last_contact_at, created_at')
        .eq('company_id', companyId)
        .eq('assigned_to', agentId);
      if (leadsError) throw leadsError;

      // 2. Fetch Calls list
      let callsQuery = supabase
        .from('calls')
        .select('id, timestamp, duration, outcome, lead_id')
        .eq('company_id', companyId)
        // agent_id, not created_by: every other report keys off agent_id, and
        // the two only agree because both apps happen to write both columns.
        .eq('agent_id', agentId);

      callsQuery = applyDateWindow(
        callsQuery, 'timestamp', 'timestamp', filters.dateRange, filters.customRange,
      );

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

      // 4. The company's own targets, if it has set any.
      //
      // maybeSingle, not single: a company that has never opened team settings
      // has no row, and single() treats that as an error. The targets used to
      // fall back to 50 calls and 5 conversions -- numbers nobody chose, shown
      // as "target" next to a real figure, so every company that had not
      // configured targets was being measured against an invented one.
      const { data: settingsData, error: settingsError } = await supabase
        .from('team_settings')
        .select('settings')
        .eq('company_id', companyId)
        .maybeSingle();
      if (settingsError) throw settingsError;

      const settings = (settingsData?.settings ?? {}) as Record<string, unknown>;
      const asTarget = (v: unknown) =>
        typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
      const targetCalls = asTarget(settings.target_calls);
      const targetConversions = asTarget(settings.target_conversions);

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

      activityQuery = applyDateWindow(
        activityQuery, 'created_at', 'timestamp', filters.dateRange, filters.customRange,
      );

      // The error used to be discarded here, so a failed query left the status
      // movement panel empty and indistinguishable from an agent who moved
      // nothing.
      const { data: activityData, error: activityError } = await activityQuery;
      if (activityError) throw activityError;

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
          last_contact_at: l.last_contact_at,
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
