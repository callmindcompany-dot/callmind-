import { describe, it, expect } from 'vitest';
import { checkChatRateLimit, SUPPORT_EMAIL, MAX_CHAT_MESSAGES_PER_MINUTE } from '../lib/aiGuardrail';
import { validateCrmPrompt } from '../lib/aiRouter';

describe('Chatbot Anti-Spam Rate Limiter & Short Hinglish Response Enforcement', () => {
  it('allows normal messaging under rate limit', () => {
    const user = `user-test-${Date.now()}`;
    for (let i = 0; i < MAX_CHAT_MESSAGES_PER_MINUTE - 1; i++) {
      const res = checkChatRateLimit(user);
      expect(res.isSpamming).toBe(false);
    }
  });

  it('triggers 5-minute lock when spam threshold (> 5 msgs/min) is reached', () => {
    const user = `user-spam-${Date.now()}`;
    for (let i = 0; i < MAX_CHAT_MESSAGES_PER_MINUTE; i++) {
      checkChatRateLimit(user);
    }
    // 6th message triggers rate limit lock
    const res = checkChatRateLimit(user);
    expect(res.isSpamming).toBe(true);
    expect(res.lockedUntil).toBeGreaterThan(Date.now());
  });

  it('provides official support email constant', () => {
    expect(SUPPORT_EMAIL).toBe('support@callmind.app');
  });

  it('enforces short Hinglish/English script response rule in system prompt', () => {
    const result = validateCrmPrompt('कॉल कसा सेव्ह करू?', 'chat');
    expect(result.isValid).toBe(true);
    expect(result.safePrompt).toContain('ALWAYS keep all responses VERY SHORT');
    expect(result.safePrompt).toContain('strictly in English script (Hinglish/English)');
  });
});
