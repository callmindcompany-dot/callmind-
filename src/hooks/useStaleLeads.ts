import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

/**
 * Leads nobody has gone back to.
 *
 * The function this calls raised 42703 on every request until
 * 20260820000200_fix_report_functions.sql -- it selected a column named
 * last_contacted_at, and the column is last_contact_at. The same misspelling
 * was in this file's type, in the drill-down query, in the reports data hook,
 * in the table that renders the result, and in the CSV importer's column map,
 * where it meant an import carrying a Last Contacted column wrote to a column
 * that does not exist.
 *
 * The cutoff is passed rather than left to the function's default, so the
 * screen can state the number of days it asked for.
 */
export const STALE_AFTER_DAYS = 7;

export interface StaleLead {
  id: string;
  name: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  assigned_to: string | null;
  last_contact_at: string | null;
  created_at: string | null;
}

export function useStaleLeads(companyId: string | null, days: number = STALE_AFTER_DAYS) {
  return useQuery<StaleLead[]>({
    queryKey: ['reports', 'staleLeads', companyId, days],
    queryFn: async (): Promise<StaleLead[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc('get_stale_leads', {
        p_company_id: companyId,
        p_days: days,
      });
      if (error) throw error;

      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
