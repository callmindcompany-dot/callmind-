/**
 * useLeadsPaginated
 * 
 * Server-side paginated leads hook using Supabase.
 * - Page numbers navigation (50 per page)
 * - Supabase ilike search across name, phone, email (searches ALL leads, not just current page)
 * - Server-side status, user, source filters
 * - Optimistic update helpers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';

const PAGE_SIZE = 50;

export interface LeadFiltersInput {
  status?: string;
  assignedTo?: string;
  source?: string;
  isFounderView?: boolean;  // if true, no user scoping
  userId?: string;
  companyId: string;
}

export interface PaginatedLeadsResult {
  leads: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setPage: (p: number) => void;
  refetch: () => void;
  // Optimistic update — updates local state instantly
  optimisticUpdate: (leadId: string, patch: Partial<any>) => void;
  rollbackUpdate: () => void;
}

export function useLeadsPaginated(filters: LeadFiltersInput): PaginatedLeadsResult {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawSearch, setRawSearch] = useState('');
  const [searchQuery, setSearchQueryDebounced] = useState('');

  const previousLeadsRef = useRef<any[]>([]);

  // Debounce search: 300ms after user stops typing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const setSearchQuery = useCallback((q: string) => {
    setRawSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQueryDebounced(q);
      setCurrentPage(1); // reset to page 1 on new search
    }, 300);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.assignedTo, filters.source, filters.companyId]);

  const fetchLeads = useCallback(async () => {
    if (!filters.companyId) {
      setLeads([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Base query scoped to company
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

      // Server-side search using Supabase ilike (searches ALL leads, not just current page)
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

      // Convert snake_case to camelCase for compatibility
      const rows = (dataResult.data || []).map((row: any) => ({
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
        // Wrap created_at string as a MockTimestamp-compatible object
        createdAt: row.created_at ? {
          toDate: () => new Date(row.created_at),
          toMillis: () => new Date(row.created_at).getTime(),
        } : null,
        customData: row.custom_data,
        ...row,
      }));

      setLeads(rows);
      setTotalCount(countResult.count || 0);
      setError(null);
    } catch (err: any) {
      console.error('[useLeadsPaginated] Fetch error:', err);
      setError(err?.message || 'Failed to fetch leads from server.');
      // Fallback to localStorage mock data
      try {
        const saved = localStorage.getItem('mock_sb_leads');
        if (saved) {
          const rawRows = JSON.parse(saved);
          const mapped = rawRows.map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            status: row.status,
            assignedTo: row.assigned_to,
            companyId: row.company_id,
            brand: row.brand,
            source: row.source,
            createdAt: row.created_at ? {
              toDate: () => new Date(row.created_at),
              toMillis: () => new Date(row.created_at).getTime(),
            } : null,
            ...row
          }));
          setLeads(mapped);
        }
      } catch (err) {
        console.error('[useLeadsPaginated] Offline fallback parse error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [filters.companyId, filters.isFounderView, filters.userId, filters.status, filters.source, searchQuery, currentPage]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time updates with throttled refetch
  const lastRefetchTime = useRef<number>(0);
  const refetchTimeout = useRef<NodeJS.Timeout | null>(null);

  const throttledRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchTime.current >= 2000) {
      fetchLeads();
      lastRefetchTime.current = now;
    } else {
      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
      refetchTimeout.current = setTimeout(() => {
        fetchLeads();
        lastRefetchTime.current = Date.now();
      }, 2000 - (now - lastRefetchTime.current));
    }
  }, [fetchLeads]);

  useEffect(() => {
    if (!filters.companyId) return;

    const channel = supabase
      .channel('leads-changes-paginated')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${filters.companyId}`
        },
        () => {
          throttledRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
    };
  }, [filters.companyId, throttledRefetch]);

  // Optimistic update: instantly reflects changes in UI before DB confirms
  const optimisticUpdate = useCallback((leadId: string, patch: Partial<any>) => {
    setLeads(prev => {
      previousLeadsRef.current = prev;
      return prev.map(l => l.id === leadId ? { ...l, ...patch } : l);
    });
  }, []);

  const rollbackUpdate = useCallback(() => {
    if (previousLeadsRef.current.length > 0) {
      setLeads(previousLeadsRef.current);
      previousLeadsRef.current = [];
    }
  }, []);

  return {
    leads,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    currentPage,
    loading,
    error,
    searchQuery: rawSearch,
    setSearchQuery,
    setPage: setCurrentPage,
    refetch: fetchLeads,
    optimisticUpdate,
    rollbackUpdate,
  };
}
