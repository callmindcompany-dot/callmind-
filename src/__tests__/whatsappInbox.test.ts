import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppInboxService } from '../services/whatsappInbox.service';
import crypto from 'crypto';

vi.mock('../lib/dbAdapter', () => ({
  isPlaceholder: false,
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('WhatsApp Shared Inbox (Step 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateWebhookSignature()', () => {
    it('validates authentic Meta HMAC SHA-256 signatures', () => {
      const payload = JSON.stringify({ event: 'message_received', phone: '+919876543210' });
      const secret = 'my_webhook_secret_key';
      const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const isValid = WhatsAppInboxService.validateWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or invalid webhook signatures', () => {
      const payload = JSON.stringify({ event: 'message_received', phone: '+919876543210' });
      const secret = 'my_webhook_secret_key';
      const invalidSignature = 'sha256=invalid_hex_string_signature';

      const isValid = WhatsAppInboxService.validateWebhookSignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('sendMessage()', () => {
    it('rejects message if required fields are missing', async () => {
      const res = await WhatsAppInboxService.sendMessage('', 'conv-1', 'sender-1', '');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Missing mandatory fields');
    });

    it('attaches unique idempotency key when storing outbound message', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      let capturedPayload: any = null;

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'whatsapp_messages') {
          return {
            insert: (payload: any) => {
              capturedPayload = payload;
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'msg-uuid-123' }, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'whatsapp_conversations') {
          return {
            update: () => ({
              eq: () => ({
                eq: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await WhatsAppInboxService.sendMessage(
        'company-1',
        'conv-123',
        '+919876543210',
        'Hello from CallMind Inbox!'
      );

      expect(res.success).toBe(true);
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.idempotency_key).toContain('wa_company-1_conv-123');
    });
  });
});
