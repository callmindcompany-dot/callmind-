import { describe, it, expect } from 'vitest';

/**
 * The lead search decides between two very different queries, and picking the
 * wrong one is the difference between an index lookup and a scan of the whole
 * tenant on every keystroke.
 *
 * This mirrors the branch in useLeadsQuery. The hook itself is not imported
 * because it pulls in the Supabase client at module load; what matters here is
 * the classification rule, which is easy to get subtly wrong.
 */
function looksLikePhone(raw: string): boolean {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  return digits.length >= 4 && digits.length === trimmed.replace(/[\s+\-()]/g, '').length;
}

/** The last ten digits, so a number typed with +91 still matches. */
function localPart(raw: string): string {
  const digits = raw.trim().replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

describe('lead search routing', () => {
  it.each([
    '9876543210',
    '98765',
    '+91 98765 43210',
    '+919876543210',
    '(98765) 43210',
    '98765-43210',
  ])('treats %s as a phone number', (input) => {
    expect(looksLikePhone(input)).toBe(true);
  });

  it.each([
    'Rahul',
    'rahul@example.com',
    'Rahul 9876',
    'A1',
    '',
    '123',
  ])('does not treat %s as a phone number', (input) => {
    expect(looksLikePhone(input)).toBe(false);
  });

  it('needs at least four digits before committing to a phone lookup', () => {
    // Fewer digits than this matches most of the table, so the text search is
    // the better branch.
    expect(looksLikePhone('123')).toBe(false);
    expect(looksLikePhone('1234')).toBe(true);
  });

  it('strips the country code so +91 and bare numbers find the same lead', () => {
    // Indian numbers are stored inconsistently -- IndiaMART sends +91, a CSV
    // import often does not. Matching on the last ten digits covers both.
    expect(localPart('+919876543210')).toBe('9876543210');
    expect(localPart('919876543210')).toBe('9876543210');
    expect(localPart('9876543210')).toBe('9876543210');
    expect(localPart('98765')).toBe('98765');
  });

  it('does not mistake an email containing digits for a phone number', () => {
    // '@' and '.' survive the whitespace strip but not the digit strip, so the
    // two lengths differ and the text branch is chosen.
    expect(looksLikePhone('user123@mail.com')).toBe(false);
  });
});
