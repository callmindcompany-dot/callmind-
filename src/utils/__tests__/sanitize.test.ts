import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '../sanitize';

describe('sanitizeHTML', () => {
  it('Removes script tags', () => {
    const input = '<div>Hello <script>alert("hack")</script>World</div>';
    expect(sanitizeHTML(input)).toBe('&lt;div&gt;Hello World&lt;/div&gt;');
  });

  it('Handles empty input', () => {
    expect(sanitizeHTML('')).toBe('');
    expect(sanitizeHTML(null as unknown as string)).toBe('');
  });

  it('Handles special characters', () => {
    const input = 'AT&T "quote" < > \'';
    expect(sanitizeHTML(input)).toBe('AT&amp;T &quot;quote&quot; &lt; &gt; &#039;');
  });
});
