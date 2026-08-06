import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadsPage } from '@components/LeadsPage';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Hooks
vi.mock('@/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: '123', email: 'test@example.com' },
    isFounder: false,
    profile: { onboardingStatus: 'completed' },
    isReady: true
  }))
}));

vi.mock('@/CompanyContext', () => ({
  useCompany: vi.fn(() => ({
    companyId: 'comp_123'
  }))
}));

// Mock Custom React Query hooks
vi.mock('@/hooks/useLeadsQuery', () => ({
  useLeadsQuery: vi.fn(() => ({
    data: {
      leads: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1
    },
    isLoading: false,
    refetch: vi.fn()
  })),
  LEAD_SORT_LABELS: {
    newest: 'Newest first',
    oldest: 'Oldest first',
    oldest_activity: 'Longest without activity',
    recent_activity: 'Recently active',
    score: 'Highest score',
    value: 'Highest value',
    name: 'Name (A-Z)',
  }
}));

vi.mock('@/hooks/useTeamSettingsQuery', () => ({
  useTeamSettingsQuery: vi.fn(() => ({
    data: {
      hidePhoneNumbers: false,
      rottingThreshold: 3,
      fieldLabels: {}
    },
    isLoading: false
  }))
}));

vi.mock('@/hooks/useImportLogsQuery', () => ({
  useImportLogsQuery: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}));

vi.mock('@/hooks/useAgentsQuery', () => ({
  useAgentsQuery: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}));

vi.mock('@/hooks/useLeadMutations', () => ({
  useLeadMutations: vi.fn(() => ({
    bulkDeleteMutation: { mutateAsync: vi.fn() },
    bulkAssignMutation: { mutateAsync: vi.fn() },
    bulkStatusMutation: { mutateAsync: vi.fn() }
  }))
}));

// Mock Supabase client
vi.mock('@/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null }))
        }))
      }))
    }))
  }
}));


// Mock components that use Framer Motion or other complex animations if they cause issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LeadsPage without crashing', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LeadsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    // Initially shows "Lead Control Hub"
    expect(screen.getByText(/Lead Control Hub/i)).toBeInTheDocument();

    // Click on "Leads Management" feature card
    const listBtn = screen.getByText(/Leads Management/i);
    fireEvent.click(listBtn);

    // Now search input should be present
    expect(screen.getByPlaceholderText(/Name\/Phone\/Email/i)).toBeInTheDocument();
  });

  it('shows empty state when no leads', async () => {
    localStorage.setItem('mock_leads', '[]');
    const { fireEvent } = await import('@testing-library/react');
    try {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <LeadsPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      
      // Click on "Leads Management"
      const listBtn = screen.getByText(/Leads Management/i);
      fireEvent.click(listBtn);

      // Check for empty state message inside the list view
      expect(screen.getByText(/Your Pipeline is Empty/i)).toBeInTheDocument();
    } finally {
      localStorage.removeItem('mock_leads');
    }
  });
});
