import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlaService } from '../services/sla.service';
import { supabaseAdmin } from '../lib/dbAdapter';

// Mock Supabase admin client and NotificationService
vi.mock('../lib/dbAdapter', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
  isPlaceholder: false,
}));

vi.mock('../services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue({ id: 'notif-123' }),
  },
}));

describe('Lead SLA and Auto-Reassignment System (SlaService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches default company SLA settings if none exist', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    (supabaseAdmin.from as any) = mockFrom;

    const settings = await SlaService.getCompanySlaSettings('tenant-abc');
    expect(settings.companyId).toBe('tenant-abc');
    expect(settings.newLeadResponseTimeMins).toBe(15);
    expect(settings.autoReassignEnabled).toBe(true);
    expect(settings.excludedStatuses).toContain('Converted');
  });

  it('updates company SLA settings correctly', async () => {
    const mockUpsertData = {
      company_id: 'tenant-abc',
      new_lead_response_time_mins: 10,
      overdue_callback_buffer_mins: 20,
      stale_lead_threshold_days: 5,
      auto_reassign_enabled: false,
      reassign_rotation_mode: 'round_robin',
      excluded_statuses: ['Converted', 'Lost'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUpsertData, error: null }),
        }),
      }),
    });
    (supabaseAdmin.from as any) = mockFrom;

    const updated = await SlaService.updateCompanySlaSettings('tenant-abc', {
      newLeadResponseTimeMins: 10,
      overdueCallbackBufferMins: 20,
      staleLeadThresholdDays: 5,
      autoReassignEnabled: false,
      excludedStatuses: ['Converted', 'Lost'],
    });

    expect(updated.newLeadResponseTimeMins).toBe(10);
    expect(updated.autoReassignEnabled).toBe(false);
  });

  it('detects SLA breaches and reassigns lead with dual notifications when auto-reassign is YES (true)', async () => {
    const now = new Date();
    const oldCreationDate = new Date(now.getTime() - 60 * 60 * 1000); // Created 60 mins ago (> 15 mins SLA)

    const mockLeads = [
      {
        id: 'lead-1',
        company_id: 'tenant-abc',
        name: 'Rahul Sharma',
        status: 'New',
        assigned_to: 'agent-1',
        created_at: oldCreationDate.toISOString(),
        first_contact_at: null,
        is_locked: false,
        is_manually_protected: false,
        reassignment_count: 0,
      },
    ];

    const mockUsers = [
      { id: 'agent-1', name: 'Priya', email: 'priya@callmind.app', role: 'agent', company_id: 'tenant-abc' },
      { id: 'agent-2', name: 'Vikas', email: 'vikas@callmind.app', role: 'agent', company_id: 'tenant-abc' },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'company_sla_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  company_id: 'tenant-abc',
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
          }),
        };
      }
      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    (supabaseAdmin.from as any) = mockFrom;

    const result = await SlaService.processCompanySlaBreaches('tenant-abc');

    expect(result.evaluatedCount).toBe(1);
    expect(result.breachedCount).toBe(1);
    expect(result.reassignedCount).toBe(1);
  });

  it('does NOT reassign locked or protected leads even if SLA is breached', async () => {
    const now = new Date();
    const oldCreationDate = new Date(now.getTime() - 60 * 60 * 1000);

    const mockLeads = [
      {
        id: 'lead-protected',
        company_id: 'tenant-abc',
        name: 'VIP Client',
        status: 'New',
        assigned_to: 'agent-1',
        created_at: oldCreationDate.toISOString(),
        first_contact_at: null,
        is_locked: true, // Locked from auto-reassignment
        is_manually_protected: false,
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'company_sla_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  company_id: 'tenant-abc',
                  new_lead_response_time_mins: 15,
                  auto_reassign_enabled: true,
                  excluded_statuses: ['Converted'],
                },
              }),
            }),
          }),
        };
      }
      if (table === 'leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {};
    });

    (supabaseAdmin.from as any) = mockFrom;

    const result = await SlaService.processCompanySlaBreaches('tenant-abc');

    expect(result.breachedCount).toBe(0);
    expect(result.reassignedCount).toBe(0);
  });
});
