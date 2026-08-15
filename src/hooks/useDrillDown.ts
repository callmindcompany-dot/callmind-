import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { applyDateWindow, applyDimensionFilters } from '@/lib/reportFilters';
import { DRILL_ROW_LIMIT, type DrillDown } from '@/lib/drillDown';

export interface DrillRow {
  id: string;
  /** Column values in the order drillColumns() returns them. */
  cells: Array<string | number | null>;
}

export interface DrillResult {
  columns: string[];
  rows: DrillRow[];
  /** Rows matching in total; larger than rows.length when the cap was hit. */
  total: number;
}

const LEAD_COLUMNS = ['Name', 'Phone', 'Stage', 'Source', 'City', 'Deal value', 'Created'];
const CALL_COLUMNS = ['Lead', 'Phone', 'Telecaller', 'Outcome', 'Interest', 'Duration', 'When'];

/**
 * The rows behind one chart segment.
 *
 * The base filters are applied first and the segment's own dimension second, so
 * the panel can only ever narrow what the chart showed. Widening is the failure
 * mode that matters: a panel that drops the period would list rows that were
 * never in the bar, and look completely ordinary doing it.
 *
 * The count is requested exactly rather than estimated, so the panel can say
 * "500 of 3,120" instead of presenting a truncated list as the whole answer.
 */
export function useDrillDown(companyId: string | null, drill: DrillDown | null) {
  return useQuery<DrillResult>({
    queryKey: ['reports', 'drillDown', companyId, drill],
    queryFn: async (): Promise<DrillResult> => {
      if (!companyId || !drill) return { columns: [], rows: [], total: 0 };

      if (drill.subject === 'leads') {
        const w = drill.leadWhere ?? {};
        let query = supabase
          .from('leads')
          .select('id, name, phone, status, source, city, deal_value, created_at', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('is_deleted', false);

        query = applyDateWindow(query, 'created_at', 'timestamp', drill.filters.dateRange, drill.filters.customRange);
        query = applyDimensionFilters(query, drill.filters, {
          agent: 'assigned_to', source: 'source', status: 'status',
        });

        if (w.status) query = query.eq('status', w.status);
        if (w.source) query = query.eq('source', w.source);
        if (w.city) query = query.eq('city', w.city);
        if (w.assignedTo) query = query.eq('assigned_to', w.assignedTo);
        if (w.lostReason) query = query.eq('lost_reason', w.lostReason);
        if (w.isLost) query = query.not('lost_reason', 'is', null);
        if (w.hasDealValue) query = query.gt('deal_value', 0);

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .limit(DRILL_ROW_LIMIT);
        if (error) throw error;

        return {
          columns: LEAD_COLUMNS,
          total: count ?? data?.length ?? 0,
          rows: (data ?? []).map(l => ({
            id: l.id,
            cells: [
              l.name, l.phone, l.status, l.source, l.city,
              l.deal_value ?? null,
              l.created_at,
            ],
          })),
        };
      }

      const w = drill.callWhere ?? {};
      // The lead is embedded so a call can show who it was to. The join is
      // left, not inner: a call with no lead attached is still a call that
      // happened, and dropping it would make the panel's count disagree with
      // the bar it came from.
      let query = supabase
        .from('calls')
        .select('id, timestamp, duration, outcome, interest, agent_id, leads(name, phone)', { count: 'exact' })
        .eq('company_id', companyId);

      query = applyDateWindow(query, 'timestamp', 'timestamp', drill.filters.dateRange, drill.filters.customRange);
      query = applyDimensionFilters(query, drill.filters, { agent: 'agent_id' });

      if (w.outcome) query = query.eq('outcome', w.outcome);
      if (w.interest) query = query.eq('interest', w.interest);
      if (w.agentId) query = query.eq('agent_id', w.agentId);

      const { data, error, count } = await query
        .order('timestamp', { ascending: false })
        .limit(DRILL_ROW_LIMIT);
      if (error) throw error;

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;
      const userById = new Map((users ?? []).map(u => [u.id, u]));

      // Hour and weekday are the caller's local clock, so they must be matched
      // here rather than in SQL -- Postgres would apply them in the database's
      // timezone, and an 18:00 bar would open the 12:30 calls.
      let rows = (data ?? []);
      if (w.hour !== undefined) {
        rows = rows.filter(c => c.timestamp && new Date(c.timestamp).getHours() === w.hour);
      }
      if (w.weekday !== undefined) {
        rows = rows.filter(c => {
          if (!c.timestamp) return false;
          const js = new Date(c.timestamp).getDay();   // 0 = Sunday
          return (js === 0 ? 6 : js - 1) === w.weekday;
        });
      }
      // Filtering in JavaScript makes the exact count untrue, so it is replaced
      // by what is actually shown rather than reporting a total the panel
      // cannot list.
      const narrowed = w.hour !== undefined || w.weekday !== undefined;

      return {
        columns: CALL_COLUMNS,
        total: narrowed ? rows.length : (count ?? rows.length),
        rows: rows.map(c => {
          const raw = (c as unknown as { leads: { name?: string; phone?: string } | Array<{ name?: string; phone?: string }> | null }).leads;
          const lead = Array.isArray(raw) ? raw[0] ?? null : raw;
          const agent = c.agent_id ? userById.get(c.agent_id) : undefined;
          return {
            id: c.id,
            cells: [
              lead?.name ?? null,
              lead?.phone ?? null,
              agent ? (agent.display_name || agent.name || agent.email) : null,
              c.outcome,
              c.interest,
              c.duration,
              c.timestamp,
            ],
          };
        }),
      };
    },
    enabled: !!companyId && !!drill,
    staleTime: 30000,
  });
}
