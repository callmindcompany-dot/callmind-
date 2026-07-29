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
  dndFilter?: string;
  languageFilter?: string;
  scoreFilter?: string;
  stateFilter?: string;
  cityFilter?: string;
  engagementFilter?: string;
  customFilters?: Record<string, string>;
  dateRange?: { start: string | null; end: string | null };
  showOnlyRotting?: boolean;
  rottingThreshold?: number;
}

const PAGE_SIZE = 50;

/**
 * useLeadsQuery
 * 
 * Replaces useLeadsPaginated with TanStack Query.
 * Queries Supabase leads table with pagination, ordering, and filters.
 */
export function useLeadsQuery(filters: LeadFiltersInput, page: number, pageSize = PAGE_SIZE, searchQuery = '') {
  return useQuery({
    queryKey: ['leads', filters.companyId, page, pageSize, filters, searchQuery],
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

      // Server-side search using Supabase ilike
      if (searchQuery.trim()) {
        const term = `%${searchQuery.trim()}%`;
        countQuery = countQuery.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
        dataQuery = dataQuery.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
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

      // DND status filter
      if (filters.dndFilter && filters.dndFilter !== 'All') {
        countQuery = countQuery.eq('dnd_status', filters.dndFilter);
        dataQuery = dataQuery.eq('dnd_status', filters.dndFilter);
      }

      // Language filter
      if (filters.languageFilter) {
        countQuery = countQuery.eq('language', filters.languageFilter);
        dataQuery = dataQuery.eq('language', filters.languageFilter);
      }

      // Score filter
      if (filters.scoreFilter) {
        countQuery = countQuery.eq('score', filters.scoreFilter);
        dataQuery = dataQuery.eq('score', filters.scoreFilter);
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

      // Engagement filter
      if (filters.engagementFilter) {
        countQuery = countQuery.eq('engagement', filters.engagementFilter);
        dataQuery = dataQuery.eq('engagement', filters.engagementFilter);
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
        .order('created_at', { ascending: false })
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
        engagement: row.engagement,
        state: row.state,
        city: row.city,
        address: row.address,
        reference: row.reference,
        comment: row.comment,
        branch: row.branch,
        priority: row.priority,
        description: row.description,
        estimatedBudget: row.estimated_budget,
        facebookAdName: row.facebook_ad_name,
        isDeleted: row.is_deleted,
        isUnseen: row.is_unseen,
        neuralScore: row.neural_score,
        isDuplicate: row.is_duplicate,
        date: row.date,
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
