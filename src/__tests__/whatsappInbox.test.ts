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

    /*
     * This used to assert that a well-formed send stored a whatsapp_messages
     * row with an idempotency key and returned success: true.
     *
     * It did all of that, and never sent anything: the row was written with
     * status 'sent' while supabase/functions/send-whatsapp-message had the Meta
     * Graph API call commented out and returned a hardcoded
     * "wamid.HBgLOTE5OTk5OTk5OTk5..." for a message that did not exist. So the
     * test passed on the exact behaviour that made the product lie -- the
     * telecaller saw the message delivered and the customer heard nothing.
     *
     * The assertion is inverted now: nothing is written and nothing succeeds
     * until there is a provider to send through.
     */
    it('refuses, and writes no row, while no provider is connected', async () => {
      const { supabaseAdmin } = await import('../lib/dbAdapter');
      (supabaseAdmin.from as any).mockImplementation(() => {
        throw new Error('sendMessage must not touch the database');
      });

      const res = await WhatsAppInboxService.sendMessage(
        'company-1',
        'conv-123',
        '+919876543210',
        'Hello from CallMind Inbox!'
      );

      expect(res.success).toBe(false);
      expect(res.messageId).toBeUndefined();
      expect(res.error).toMatch(/not available yet/i);
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });
  });
});
