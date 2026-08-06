import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export interface LeadFiltersInput {
  status?: string;
  assignedTo?: string;
  source?: string;
  isFounderView?: boolean;  // if true, no user scoping
  userId?: string;
  companyId: string;
  
  // New extended CRM filters
  scoreFilter?: string;
  stateFilter?: string;
  cityFilter?: string;
  customFilters?: Record<string, string>;
  dateRange?: { start: string | null; end: string | null };
  showOnlyRotting?: boolean;
  rottingThreshold?: number;
}

/**
 * How the list is ordered.
 *
 * The order was previously fixed at newest-created-first, which is the one
 * order a telecaller does not want: it puts today's fresh leads at the top and
 * buries the ones that have been waiting longest. `oldest_activity` is the
 * working order for a call queue.
 */
export type LeadSort =
  | 'newest'
  | 'oldest'
  | 'oldest_activity'
  | 'recent_activity'
  | 'score'
  | 'value'
  | 'name';

const SORT_COLUMNS: Record<LeadSort, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  // Nothing has touched these in the longest -- the follow-up queue.
  oldest_activity: { column: 'updated_at', ascending: true },
  recent_activity: { column: 'updated_at', ascending: false },
  score: { column: 'neural_score', ascending: false },
  value: { column: 'estimated_budget', ascending: false },
  name: { column: 'name', ascending: true },
};

export const LEAD_SORT_LABELS: Record<LeadSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  oldest_activity: 'Longest without activity',
  recent_activity: 'Recently active',
  score: 'Highest score',
  value: 'Highest value',
  name: 'Name (A-Z)',
};

const PAGE_SIZE = 50;

/**
 * useLeadsQuery
 * 
 * Replaces useLeadsPaginated with TanStack Query.
 * Queries Supabase leads table with pagination, ordering, and filters.
 */
