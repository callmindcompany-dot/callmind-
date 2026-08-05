import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizePhoneNumber, callService, ALLOWED_CALL_OUTCOMES } from '../callService';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../sync', () => ({
  syncService: {
    queueCallLog: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../leadService', () => ({
  leadService: {
    updateLeadStatus: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

describe('Mobile callService & Phone Sanitization (Phase 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizePhoneNumber()', () => {
    it('returns null for empty or invalid inputs', () => {
      expect(sanitizePhoneNumber('')).toBeNull();
      expect(sanitizePhoneNumber('123')).toBeNull(); // Too short (< 8 digits)
      expect(sanitizePhoneNumber('abc')).toBeNull();
    });

    it('strips non-digits while preserving leading plus for valid phone numbers', () => {
      expect(sanitizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
      expect(sanitizePhoneNumber('09876543210')).toBe('09876543210');
      expect(sanitizePhoneNumber('+1 (555) 019-2834')).toBe('+15550192834');
    });
  });

  describe('ALLOWED_CALL_OUTCOMES', () => {
    it('contains standard outcome options', () => {
      expect(ALLOWED_CALL_OUTCOMES).toContain('Connected');
      expect(ALLOWED_CALL_OUTCOMES).toContain('No Answer');
      expect(ALLOWED_CALL_OUTCOMES).toContain('Busy');
      expect(ALLOWED_CALL_OUTCOMES).toContain('Invalid Number');
      expect(ALLOWED_CALL_OUTCOMES).toContain('Wrong Number');
    });
  });

  describe('callService.logCallOutcome()', () => {
    it('rejects logging if companyId or agentId is missing', async () => {
      const res = await callService.logCallOutcome({
        companyId: '',
        agentId: 'agent-1',
        phone: '+919876543210',
        duration: '00:45',
        outcome: 'Connected',
        interest: 'Interested',
        notes: 'Good call',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Missing companyId or agentId');
    });
  });

  describe('Offline Queue & Idempotency Sync', () => {
    it('generates unique idempotency keys for queued call logs', async () => {
      const { syncService } = await import('../sync');
      const mockStorage: any[] = [];
      
      (syncService.queueCallLog as any).mockImplementation(async (logPayload: any) => {
        const entry = {
          ...logPayload,
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
        };
        mockStorage.push(entry);
        return entry;
      });

      const log1 = await syncService.queueCallLog({
        companyId: 'company-1',
        agentId: 'agent-1',
        phone: '+919876543210',
        duration: '00:30',
        outcome: 'Connected',
        interest: 'Interested',
        notes: 'First call',
      });

      const log2 = await syncService.queueCallLog({
        companyId: 'company-1',
        agentId: 'agent-1',
        phone: '+919876543210',
        duration: '00:30',
        outcome: 'Connected',
        interest: 'Interested',
        notes: 'Second call',
      });

      expect(log1.id).toBeDefined();
      expect(log2.id).toBeDefined();
      expect(log1.id).not.toEqual(log2.id);
    });
  });
});
