import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface AuditLog {
  id: string;
  company_id: string;
  category: string;
  user_email: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  totalCount: number;
}

export function usePlatformAuditLogs(
  page: number,
  search: string,
  category: string,
  companyIdSearch: string,
  startDate: string,
  endDate: string
) {
  return useQuery<AuditLogsResponse>({
    queryKey: ['platform_audit_logs', page, search, category, companyIdSearch, startDate, endDate],
    queryFn: async (): Promise<AuditLogsResponse> => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply search (by action or user_email)
      if (search.trim()) {
        query = query.or(`action.ilike.%${search.trim()}%,user_email.ilike.%${search.trim()}%`);
      }

      // Apply category filter
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      // Apply company_id search
      if (companyIdSearch.trim()) {
        query = query.ilike('company_id', `%${companyIdSearch.trim()}%`);
      }

      // Apply date range filters
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      // Pagination: 100 rows per page
      const from = (page - 1) * 100;
      const to = page * 100 - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Failed to fetch platform audit logs:', error);
        throw error;
      }

      const logs: AuditLog[] = (data || []).map(row => ({
        id: row.id,
        company_id: row.company_id,
        category: row.category || 'Info',
        user_email: row.user_email || '',
        user_name: row.user_name || '',
        action: row.action || '',
        details: row.details || '',
        created_at: row.created_at || row.timestamp || new Date().toISOString()
      }));

      return {
        logs,
        totalCount: count || 0
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 5000
  });
}
