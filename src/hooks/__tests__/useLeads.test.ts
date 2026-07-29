import { renderHook, waitFor } from '@testing-library/react';
import { useLeads } from '../useLeads';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('../../CompanyContext', () => ({
  useCompany: () => ({ companyId: 'test-company-id' })
}));

vi.mock('../../services/leads.service', () => ({
  LeadService: {
    fetchLeads: vi.fn()
  }
}));

import { LeadService } from '../../services/leads.service';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated data', async () => {
    const mockData = { data: [{ id: '1', name: 'Lead 1' }], nextPage: 2 };
    (LeadService.fetchLeads as any).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toEqual(mockData);
    expect(LeadService.fetchLeads).toHaveBeenCalledWith('test-company-id', undefined, 1);
  });

  it('handles loading state', () => {
    (LeadService.fetchLeads as any).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    
    expect(result.current.isLoading).toBe(true);
  });

  it('handles error state', async () => {
    (LeadService.fetchLeads as any).mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    
    expect(result.current.error?.message).toBe('Network error');
  });
});
