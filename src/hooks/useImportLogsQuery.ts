import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

type ImportLogsRow = Database['public']['Tables']['import_logs']['Row'];

interface ImportLogsFilters {
  source: string;
  status: string;
  startDate: string;
  endDate: string;
}

/**
 * useImportLogsQuery
 * 
 * Fetches import logs from Supabase with filters.
 */
export function useImportLogsQuery(companyId: string | null, filters: ImportLogsFilters) {
  const { source, status, startDate, endDate } = filters;

  return useQuery({
    queryKey: ['importLogs', companyId, source, status, startDate, endDate],
    queryFn: async (): Promise<ImportLogsRow[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('import_logs')
        .select('*')
        .eq('company_id', companyId);

      // Filter by Source (searches in filename column)
      if (source) {
        query = query.ilike('filename', `%${source}%`);
      }

      // Filter by Status
      if (status) {
        query = query.eq('status', status);
      }

      // Filter by Date Range
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        // Include full day on end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50); // increased limit to support filter scanning

      if (error) {
        console.error('Failed to fetch import logs:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!companyId,
    staleTime: 10000,
  });
}
