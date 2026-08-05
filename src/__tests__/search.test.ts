import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../services/search.service';

// Mock Supabase Admin Client
vi.mock('../lib/dbAdapter', () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockImplementation((fnName: string, params: any) => {
      if (fnName === 'search_global_crm') {
        const query = params.p_query?.toLowerCase() || '';
        const role = params.p_user_role;

        const allResults = [
          {
            id: 'lead-1',
            module: 'leads',
            title: 'Rahul Sharma',
            subtitle: 'Tech Corp | +919876543210 | rahul@techcorp.in',
            badge: 'New',
            action_url: '/leads?id=lead-1',
            metadata: { phone: '+919876543210', email: 'rahul@techcorp.in' },
            score: 0.9,
          },
          {
            id: 'inv-1',
            module: 'invoices',
            title: 'Invoice #INV-101',
            subtitle: 'Amount: ₹1,41,600 | Status: Paid',
            badge: 'Paid',
            action_url: '/billing?invoice=INV-101',
            metadata: { amount: 141600 },
            score: 0.85,
          },
        ];

        // Filter by query and RBAC role
        const filtered = allResults.filter((r) => {
          if (role === 'telecaller' && r.module === 'invoices') return false; // RBAC Security
          if (query) {
            return (
              r.title.toLowerCase().includes(query) ||
              r.subtitle.toLowerCase().includes(query)
            );
          }
          return true;
        });

        return Promise.resolve({ data: filtered, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    from: vi.fn((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { query_text: 'Rahul Sharma', created_at: new Date().toISOString() },
            { query_text: 'INV-101', created_at: new Date().toISOString() }
          ],
          error: null
        })
      };
    })
  }
}));

describe('Enterprise Global Search System Test Suite', () => {
  const mockCompanyId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search multi-module records and return formatted results', async () => {
    const response = await SearchService.search(
      mockCompanyId,
      mockUserId,
      'founder', // Founder role has full access
      'Rahul',
      ['all'],
      20,
      0
    );

    expect(response).toBeDefined();
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].title).toContain('Rahul');
  });

  it('should block financial invoice search results for telecaller role', async () => {
    const response = await SearchService.search(
      mockCompanyId,
      mockUserId,
      'telecaller', // Telecaller role
      'INV-101',
      ['all'],
      20,
      0
    );

    const invoiceResult = response.results.find((r) => r.module === 'invoices');
    expect(invoiceResult).toBeUndefined(); // Financial result masked!
  });

  it('should return fast autocomplete suggestions', async () => {
    const suggestions = await SearchService.getSuggestions(
      mockCompanyId,
      mockUserId,
      'founder',
      'Rahul'
    );

    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].title).toBe('Rahul Sharma');
  });

  it('should save and retrieve recent user search history', async () => {
    await SearchService.saveRecentSearch(mockCompanyId, mockUserId, 'Rahul Sharma');
    const recent = await SearchService.getRecentSearches(mockCompanyId, mockUserId);

    expect(recent).toBeDefined();
    expect(recent.length).toBeGreaterThan(0);
  });
});
