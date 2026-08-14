import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { inboundWebhookUrl, inboundWebhookExample } from '../lib/webhookUrl';

/**
 * The webhook URL we hand a customer has to be one that resolves.
 *
 * Four places built these by hand and two disagreed: useWebhookConfig derived
 * it from window.location.origin, while useIntegrationSettings,
 * useGoogleAdsConfig and FacebookConfigPanel hardcoded
 * https://api.callmind.app -- a guess about production DNS compiled into the
 * client.
 *
 * The two that disagreed were also chained. useIntegrationSettings supplies
 * `initialConfig.url`, and useWebhookConfig reads `initialConfig.url || origin`,
 * so the hardcoded host always won and the derived one never applied. An
 * earlier fix to useWebhookConfig was therefore silently undone by the code
 * that fed it -- which is exactly why this is a test and not a comment.
 *
 * A customer given a URL that does not resolve gets no leads and no error.
 */

const ROOT = process.cwd();
const codeOf = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const BUILDERS = [
  'src/hooks/useIntegrationSettings.ts',
  'src/hooks/useWebhookConfig.ts',
  'src/hooks/useGoogleAdsConfig.ts',
  'src/components/integrations/FacebookConfigPanel.tsx',
];

describe('inbound webhook URLs', () => {
  const origin = 'https://app.example.test';

  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is built from the origin the app is served from', () => {
    expect(inboundWebhookUrl('c1')).toBe(`${origin}/v1/webhooks/incoming/c1`);
    expect(inboundWebhookUrl('c1', 'googleads')).toBe(`${origin}/v1/webhooks/googleads/c1`);
    expect(inboundWebhookUrl('c1', 'facebook')).toBe(`${origin}/v1/webhooks/facebook/c1`);
  });

  it('returns nothing without a company, rather than a URL with undefined in it', () => {
    // People paste whatever is in the box.
    expect(inboundWebhookUrl(null)).toBe('');
    expect(inboundWebhookUrl(undefined)).toBe('');
    expect(inboundWebhookUrl('')).toBe('');
  });

  it('offers a placeholder for documentation', () => {
    expect(inboundWebhookExample()).toContain('<your-company-id>');
  });

  it('no builder hardcodes a production host', () => {
    // Comments stripped: three of these files explain the old URL, and
    // matching the explanation would fail the files that fixed it.
    for (const file of BUILDERS) {
      expect(codeOf(file), `${file} hardcodes the API host again`).not.toMatch(
        /https:\/\/api\.callmind\.app/,
      );
    }
  });

  it('every builder goes through the one helper', () => {
    for (const file of BUILDERS) {
      expect(codeOf(file), `${file} builds its own URL`).toMatch(/inboundWebhook(Url|Example)\(/);
    }
  });

  it('the settings fallback cannot beat the derived URL again', () => {
    // This is the specific regression: useWebhookConfig reads
    // `initialConfig.url || <derived>`, so whatever useIntegrationSettings puts
    // in `url` wins. It must be the derived one, not a literal.
    const settings = codeOf('src/hooks/useIntegrationSettings.ts');
    expect(settings).toMatch(/url:\s*wh\.url \|\| inboundWebhookUrl\(companyId\)/);
  });
});
