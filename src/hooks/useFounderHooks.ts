import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { 
  CompanyStats, 
  PlatformStats, 
  SupportTicket, 
  FounderActivity, 
  SearchResults, 
  SearchResultItem 
} from '@/types/founder';

/**
 * 1. useFounderStats
 * Fetches platform-wide aggregate metrics from the `platform_stats_view`
 */
export function useFounderStats() {
  return useQuery<PlatformStats>({
    queryKey: ['founder_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_stats_view')
        .select('*')
        .single();

      if (error) throw error;
      return data as PlatformStats;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

/**
 * 2. useFounderCompanies
 * Fetches tenant companies from `company_stats_view` with sorting, filtering, and search.
 */
interface UseFounderCompaniesParams {
  search?: string;
  plan?: string;
  status?: string;
  sortBy?: keyof CompanyStats;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function useFounderCompanies(params: UseFounderCompaniesParams = {}) {
  const {
    search = '',
    plan = 'All',
    status = 'All',
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 50,
  } = params;

  return useQuery<{ data: CompanyStats[]; count: number }>({
    queryKey: ['founder_companies', { search, plan, status, sortBy, sortOrder, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('company_stats_view')
        .select('*', { count: 'exact' });

      // Search filter
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // Plan filter
      if (plan && plan !== 'All') {
        query = query.eq('plan', plan);
      }

      // Status filter
      if (status && status !== 'All') {
        query = query.eq('status', status);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []) as CompanyStats[],
        count: count || 0,
      };
    },
  });
}

/**
 * 3. useFounderTickets
 * Fetches support tickets from `support_tickets` table and exposes mutations.
 */
interface UseFounderTicketsParams {
  search?: string;
  status?: string;
  priority?: string;
}

export function useFounderTickets(params: UseFounderTicketsParams = {}) {
  const queryClient = useQueryClient();
  const { search = '', status = 'All', priority = 'All' } = params;

  const ticketsQuery = useQuery<SupportTicket[]>({
    queryKey: ['founder_tickets', { search, status, priority }],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'All') {
        query = query.eq('status', status.toLowerCase());
      }

      if (priority && priority !== 'All') {
        query = query.eq('priority', priority.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data || []) as SupportTicket[];

      if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
          t => 
            t.company_name?.toLowerCase().includes(lowerSearch) ||
            t.user_email.toLowerCase().includes(lowerSearch) ||
            t.description.toLowerCase().includes(lowerSearch)
        );
      }

      return filtered;
    },
  });

  // Toggle ticket status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ ticketId, currentStatus }: { ticketId: string; currentStatus: 'open' | 'closed' }) => {
      const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      return { ticketId, nextStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tickets'] });
    },
  });

  // Delete ticket mutation
  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error, count } = await supabase
        .from('support_tickets')
        .delete({ count: 'exact' })
        .eq('id', ticketId);

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the record may already be gone.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tickets'] });
    },
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ticketIds, nextStatus }: { ticketIds: string[]; nextStatus: 'open' | 'closed' }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .in('id', ticketIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tickets'] });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (ticketIds.length === 0) return;
      const { error, count } = await supabase
        .from('support_tickets')
        .delete({ count: 'exact' })
        .in('id', ticketIds);

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the records may already be gone.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tickets'] });
    },
  });

  // Update internal notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ ticketId, notes }: { ticketId: string; notes: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ internal_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tickets'] });
    },
  });

  return {
    ticketsQuery,
    toggleStatusMutation,
    deleteMutation,
    bulkUpdateStatusMutation,
    bulkDeleteMutation,
    updateNotesMutation
  };
}

/**
 * 4. useGlobalSearch
 * Searches companies, tickets, and leads.
 */
export function useGlobalSearch(searchQuery: string) {
  return useQuery<SearchResults>({
    queryKey: ['founder_global_search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        return { companies: [], tickets: [], leads: [] };
      }
      
      const cleanQuery = searchQuery.trim();

      // Parallel execution of searches
      const [companiesRes, ticketsRes, leadsRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, plan')
          .ilike('name', `%${cleanQuery}%`)
          .limit(5),
        supabase
          .from('support_tickets')
          .select('id, title, user_email, company_name')
          .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,user_email.ilike.%${cleanQuery}%`)
          .limit(5),
        supabase
          .from('leads')
          .select('id, name, email, phone, company_id')
          .or(`name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
          .limit(5)
      ]);

      const companies: SearchResultItem[] = (companiesRes.data || []).map(c => ({
        id: c.id,
        title: c.name,
        subtitle: `Plan: ${c.plan || 'N/A'}`,
        type: 'company'
      }));

      const tickets: SearchResultItem[] = (ticketsRes.data || []).map(t => ({
        id: t.id,
        title: t.title || 'Support Query',
        subtitle: `${t.company_name || 'Individual'} (${t.user_email})`,
        type: 'ticket'
      }));

      const leads: SearchResultItem[] = (leadsRes.data || []).map(l => ({
        id: l.id,
        title: l.name,
        subtitle: `Phone: ${l.phone || 'N/A'} • Email: ${l.email || 'N/A'}`,
        type: 'lead',
        metadata: { company_id: l.company_id }
      }));

      return { companies, tickets, leads };
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 5000,
  });
}

/**
 * 5. useActivityFeed
 * Fetches audit logs / activity stream.
 */
export function useActivityFeed() {
  return useQuery<FounderActivity[]>({
    queryKey: ['founder_activity_feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as FounderActivity[];
    },
    refetchInterval: 15000, // Refresh every 15s
  });
}
