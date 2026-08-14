import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { CallReportRecord } from '@/types/reports';
import {
  applyDateWindow,
  applyDimensionFilters,
  ALL_SOURCES,
  ALL_STATUSES,
  type ReportFilters,
} from '@/lib/reportFilters';

/** Matches the cap the UI paginates against; exported so the page can say so. */
export const CALLS_REPORT_LIMIT = 200;

interface EmbeddedLead {
  id: string;
  name: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
}

/**
 * The call list.
 *
 * Two things worth knowing about how this is filtered.
 *
 * The agent filter used to key off calls.created_by while every other report
 * keyed off calls.agent_id. Both apps write the same value into both columns
 * today, so the two agreed by luck; one webhook or import that set only one
 * would have made "filter by agent" mean different things in two places on the
 * same screen. Reports read agent_id, which is what the views and the mobile
 * app's own queries use.
 *
 * A call carries no source or status of its own -- those belong to the lead --
 * so the first version of this filtered them in JavaScript after the query.
 * That is wrong in a way that hides itself: the limit applies first, so asking
 * for one source would return whatever fraction of the newest 200 calls
 * happened to match and present it as the whole answer. calls.lead_id has a
 * foreign key to leads, so the filter is an inner join on the embedded lead and
 * the limit applies to rows that already match.
 */
export function useCallsReport(companyId: string | null, filters: ReportFilters) {
  return useQuery<CallReportRecord[]>({
    queryKey: ['reports', 'callsReportList', companyId, filters],
    queryFn: async (): Promise<CallReportRecord[]> => {
      if (!companyId) return [];

      const bySource = Boolean(filters.source && filters.source !== ALL_SOURCES);
      const byStatus = Boolean(filters.status && filters.status !== ALL_STATUSES);
      // An inner join drops calls with no lead attached, so it is only used
      // when a lead-level filter is actually being applied.
      const join = bySource || byStatus ? 'leads!inner' : 'leads';

      let query = supabase
        .from('calls')
        .select(
          `id, duration, outcome, interest, timestamp, agent_id, lead_id,
           ${join}(id, name, phone, source, status)`,
        )
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'timestamp', 'timestamp', filters.dateRange, filters.customRange);
      query = applyDimensionFilters(query, filters, { agent: 'agent_id' });
      if (bySource) query = query.eq('leads.source', filters.source!);
      if (byStatus) query = query.eq('leads.status', filters.status!);

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(CALLS_REPORT_LIMIT);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;
      const userById = new Map((users ?? []).map(u => [u.id, u]));

      return data.map((c) => {
        // PostgREST returns a to-one embed as an object, but types it loosely;
        // normalising here keeps the shape honest for the rest of the file.
        const raw = (c as unknown as { leads: EmbeddedLead | EmbeddedLead[] | null }).leads;
        const lead = Array.isArray(raw) ? raw[0] ?? null : raw;
        const agent = c.agent_id ? userById.get(c.agent_id) : undefined;

        return {
          id: c.id,
          agent_id: c.agent_id,
          // A missing agent is reported as unknown rather than given a name.
          agent_name: agent ? (agent.display_name || agent.name || agent.email) : 'Unassigned',
          lead_id: c.lead_id,
          lead_name: lead?.name ?? 'Unknown lead',
          phone: lead?.phone ?? null,
          source: lead?.source ?? null,
          status: lead?.status ?? null,
          duration: c.duration,
          outcome: c.outcome,
          interest: c.interest,
          timestamp: c.timestamp,
        };
      });
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
