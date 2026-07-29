import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TelecallerMetrics } from '@/types/reports';

/**
 * Fetches telecaller-specific metrics per agent:
 * - First/Last call timestamps
 * - Average call duration
 * - Notes added count
 * - Login/Logout times and active/idle durations
 */
export function useTelecallerMetrics(
  companyId: string | null,
  dateRange: string,
  customRange?: { start: string; end: string }
) {
  return useQuery<TelecallerMetrics[]>({
    queryKey: ['reports', 'telecallerMetrics', companyId, dateRange, customRange],
    queryFn: async (): Promise<TelecallerMetrics[]> => {
      if (!companyId) return [];

      // Build date filter
      const now = new Date();
      let dateStart: string | null = null;
      let dateEnd: string | null = null;

      if (dateRange === 'Today') {
        dateStart = now.toISOString().split('T')[0];
      } else if (dateRange === '7 Days') {
        dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30 Days') {
        dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === 'This Month') {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateRange === 'Custom' && customRange?.start) {
        dateStart = customRange.start;
        dateEnd = customRange.end || null;
      }

      // 1. Fetch all calls in range
      let callsQuery = supabase
        .from('calls')
        .select('created_by, timestamp, duration, outcome')
        .eq('company_id', companyId);

      if (dateStart) callsQuery = callsQuery.gte('timestamp', dateStart);
      if (dateEnd) callsQuery = callsQuery.lte('timestamp', dateEnd);

      const { data: callsData, error: callsError } = await callsQuery;
      if (callsError) throw callsError;

      // 2. Fetch agents list
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, displayName')
        .eq('company_id', companyId);
      if (usersError) throw usersError;

      // 3. Fetch notes count per agent
      let notesQuery = supabase
        .from('lead_activity_log')
        .select('created_by')
        .eq('company_id', companyId)
        .eq('type', 'note');

      if (dateStart) notesQuery = notesQuery.gte('created_at', dateStart);
      if (dateEnd) notesQuery = notesQuery.lte('created_at', dateEnd);

      const { data: notesData } = await notesQuery;

      // 4. Fetch attendance logs for login/logout times
      let attQuery = supabase
        .from('attendance_logs')
        .select('user_id, type, timestamp')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: true });

      if (dateStart) attQuery = attQuery.gte('timestamp', dateStart);
      if (dateEnd) attQuery = attQuery.lte('timestamp', dateEnd);

      const { data: attData } = await attQuery;

      // Aggregate per agent
      const agentMap: Record<string, TelecallerMetrics> = {};

      // Initialize agents
      (usersData || []).forEach((u: { id: string; name: string | null; displayName: string | null }) => {
        agentMap[u.id] = {
          agent_id: u.id,
          agent_name: u.displayName || u.name || 'Unknown',
          first_call_at: null,
          last_call_at: null,
          total_calls: 0,
          total_talk_seconds: 0,
          avg_talk_seconds: 0,
          notes_count: 0,
          login_time: null,
          logout_time: null,
          active_duration_minutes: 0,
          idle_minutes: 0,
        };
      });

      // Process calls
      (callsData || []).forEach((call: { created_by: string; timestamp: string; duration: string | null; outcome: string | null }) => {
        const agentId = call.created_by;
        if (!agentMap[agentId]) return;

        const agent = agentMap[agentId];
        agent.total_calls++;

        // Parse duration string (e.g., "3:42" or "222") to seconds
        let durationSec = 0;
        if (call.duration) {
          if (call.duration.includes(':')) {
            const parts = call.duration.split(':').map(Number);
            durationSec = parts.length === 3
              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
              : parts[0] * 60 + (parts[1] || 0);
          } else {
            durationSec = parseInt(call.duration, 10) || 0;
          }
        }
        agent.total_talk_seconds += durationSec;

        // Track first/last call
        if (!agent.first_call_at || call.timestamp < agent.first_call_at) {
          agent.first_call_at = call.timestamp;
        }
        if (!agent.last_call_at || call.timestamp > agent.last_call_at) {
          agent.last_call_at = call.timestamp;
        }
      });

      // Process notes counts
      (notesData || []).forEach((note: { created_by: string }) => {
        if (agentMap[note.created_by]) {
          agentMap[note.created_by].notes_count++;
        }
      });

      // Process attendance for login/logout
      (attData || []).forEach((att: { user_id: string; type: string; timestamp: string }) => {
        if (!agentMap[att.user_id]) return;
        const agent = agentMap[att.user_id];

        if (att.type === 'check_in' && !agent.login_time) {
          agent.login_time = att.timestamp;
        }
        if (att.type === 'check_out') {
          agent.logout_time = att.timestamp;
        }
      });

      // Calculate averages and active/idle durations
      Object.values(agentMap).forEach(agent => {
        agent.avg_talk_seconds = agent.total_calls > 0
          ? Math.round(agent.total_talk_seconds / agent.total_calls)
          : 0;

        if (agent.login_time && agent.logout_time) {
          const loginMs = new Date(agent.login_time).getTime();
          const logoutMs = new Date(agent.logout_time).getTime();
          const totalMinutes = Math.round((logoutMs - loginMs) / 60000);
          const talkMinutes = Math.round(agent.total_talk_seconds / 60);
          agent.active_duration_minutes = totalMinutes;
          agent.idle_minutes = Math.max(0, totalMinutes - talkMinutes);
        }
      });

      // Only return agents with activity
      return Object.values(agentMap).filter(a => a.total_calls > 0 || a.login_time);
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
