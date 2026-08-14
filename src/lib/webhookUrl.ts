/**
 * The inbound webhook URLs we hand to customers.
 *
 * Four places built these by hand and two of them disagreed:
 *
 *   useWebhookConfig      window.location.origin + /v1/webhooks/incoming/<id>
 *   useIntegrationSettings  https://api.callmind.app/v1/webhooks/incoming/<id>
 *   useGoogleAdsConfig      https://api.callmind.app/v1/webhooks/googleads/<id>
 *   FacebookConfigPanel     https://api.callmind.app/v1/webhooks/facebook/<id>
 *
 * `api.callmind.app` is a guess about production DNS compiled into the client.
 * Worse, the two that disagreed were chained: useIntegrationSettings supplies
 * `initialConfig.url`, and useWebhookConfig reads `initialConfig.url || origin`
 * -- so the hardcoded host always won and the derived one never applied. A
 * customer given a URL that does not resolve gets no leads and no error, which
 * is the failure this whole area has been full of.
 *
 * One derivation, and an explicit override for the case where the API really
 * is on another host. If VITE_API_ORIGIN is set it is used; otherwise the
 * origin the app is being served from, which is correct whenever the Express
 * server and the app share a domain.
 */

const apiOrigin = (): string => {
  const configured = import.meta.env?.VITE_API_ORIGIN as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // Server-side render of the marketing pages. A relative path is honest --
  // it cannot be pasted anywhere useful, and nothing here is shown to a
  // logged-in customer during prerender.
  return '';
};

export type WebhookKind = 'incoming' | 'googleads' | 'facebook';

/**
 * The URL a customer pastes into the other system.
 *
 * Returns '' without a companyId, so a caller can render a placeholder rather
 * than a URL with the word "undefined" in it -- which people do paste.
 */
export function inboundWebhookUrl(companyId: string | null | undefined, kind: WebhookKind = 'incoming'): string {
  if (!companyId) return '';
  return `${apiOrigin()}/v1/webhooks/${kind}/${companyId}`;
}

/** A sample of the URL for documentation, where there is no company yet. */
export function inboundWebhookExample(kind: WebhookKind = 'incoming'): string {
  return `${apiOrigin()}/v1/webhooks/${kind}/<your-company-id>`;
}
