import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider } from '../../AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }))
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(AuthProvider, null, children);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Returns user when authenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user', email: 'test@example.com' } } }
    });
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'admin', company_id: 'test-company' } })
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });
    expect(result.current.user?.id).toBe('test-user');
  });

  it('Returns null when not authenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.user).toBeNull();
  });

  it('Handles sign out', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user', email: 'test@example.com' } } }
    });
    (supabase.auth.signOut as any).mockResolvedValue({});
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'admin' } })
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
