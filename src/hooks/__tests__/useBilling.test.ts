import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscription, useInvoices, useRegisterUpgradeIntent } from '../useBilling';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Fetches subscription data', async () => {
    const mockData = { id: 'test-company-id', plan: 'pro' };
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null })
    }));

    const { result } = renderHook(() => useSubscription('test-company-id'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('Fetches invoice history', async () => {
    const mockInvoices = [{ id: 'inv-1', amount: 100 }, { id: 'inv-2', amount: 200 }];
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
    }));

    const { result } = renderHook(() => useInvoices('test-company-id'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockInvoices);
  });

  it('Handles upgrade mutation', async () => {
    const mockIntent = { id: 'intent-1', status: 'pending' };
    const singleFn = vi.fn().mockResolvedValue({ data: mockIntent, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });

    (supabase.from as any).mockImplementation(() => ({
      insert: insertFn,
    }));

    const { result } = renderHook(() => useRegisterUpgradeIntent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        user_id: 'u1',
        user_email: 'test@example.com',
        company_id: 'c1',
        plan_id: 'pro',
        seats: 5,
        duration_months: 12,
        addons: [],
        total_amount: 1000
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertFn).toHaveBeenCalled();
  });
});
