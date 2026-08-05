import { useState, useEffect, useCallback, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';

export interface SearchResultItem {
  id: string;
  module: 'leads' | 'customers' | 'calls' | 'invoices' | 'tasks' | 'tickets' | 'documents' | 'workflows';
  title: string;
  subtitle: string;
  badge?: string;
  actionUrl: string;
  metadata?: Record<string, any>;
  score?: number;
}

export function useGlobalSearch() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const currentUserId = user?.id || user?.uid;

  // 1. Debounce Query Input (300ms delay to prevent server load)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setSelectedIndex(0);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // 2. Global Keyboard Shortcut Handler (Ctrl + K / Cmd + K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 3. Search Results Query
  const searchResultsQuery = useQuery({
    queryKey: ['global-search', companyId, currentUserId, debouncedQuery, category],
    queryFn: async () => {
      if (!debouncedQuery || !currentUserId || !companyId) {
        return { results: [], totalCount: 0, executionMs: 0 };
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const searchParams = new URLSearchParams();
      searchParams.set('q', debouncedQuery);
      if (category !== 'all') searchParams.set('categories', category);

      const res = await fetch(`/api/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to execute search.');

      const json = await res.json();
      return {
        results: (json.results || []) as SearchResultItem[],
        totalCount: json.totalCount || 0,
        executionMs: json.executionMs || 0,
      };
    },
    enabled: !!currentUserId && !!companyId && debouncedQuery.length >= 2,
    staleTime: 5000,
  });

  // 4. Fetch Recent Searches Query
  const recentSearchesQuery = useQuery({
    queryKey: ['global-search-recent', companyId, currentUserId],
    queryFn: async () => {
      if (!currentUserId || !companyId) return [];

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/search/recent', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) return [];
      const json = await res.json();
      return json.recent || [];
    },
    enabled: !!currentUserId && !!companyId && isOpen,
  });

  // 5. Clear Recent Searches Mutation
  const clearRecentMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/search/recent', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to clear recent searches.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-search-recent'] });
    }
  });

  const results = searchResultsQuery.data?.results || [];

  return {
    isOpen,
    openModal: () => setIsOpen(true),
    closeModal: () => {
      setIsOpen(false);
      setQuery('');
      setDebouncedQuery('');
    },
    toggleModal: () => setIsOpen((prev) => !prev),
    query,
    setQuery,
    debouncedQuery,
    category,
    setCategory,
    selectedIndex,
    setSelectedIndex,
    results,
    totalCount: searchResultsQuery.data?.totalCount || 0,
    executionMs: searchResultsQuery.data?.executionMs || 0,
    isLoading: searchResultsQuery.isLoading && debouncedQuery.length >= 2,
    isError: searchResultsQuery.isError,
    recentSearches: recentSearchesQuery.data || [],
    clearRecentSearches: () => clearRecentMutation.mutate(),
  };
}
