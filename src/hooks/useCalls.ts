import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface Call {
  id: string;
  leadName: string;
  phone: string;
  duration: string;
  status: 'completed' | 'missed' | 'busy' | 'failed';
  created_at: string;
  aiSummary: string;
  type: 'incoming' | 'outgoing';
  interest?: string | null;
  createdBy: string;
  companyId: string;
  // recordingUrl was here and fed an <audio> player on CallsPage. CallMind
  // does not record calls, so there was never anything for it to carry.
}

export interface CallFilters {
  agent: string;
  type: string;
  interest: string;
  dateRange: string;
  customRange: { start: string; end: string };
  search: string;
}

export interface UseCallsProps {
  companyId: string | null;
  pageSize: number;
  page: number;
  filters: CallFilters;
}

export interface CallsResponse {
  calls: Call[];
  totalCount: number;
}

export const useCalls = ({ companyId, pageSize, page, filters }: UseCallsProps) => {
  return useQuery<CallsResponse>({
    queryKey: ['calls', companyId, pageSize, page, filters],
    queryFn: async (): Promise<CallsResponse> => {
      if (!companyId) return { calls: [], totalCount: 0 };

      let query = supabase
        .from('calls')
        .select('*', { count: 'exact' });

      // Scope to current company hub
      query = query.eq('company_id', companyId);

      // Apply Search (Lead Name or Phone)
      if (filters.search.trim()) {
        const s = filters.search.trim();
        query = query.or(`lead_name.ilike.%${s}%,phone.ilike.%${s}%`);
      }

      // Apply Agent Filter
      if (filters.agent !== 'All Agents') {
        query = query.eq('created_by', filters.agent);
      }

      // Apply Call Type Filter
      if (filters.type !== 'All Types') {
        query = query.eq('type', filters.type);
      }

      // Apply Interest/Disposition Filter
      if (filters.interest !== 'All Interest') {
        query = query.eq('interest', filters.interest);
      }

      // Apply Date Filter
      if (filters.dateRange === 'Today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfToday.toISOString());
      } else if (filters.dateRange === 'Last 7 Days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (filters.dateRange === 'Custom' && filters.customRange.start && filters.customRange.end) {
        const start = new Date(filters.customRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.customRange.end);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      // Apply Pagination range
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Failed to query call logs:', error);
        throw error;
      }

      const calls: Call[] = (data || []).map(row => ({
        id: row.id,
        leadName: row.lead_name || 'Valued Customer',
        phone: row.phone,
        duration: row.duration || '0m 0s',
        status: (row.status || 'completed') as 'completed' | 'missed' | 'busy' | 'failed',
        created_at: row.created_at || new Date().toISOString(),
        aiSummary: row.ai_summary || 'Manual call logged by agent.',
        type: (row.type || 'outgoing') as 'incoming' | 'outgoing',
        interest: row.interest || 'Pending',
        createdBy: row.created_by || 'System',
        companyId: row.company_id,
      }));

      return {
        calls,
        totalCount: count || 0
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 5000,
    enabled: !!companyId
  });
};
