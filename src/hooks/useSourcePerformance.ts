import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

/**
 * What each lead source is actually worth.
 *
 * "Leads per source" existed in the health screen already, and it is the easy
 * half of the answer and the useless half: IndiaMART sending 340 and JustDial
 * sending 90 decides nothing if JustDial's 90 convert and IndiaMART's 340 do
 * not. This is the query behind the decision a customer actually makes at
 * renewal time, and every field it needs was already on the lead.
 *
 * Deliberately no "conversion rate". Statuses are per company
 * (team_settings.leads_statuses) and leads.status has no CHECK constraint, so
 * deciding which of them means "won" would be a guess rendered as a percentage
 * -- and a percentage is believed. Contacted and valued are directly
 * observable, and they answer different questions: many leads and few contacts
 * is a volume problem, many contacts and no value is a quality problem.
 */

export interface SourcePerformance {
  source: string;
  leads: number;
  /** Somebody actually rang them: first_contact_at is set. */
  contacted: number;
  /** Money was attached to the outcome: deal_value > 0. */
  valued: number;
  total_value: number;
  first_lead_at: string | null;
  last_lead_at: string | null;
}

export function useSourcePerformance(days = 30) {
  return useQuery<SourcePerformance[]>({
    queryKey: ['sourcePerformance', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lead_source_performance', { p_days: days });

      // An empty report and a failed query look identical on screen, and only
      // one of them means "these sources produced nothing".
      if (error) throw error;

      return ((data ?? []) as SourcePerformance[]).map((r) => ({
        ...r,
        leads: Number(r.leads ?? 0),
        contacted: Number(r.contacted ?? 0),
        valued: Number(r.valued ?? 0),
        // numeric comes back as a string from PostgREST.
        total_value: Number(r.total_value ?? 0),
      }));
    },
    staleTime: 60_000,
  });
}
