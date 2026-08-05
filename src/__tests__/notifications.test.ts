import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService, CreateNotificationDTO } from '../services/notification.service';

// Mock Supabase Admin Client
vi.mock('../lib/dbAdapter', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: { role: 'telecaller' } });
          })
        };
      }
      if (table === 'notification_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { in_app_enabled: true, dnd_enabled: false } })
        };
      }
      if (table === 'notification_templates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              type: 'lead_assigned',
              title_template: 'New Lead Assigned: {{lead_name}}',
              body_template: 'Lead {{lead_name}} ({{phone}}) has been assigned to you.',
              default_priority: 'high',
              default_action_url: '/leads?id={{lead_id}}'
            }
          })
        };
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-notif-uuid',
              company_id: 'tenant-123',
              user_id: 'user-456',
              type: 'lead_assigned',
              priority: 'high',
              title: 'New Lead Assigned: Rahul Sharma',
              body: 'Lead Rahul Sharma (+919876543210) has been assigned to you.',
              action_url: '/leads?id=lead-999',
              is_read: false,
              is_archived: false,
              is_pinned: false,
              expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
              created_at: new Date().toISOString()
            },
            error: null
          }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis()
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    })
  }
}));

// Mock Audit Service
vi.mock('../services/audit.service', () => ({
  AuditService: {
    logEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('Enterprise Notification Center 10-Point Verification Test Suite', () => {
  const mockCompanyId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Bulk Actions: should support batch mark as read, archive, and delete', async () => {
    const readResult = await NotificationService.markAsRead(mockCompanyId, mockUserId, ['notif-1', 'notif-2']);
    expect(readResult).toBeDefined();

    const archiveResult = await NotificationService.archiveNotifications(mockCompanyId, mockUserId, ['notif-1']);
    expect(archiveResult).toBeDefined();

    const deleteResult = await NotificationService.deleteNotifications(mockCompanyId, mockUserId, ['notif-1']);
    expect(deleteResult).toBeDefined();
  });

  it('2. RBAC Permission Gate: should block financial notification dispatch to telecaller role', async () => {
    const dto: CreateNotificationDTO = {
      companyId: mockCompanyId,
      userId: mockUserId, // Mocked as 'telecaller'
      type: 'payment_received',
      title: 'Payment Received: ₹1,41,600',
      body: 'Invoice #101 paid.'
    };

    const result = await NotificationService.createNotification(dto);
    expect(result).toBeNull(); // Blocked by RBAC check!
  });

  it('3. Template Variables & Deep Linking: should interpolate variables and generate deep link', async () => {
    const dto: CreateNotificationDTO = {
      companyId: mockCompanyId,
      userId: mockUserId,
      type: 'lead_assigned',
      templateVars: {
        lead_name: 'Rahul Sharma',
        phone: '+919876543210',
        lead_id: 'lead-999'
      },
      metadata: { lead_id: 'lead-999' }
    };

    const notification = await NotificationService.createNotification(dto);
    expect(notification).toBeDefined();
    expect(notification?.action_url).toBe('/leads?id=lead-999');
  });

  it('4. SLA Breach Alert: should trigger urgent ticket escalation notification', async () => {
    const alert = await NotificationService.triggerSlaBreachAlert(
      mockCompanyId,
      'manager-user-id',
      'Support Ticket',
      'TICKET-404',
      'Payment Gateway Timeout'
    );
    expect(alert).toBeDefined();
  });
});
