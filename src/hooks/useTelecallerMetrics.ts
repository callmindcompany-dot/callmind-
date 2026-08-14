import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TelecallerMetrics } from '@/types/reports';
import { applyDateWindow, applyDimensionFilters, type ReportFilters } from '@/lib/reportFilters';
import { parseDurationSeconds } from '@/lib/callDuration';

/**
 * Per-telecaller activity: first and last call, talk time, notes written, and
 * the shift they were logged in for.
 *
 * Three faults fixed while moving this onto the shared filter resolver.
 *
 * The users query selected `displayName`. The column is `display_name`, so
 * PostgREST rejected the whole select and the hook threw on every render --
 * and ReportsPage drops hook errors, so the module simply showed nothing.
 *
 * The notes and attendance queries destructured only `data` and discarded
 * `error`. A failure there left notes_count at 0 and the shift blank, which
 * reads as an agent who wrote no notes rather than a query that did not run.
 *
 * idle_minutes was 0 whenever login or logout was missing. Zero idle is a
 * flattering number and it was being shown for agents nobody had any
 * attendance data for at all. It is null now, and the screen has to say
 * unknown.
 */
export function useTelecallerMetrics(companyId: string | null, filters: ReportFilters) {
  return useQuery<TelecallerMetrics[]>({
    queryKey: ['reports', 'telecallerMetrics', companyId, filters],
    queryFn: async (): Promise<TelecallerMetrics[]> => {
      if (!companyId) return [];

      let callsQuery = supabase
        .from('calls')
        .select('agent_id, timestamp, duration, outcome')
        .eq('company_id', companyId);
      callsQuery = applyDateWindow(callsQuery, 'timestamp', 'timestamp', filters.dateRange, filters.customRange);
      callsQuery = applyDimensionFilters(callsQuery, filters, { agent: 'agent_id' });
      const { data: callsData, error: callsError } = await callsQuery;
      if (callsError) throw callsError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, display_name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;

      let notesQuery = supabase
        .from('lead_activity_log')
        .select('created_by')
        .eq('company_id', companyId)
        .eq('activity_type', 'note');
      notesQuery = applyDateWindow(notesQuery, 'created_at', 'timestamp', filters.dateRange, filters.customRange);
      const { data: notesData, error: notesError } = await notesQuery;
      if (notesError) throw notesError;

      let attQuery = supabase
        .from('attendance_logs')
        .select('user_id, type, timestamp')
        .eq('company_id', companyId);
      attQuery = applyDateWindow(attQuery, 'timestamp', 'timestamp', filters.dateRange, filters.customRange);
      const { data: attData, error: attError } = await attQuery.order('timestamp', { ascending: true });
      if (attError) throw attError;

      const agents = new Map<string, TelecallerMetrics>();
      for (const u of usersData ?? []) {
        agents.set(u.id, {
          agent_id: u.id,
          agent_name: u.display_name || u.name || u.email || 'Unknown',
          first_call_at: null,
          last_call_at: null,
          total_calls: 0,
          total_talk_seconds: 0,
          avg_talk_seconds: null,
          unreadable_durations: 0,
          notes_count: 0,
          login_time: null,
          logout_time: null,
          active_duration_minutes: null,
          idle_minutes: null,
        });
      }

      const readable = new Map<string, number>();

      for (const call of (callsData ?? []) as Array<{
        agent_id: string | null; timestamp: string | null;
        duration: string | null; outcome: string | null;
      }>) {
        if (!call.agent_id || !call.timestamp) continue;
        const agent = agents.get(call.agent_id);
        if (!agent) continue;

        agent.total_calls++;

        const seconds = parseDurationSeconds(call.duration);
        if (seconds === null) {
          agent.unreadable_durations++;
        } else {
          agent.total_talk_seconds += seconds;
          readable.set(call.agent_id, (readable.get(call.agent_id) ?? 0) + 1);
        }

        if (!agent.first_call_at || call.timestamp < agent.first_call_at) {
          agent.first_call_at = call.timestamp;
        }
        if (!agent.last_call_at || call.timestamp > agent.last_call_at) {
          agent.last_call_at = call.timestamp;
        }
      }

      for (const note of (notesData ?? []) as Array<{ created_by: string | null }>) {
        const agent = note.created_by ? agents.get(note.created_by) : undefined;
        if (agent) agent.notes_count++;
      }

      for (const att of (attData ?? []) as Array<{
        user_id: string | null; type: string | null; timestamp: string | null;
      }>) {
        const agent = att.user_id ? agents.get(att.user_id) : undefined;
        if (!agent || !att.timestamp) continue;
        if (att.type === 'check_in' && !agent.login_time) agent.login_time = att.timestamp;
        if (att.type === 'check_out') agent.logout_time = att.timestamp;
      }

      for (const agent of agents.values()) {
        const n = readable.get(agent.agent_id) ?? 0;
        agent.avg_talk_seconds = n > 0 ? Math.round(agent.total_talk_seconds / n) : null;

        if (agent.login_time && agent.logout_time) {
          const minutes = Math.round(
            (new Date(agent.logout_time).getTime() - new Date(agent.login_time).getTime()) / 60_000,
          );
          // A logout before the login is a sync fault, not a negative shift.
          if (minutes > 0) {
            agent.active_duration_minutes = minutes;
            agent.idle_minutes = Math.max(0, minutes - Math.round(agent.total_talk_seconds / 60));
          }
        }
      }

      return [...agents.values()].filter(a => a.total_calls > 0 || a.login_time !== null);
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
