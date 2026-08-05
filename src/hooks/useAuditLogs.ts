import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { AuditLog } from '@/types/founder';
import { toast } from 'react-hot-toast';

interface AuditFilters {
  searchQuery: string;
  category: string;
  mineOnly: boolean;
  userEmail: string | null;
  dateRange: { start: string; end: string };
  globalView: boolean;
}

export function useAuditLogs(companyId: string | null, filters: AuditFilters) {
  return useQuery<AuditLog[]>({
    queryKey: ['audit_logs', companyId, filters],
    queryFn: async () => {
      if (!companyId && !filters.globalView) return [];

      let query = supabase
        .from('audit_logs')
        .select('*');

      // Scoping by company
      if (!filters.globalView && companyId) {
        query = query.eq('company_id', companyId);
      }

      // Category filter
      if (filters.category && filters.category !== 'All Types') {
        query = query.eq('category', filters.category.toLowerCase());
      }

      // Mine only filter
      if (filters.mineOnly && filters.userEmail) {
        // Checking user_name column
        query = query.ilike('user_name', `%${filters.userEmail}%`);
      }

      // Date filters
      if (filters.dateRange.start) {
        query = query.gte('timestamp', new Date(filters.dateRange.start).toISOString());
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('timestamp', endDate.toISOString());
      }

      // Search queries
      if (filters.searchQuery) {
        query = query.or(`action.ilike.%${filters.searchQuery}%,target.ilike.%${filters.searchQuery}%,user_name.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    enabled: !!companyId || filters.globalView,
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 30000,      // Stale time of 30 seconds
  });
}

export function useDeleteAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arg: string | { id: string; companyId?: string }) => {
      const id = typeof arg === 'string' ? arg : arg.id;
      const companyId = typeof arg === 'string' ? undefined : arg.companyId;

      let query = supabase.from('audit_logs').delete({ count: 'exact' }).eq('id', id);
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { error, count } = await query;

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the record may already be gone.');
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['audit_logs'] });

      const previousLogs = queryClient.getQueryData<AuditLog[]>(['audit_logs']);

      queryClient.setQueriesData<AuditLog[]>({ queryKey: ['audit_logs'] }, (old) => {
        return old ? old.filter((log) => log.id !== deletedId) : [];
      });

      return { previousLogs };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousLogs) {
        queryClient.setQueriesData<AuditLog[]>({ queryKey: ['audit_logs'] }, context.previousLogs);
      }
      toast.error('Failed to delete audit log entry.');
    },
    onSuccess: () => {
      toast.success('Audit log deleted successfully.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    },
  });
}
