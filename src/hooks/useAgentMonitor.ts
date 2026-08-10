import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type AgentStatusRow = Database['public']['Tables']['agent_status']['Row'];
export type CallRow = Database['public']['Tables']['calls']['Row'];

export interface CallRecord {
  id: string;
  leadName: string;
  duration: string; // mm:ss
  startTime: string; // Exact start time
  outcome: string; // Connected, Busy, No Answer, etc.
  status: 'completed' | 'missed' | 'busy' | 'failed';
  timestamp: string;
}

export interface AgentStats {
  id: string;
  name: string;
  status: 'active' | 'on_call' | 'offline';
  calls: number;
  connected: number;
  connectRate: string;
  recentCalls: CallRecord[];
  /** Calls per hour of the day, 24 buckets, from real call timestamps. */
  activityMap: number[];
  // Everything below is null when there is nothing to compute it from. These
  // were previously fixed strings -- every agent on every screen showed
  // avgTalkTime "2m 15s", firstCall "09:15 AM", checkIn "09:00 AM",
  // breakTime "25m" -- which looked like a working live monitor and was not.
  avgTalkTime: string | null;
  talkTime: string | null;
  firstCall: string | null;
  lastCall: string | null;
  /** Needs attendance_logs, which this hook does not read. Always null today. */
  checkIn: string | null;
  /** Nothing in the product records breaks. Always null today. */
  breakTime: string | null;
}

/** calls.duration is TEXT in the "Xm Ys" shape CallsPage writes and parses. */
function parseDurationSeconds(duration: string | null): number {
  if (!duration) return 0;
  const mins = parseInt(duration.match(/(\d+)m/)?.[1] ?? '0', 10);
  const secs = parseInt(duration.match(/(\d+)s/)?.[1] ?? '0', 10);
  return mins * 60 + secs;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function useAgentStatusesQuery(companyId: string | null) {
  return useQuery<AgentStats[]>({
    queryKey: ['agentLiveMonitorStatuses', companyId],
    queryFn: async (): Promise<AgentStats[]> => {
      if (!companyId) return [];

      const { data: statusData, error: statusError } = await supabase
        .from('agent_status')
        .select('*')
        .eq('company_id', companyId);

      if (statusError) {
        console.error('Failed to fetch agent statuses:', statusError);
        throw statusError;
      }

      if (!statusData || statusData.length === 0) {
        return [];
      }

      // timestamp and duration are selected because the per-agent figures below
      // are computed from them. Previously only created_by and outcome were
      // fetched, and everything the two could not produce was made up.
      const agentIds = statusData.map(s => s.id);
      const { data: callsSummary, error: callsError } = await supabase
        .from('calls')
        .select('created_by, outcome, timestamp, duration')
        .eq('company_id', companyId)
        .in('created_by', agentIds);

      // Not thrown, because agent presence is still worth showing without call
      // figures -- but the figures then have to read as absent, not as zero.
      if (callsError) {
        console.error('Failed to fetch calls summary:', callsError);
      }

      const callsList = callsSummary || [];
      const callsFailed = !!callsError;

      return statusData.map((agent): AgentStats => {
        const agentCalls = callsList.filter(c => c.created_by === agent.id);
        const totalCalls = agentCalls.length;
        const connectedCalls = agentCalls.filter(c => c.outcome === 'Answered' || c.outcome === 'Connected').length;
        const connectRateVal = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

        const stamps = agentCalls
          .map(c => c.timestamp)
          .filter((t): t is string => !!t)
          .sort();

        const activityMap = new Array(24).fill(0) as number[];
        for (const t of stamps) {
          const hour = new Date(t).getHours();
          if (hour >= 0 && hour < 24) activityMap[hour] += 1;
        }

        const talkSeconds = agentCalls.reduce((sum, c) => sum + parseDurationSeconds(c.duration), 0);
        const haveCalls = !callsFailed && totalCalls > 0;

        return {
          id: agent.id,
          name: agent.user_name || 'Unknown Agent',
          status: (agent.status as AgentStats['status']) || 'offline',
          calls: totalCalls,
          connected: connectedCalls,
          connectRate: `${connectRateVal}%`,
          activityMap,
          // talkSeconds is 0 when every call has a "0m 0s" duration, which is
          // what the manual-call form defaults to. That is a real zero.
          talkTime: haveCalls ? formatDuration(talkSeconds) : null,
          avgTalkTime: haveCalls ? formatDuration(Math.round(talkSeconds / totalCalls)) : null,
          firstCall: stamps.length ? formatClock(stamps[0]) : null,
          lastCall: stamps.length
            ? formatClock(stamps[stamps.length - 1])
            : (agent.last_seen ? formatClock(agent.last_seen) : null),
          checkIn: null,
          breakTime: null,
          recentCalls: []
        };
      });
    },
    enabled: !!companyId,
    refetchInterval: 5000, // Poll every 5s for live dashboard feel
  });
}

export function useAgentCallsQuery(companyId: string | null, agentId: string | null) {
  return useQuery<CallRecord[]>({
    queryKey: ['agentLiveCalls', companyId, agentId],
    queryFn: async (): Promise<CallRecord[]> => {
      if (!companyId || !agentId) return [];

      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .eq('created_by', agentId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (callsError) {
        console.error('Failed to fetch agent calls:', callsError);
        throw callsError;
      }

      const callsList = callsData || [];
      if (callsList.length === 0) return [];

      // Map lead IDs to lead names
      const leadIds = Array.from(new Set(callsList.map(c => c.lead_id).filter(Boolean)));
      const leadsMap = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        (leadsData || []).forEach(l => leadsMap.set(l.id, l.name));
      }

      return callsList.map((c): CallRecord => {
        const leadName = c.lead_id ? (leadsMap.get(c.lead_id) || 'Unknown Lead') : 'Unknown Lead';
        
        let startTime = '--:--';
        if (c.timestamp) {
          try {
            startTime = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {}
        }

        const isConnected = c.outcome === 'Answered' || c.outcome === 'Connected';
        const outcomeStatus = isConnected ? 'completed' : (c.outcome === 'Busy' ? 'busy' : 'missed');

        return {
          id: c.id,
          leadName,
          // calls.duration holds the real value. This was '2:15' on every row.
          duration: c.duration || '—',
          startTime,
          outcome: c.outcome || 'No Answer',
          status: outcomeStatus as CallRecord['status'],
          // recording_url was passed through here on the reasoning that
          // discarding a column the UI had a control for is how a dead button
          // comes about. That reasoning is retired: recording is not a gap to
          // be filled but a decision not to build, so the control went instead
          // and this no longer carries the column.
          timestamp: c.timestamp || ''
        };
      });
    },
    enabled: !!companyId && !!agentId,
    refetchInterval: 5000,
  });
}
