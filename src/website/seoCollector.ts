/**
 * Collects the SEO metadata a page declares, so the prerenderer can write it
 * into the static HTML.
 *
 * SEOHead normally sets title/description/canonical/OG tags from a useEffect,
 * which is fine in the browser but never runs during server rendering — and the
 * crawlers that matter most for AEO/GEO (ChatGPT, Perplexity and friends) do
 * not execute JavaScript at all. Rather than maintain a second route→metadata
 * table that would drift from the props each page already passes, SEOHead also
 * reports those same props here while rendering on the server, and
 * scripts/prerender.mjs reads them back after renderToString.
 *
 * This is the same approach react-helmet uses. The mutation happens during
 * render, which is only safe because it is server-only and each render is
 * bracketed by resetSeo().
 */

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface CollectedSeo {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

let collected: CollectedSeo = {};

/** True when running outside a browser (prerender/build). */
export const isServerRender = typeof window === 'undefined';

/** Call before rendering a route. */
export function resetSeo(): void {
  collected = {};
}

/**
 * Record a page's SEO props. Last writer wins, which matches the browser
 * behaviour where the innermost SEOHead is the one that ends up in the DOM.
 */
export function collectSeo(seo: CollectedSeo): void {
  collected = { ...collected, ...seo };
}

/** Read what the just-rendered route declared. */
export function getCollectedSeo(): CollectedSeo {
  return collected;
}
