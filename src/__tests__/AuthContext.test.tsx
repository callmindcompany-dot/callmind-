import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import React from 'react';

vi.mock('../supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: '123', email: 'shindevrushabh02@gmail.com' } } },
          error: null
        })),
        onAuthStateChange: vi.fn((cb) => {
          // Trigger signed in status for testing
          cb('SIGNED_IN', { user: { id: '123', email: 'shindevrushabh02@gmail.com' } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signOut: vi.fn(async () => ({ error: null }))
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { company_id: 'comp_123', role: 'founder' },
              error: null
            })),
            single: vi.fn(async () => ({
              data: { company_id: 'comp_123', email: 'shindevrushabh02@gmail.com', role: 'founder' },
              error: null
            }))
          }))
        }))
      }))
    }
  };
});

// Mock constants to provide test founder emails (F-02 removed hardcoded fallbacks)
vi.mock('../constants', () => ({
  masterFounderEmail: 'shindevrushabh02@gmail.com',
  FOUNDER_OWNERS: ['shindevrushabh02@gmail.com'],
  INTERNAL_TEAM: ['shindevrushabh02@gmail.com'],
  USER_PERSPECTIVE_TESTERS: []
}));


const TestComponent = () => {
  const { isAuthenticated, user, isSuperFounder, signOut } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="super-founder">{isSuperFounder ? 'Yes' : 'No'}</div>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'active' }),
      })
    );
  });

  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
  });

  it('identifies super founder correctly', async () => {
    const mockUser = {
      user: { uid: '123', email: 'shindevrushabh02@gmail.com' },
      profile: { email: 'shindevrushabh02@gmail.com', onboardingStatus: 'completed', role: 'founder' }
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('super-founder')).toHaveTextContent('Yes');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    localStorage.removeItem('mock_user');
  });

  it('clears state on signOut', async () => {
    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    localStorage.setItem('mock_user', 'some_user');
    localStorage.setItem('rememberMe', 'true');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signOutBtn = screen.getByText('Sign Out');
    await act(async () => {
      signOutBtn.click();
    });

    expect(localStorage.getItem('mock_user')).toBeNull();
    expect(localStorage.getItem('rememberMe')).toBeNull();
    expect(window.location.href).toBe('/');
    
    // Restore window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation
    });
  });
});
