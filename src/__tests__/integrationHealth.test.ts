import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationHealthService } from '../services/integrationHealth.service';

vi.mock('../lib/dbAdapter', () => ({
  isPlaceholder: false,
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('Integration Health Center (Step 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('maskErrorSecrets()', () => {
    it('redacts sensitive API tokens, passwords, and bearer headers from error logs', () => {
      const rawError = 'Error connecting to IndiaMART API with Bearer secret-token-xyz123 and token=my_secret_key';
      const masked = IntegrationHealthService.maskErrorSecrets(rawError);

      expect(masked).not.toContain('secret-token-xyz123');
      expect(masked).not.toContain('my_secret_key');
      expect(masked).toContain('[REDACTED_TOKEN]');
      expect(masked).toContain('[REDACTED_SECRET]');
    });

    it('redacts email credentials from error stack traces', () => {
      const rawError = 'SMTP Auth failed for user info@company.com with password=secretPass';
      const masked = IntegrationHealthService.maskErrorSecrets(rawError);

      expect(masked).not.toContain('info@company.com');
      expect(masked).not.toContain('secretPass');
      expect(masked).toContain('[REDACTED_EMAIL]');
    });
  });

  describe('calculateExponentialBackoffMins()', () => {
    it('calculates exponential delay based on retry count (2^count)', () => {
      expect(IntegrationHealthService.calculateExponentialBackoffMins(1)).toBe(2);
      expect(IntegrationHealthService.calculateExponentialBackoffMins(2)).toBe(4);
      expect(IntegrationHealthService.calculateExponentialBackoffMins(3)).toBe(8);
      expect(IntegrationHealthService.calculateExponentialBackoffMins(4)).toBe(16);
    });
  });

  describe('triggerManualRetry()', () => {
    it('blocks manual retry for unauthorized roles like telecaller', async () => {
      const res = await IntegrationHealthService.triggerManualRetry(
        'company-1',
        'IndiaMART',
        'telecaller',
        'user-123',
        'telecaller@callmind.app'
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Unauthorized');
    });

    it('allows manual retry for authorized founder or admin roles', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { insert: async () => ({ data: null, error: null }) };
        }
        if (table === 'integration_health') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
            upsert: async () => ({ data: null, error: null }),
          };
        }
        return {};
      });

      const res = await IntegrationHealthService.triggerManualRetry(
        'company-1',
        'IndiaMART',
        'founder',
        'founder-123',
        'founder@callmind.app'
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('Retry triggered');
    });
  });
});
