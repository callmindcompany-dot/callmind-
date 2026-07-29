import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../../ProtectedRoute';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAuth } from '../../AuthContext';
import React from 'react';

vi.mock('../../AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock Navigate
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-testid': 'navigate' }, to),
  useLocation: () => ({ pathname: '/dashboard' })
}));

const baseAuthState = {
  user: null as any,
  profile: null as any,
  loading: false,
  isAuthenticated: false,
  isOnboarded: true,
  isReady: true,
  isFounder: false,
  isGodMode: false,
  hasFounderHubAccess: false,
  isLoggingOut: false,
  accountStatus: 'active' as const,
  signOut: vi.fn(),
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Shows children for authenticated users', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseAuthState,
      user: { id: 'user-1', role: 'admin' },
      isAuthenticated: true,
    });

    render(
      React.createElement(ProtectedRoute, null,
        React.createElement('div', { 'data-testid': 'child' }, 'Protected Content')
      )
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('Redirects unauthenticated users', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseAuthState,
      user: null,
      isAuthenticated: false,
    });

    render(
      React.createElement(ProtectedRoute, null,
        React.createElement('div', null, 'Protected Content')
      )
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('/login');
  });

  it('Respects role-based access', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseAuthState,
      user: { id: 'user-1', role: 'agent' },
      isAuthenticated: true,
      hasFounderHubAccess: false,
    });

    render(
      React.createElement(ProtectedRoute, { requireFounder: true } as any,
        React.createElement('div', null, 'Admin Only Content')
      )
    );

    // ProtectedRoute redirects to /dashboard when requireFounder is true and user lacks access
    expect(screen.getByTestId('navigate')).toHaveTextContent('/dashboard');
  });
});