export function useLeadsQuery(
  filters: LeadFiltersInput,
  page: number,
  pageSize = PAGE_SIZE,
  searchQuery = '',
  sort: LeadSort = 'newest',
) {
  return useQuery({
    queryKey: ['leads', filters.companyId, page, pageSize, filters, searchQuery, sort],
    queryFn: async () => {
      if (!filters.companyId) {
        return {
          leads: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
        };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Base queries scoped to company
      let countQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', filters.companyId)
        .eq('is_deleted', false);

      let dataQuery = supabase
        .from('leads')
        .select('*')
        .eq('company_id', filters.companyId)
        .eq('is_deleted', false);

      // User scope (non-founder sees only their leads)
      if (!filters.isFounderView && filters.userId) {
        countQuery = countQuery.eq('assigned_to', filters.userId);
        dataQuery = dataQuery.eq('assigned_to', filters.userId);
      }

      // Server-side search.
      //
      // A telecaller almost always searches by phone number, and types it from
      // the front. A left-anchored `phone LIKE '98765%'` uses the btree in
      // 20260811000000_lead_search_indexes.sql, where a leading-wildcard ilike
      // across three columns cannot and falls back to scanning the tenant.
      //
      // So: if the query looks like a phone number, search phone by prefix.
      // Otherwise fall back to trigram-servable ilike across all three.
      if (searchQuery.trim()) {
        const raw = searchQuery.trim();
        const digits = raw.replace(/[^0-9]/g, '');
        const looksLikePhone = digits.length >= 4 && digits.length === raw.replace(/[\s+\-()]/g, '').length;

        if (looksLikePhone) {
          // Match a number typed with or without the +91 country code.
          const local = digits.length > 10 ? digits.slice(-10) : digits;
          countQuery = countQuery.or(`phone.like.${digits}%,phone.like.%${local}`);
          dataQuery = dataQuery.or(`phone.like.${digits}%,phone.like.%${local}`);
        } else {
          const term = `%${raw}%`;
          countQuery = countQuery.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
          dataQuery = dataQuery.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
        }
      }

      // Status filter
      if (filters.status && filters.status !== 'All') {
        countQuery = countQuery.eq('status', filters.status);
        dataQuery = dataQuery.eq('status', filters.status);
      }

      // Source filter
      if (filters.source && filters.source !== '') {
        countQuery = countQuery.eq('source', filters.source);
        dataQuery = dataQuery.eq('source', filters.source);
      }

      // Minimum AI score. The old version filtered on a column called
      // `score`, which does not exist; the value lives in neural_score.
      if (filters.scoreFilter) {
        const min = Number(filters.scoreFilter);
        if (!Number.isNaN(min)) {
          countQuery = countQuery.gte('neural_score', min);
          dataQuery = dataQuery.gte('neural_score', min);
        }
      }

      // State filter
      if (filters.stateFilter) {
        countQuery = countQuery.eq('state', filters.stateFilter);
        dataQuery = dataQuery.eq('state', filters.stateFilter);
      }

      // City filter
      if (filters.cityFilter) {
        countQuery = countQuery.eq('city', filters.cityFilter);
        dataQuery = dataQuery.eq('city', filters.cityFilter);
      }

      // Custom fields filter
      if (filters.customFilters) {
        Object.entries(filters.customFilters).forEach(([key, val]) => {
          if (val) {
            countQuery = countQuery.ilike(`custom_fields->>${key}`, `%${val}%`);
            dataQuery = dataQuery.ilike(`custom_fields->>${key}`, `%${val}%`);
          }
        });
      }

      // Date range filter
      if (filters.dateRange?.start) {
        try {
          const startIso = new Date(filters.dateRange.start).toISOString();
          countQuery = countQuery.gte('created_at', startIso);
          dataQuery = dataQuery.gte('created_at', startIso);
        } catch (e) {
          console.error("Invalid start date format", e);
        }
      }
      if (filters.dateRange?.end) {
        try {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          const endIso = endDate.toISOString();
          countQuery = countQuery.lte('created_at', endIso);
          dataQuery = dataQuery.lte('created_at', endIso);
        } catch (e) {
          console.error("Invalid end date format", e);
        }
      }

      // Rotting filter
      if (filters.showOnlyRotting) {
        const rottingDays = filters.rottingThreshold || 5;
        const cutoff = new Date(Date.now() - rottingDays * 24 * 60 * 60 * 1000);
        countQuery = countQuery.lt('created_at', cutoff.toISOString());
        dataQuery = dataQuery.lt('created_at', cutoff.toISOString());
      }

      // Apply pagination + ordering on data query
      dataQuery = dataQuery
        .order(SORT_COLUMNS[sort].column, {
          ascending: SORT_COLUMNS[sort].ascending,
          nullsFirst: false,
        })
        // Ties are common -- a bulk import gives thousands of rows the same
        // created_at. Without a stable tiebreak the same lead can appear on two
        // pages and another never appear at all.
        .order('id', { ascending: true })
        .range(from, to);

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      // Convert snake_case to camelCase for UI compatibility and wrap created_at/updated_at
      const mappedLeads = (dataResult.data || []).map((row: LeadRow) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        assignedTo: row.assigned_to,
        companyId: row.company_id,
        brand: row.brand,
        source: row.source,
        state: row.state,
        city: row.city,
        address: row.address,
        comment: row.comment,
        priority: row.priority,
        description: row.description,
        estimatedBudget: row.estimated_budget,
        facebookAdName: row.facebook_ad_name,
        isDeleted: row.is_deleted,
        isUnseen: row.is_unseen,
        neuralScore: row.neural_score,
        isDuplicate: row.is_duplicate,
        createdAt: row.created_at ? {
          toDate: () => new Date(row.created_at!),
          toMillis: () => new Date(row.created_at!).getTime(),
        } : null,
        updatedAt: row.updated_at ? {
          toDate: () => new Date(row.updated_at!),
          toMillis: () => new Date(row.updated_at!).getTime(),
        } : null,
        customData: row.custom_data,
        custom_fields: row.custom_fields || {},
      }));

      const totalCount = countResult.count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        leads: mappedLeads,
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    placeholderData: keepPreviousData,
    enabled: !!filters.companyId,
    staleTime: 5000,
  });
}
