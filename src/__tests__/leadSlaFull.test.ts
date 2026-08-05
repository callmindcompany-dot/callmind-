import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlaService } from '../services/sla.service';

// Mock dependencies
vi.mock('../lib/dbAdapter', () => ({
  isPlaceholder: false,
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue(true),
  },
}));

describe('Lead SLA & Auto-Reassignment Engine (Step 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SlaService.getCompanySlaSettings()', () => {
    it('returns default SLA settings when no custom configuration exists', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      (supabaseAdmin.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      });

      const settings = await SlaService.getCompanySlaSettings('company-test-1');
      expect(settings.companyId).toBe('company-test-1');
      expect(settings.newLeadResponseTimeMins).toBe(15);
      expect(settings.overdueCallbackBufferMins).toBe(30);
      expect(settings.staleLeadThresholdDays).toBe(7);
      expect(settings.autoReassignEnabled).toBe(true);
    });
  });

  describe('SlaService.processCompanySlaBreaches()', () => {
    it('detects uncontacted new lead response time breaches and reassigns online agents', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      const now = new Date();
      const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000); // Exceeds 15 mins SLA

      const mockLead = {
        id: 'lead-101',
        name: 'Rahul Sharma',
        company_id: 'company-test-1',
        status: 'New Lead',
        created_at: twentyMinsAgo.toISOString(),
        first_contact_at: null,
        assigned_to: 'agent-old',
        reassignment_count: 0,
      };

      const mockAgents = [
        { id: 'agent-old', status: 'online', role: 'telecaller' },
        { id: 'agent-new', status: 'online', role: 'telecaller' },
      ];

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'company_sla_settings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    company_id: 'company-test-1',
                    new_lead_response_time_mins: 15,
                    auto_reassign_enabled: true,
                    excluded_statuses: ['Converted', 'Lost'],
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'leads') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({ data: [mockLead], error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          };
        }

        if (table === 'users') {
          return {
            select: () => ({
              eq: async () => ({ data: mockAgents, error: null }),
            }),
          };
        }

        if (table === 'audit_logs') {
          return {
            insert: async () => ({ data: null, error: null }),
          };
        }

        return { select: () => ({ eq: () => ({ async: () => ({ data: [], error: null }) }) }) };
      });

      const result = await SlaService.processCompanySlaBreaches('company-test-1');
      expect(result.evaluatedCount).toBe(1);
      expect(result.breachedCount).toBe(1);
      expect(result.reassignedCount).toBe(1);
    });

    it('never reassigns converted or protected status leads', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      const now = new Date();
      const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

      const mockConvertedLead = {
        id: 'lead-converted-1',
        name: 'Priya Patel',
        company_id: 'company-test-1',
        status: 'Converted', // Protected status
        created_at: twentyMinsAgo.toISOString(),
        first_contact_at: null,
        assigned_to: 'agent-1',
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'company_sla_settings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    company_id: 'company-test-1',
                    new_lead_response_time_mins: 15,
                    auto_reassign_enabled: true,
                    excluded_statuses: ['Converted', 'Lost'],
                  },
                }),
              }),
            }),
          };
        }

        if (table === 'leads') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({ data: [mockConvertedLead], error: null }),
              }),
            }),
          };
        }

        if (table === 'users') {
          return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
        }

        return {};
      });

      const result = await SlaService.processCompanySlaBreaches('company-test-1');
      expect(result.breachedCount).toBe(0);
      expect(result.reassignedCount).toBe(0);
    });

    it('enforces tenant isolation and rejects cross-tenant lead access', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      let capturedCompanyId = '';

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'company_sla_settings') {
          return {
            select: () => ({
              eq: (col: string, val: string) => {
                capturedCompanyId = val;
                return { maybeSingle: async () => ({ data: null }) };
              },
            }),
          };
        }
        return { select: () => ({ eq: () => ({ or: async () => ({ data: [] }) }) }) };
      });

      await SlaService.processCompanySlaBreaches('tenant-xyz');
      expect(capturedCompanyId).toBe('tenant-xyz');
    });
  });
});
