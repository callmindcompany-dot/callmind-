import { useEffect } from 'react';
import { SITE_URL } from '../siteConfig';
import { collectSeo, isServerRender } from '../seoCollector';

interface SEOHeadProps {
  /** Page title. Appears in the browser tab and as the primary search/share headline. */
  title: string;
  /** ~150–160 char summary for search snippets and link previews. */
  description: string;
  /**
   * Route path for this page, e.g. "/pricing". Used to build the canonical URL
   * and og:url. Defaults to the current pathname. Pass it explicitly so the
   * value is correct even before the router has painted.
   */
  path?: string;
  /** Absolute or root-relative OG/Twitter preview image. Defaults to /og-image.png. */
  image?: string;
  /** When true, asks crawlers not to index this page (e.g. legal/utility pages). */
  noindex?: boolean;
}

/**
 * Per-page document head manager.
 *
 * This is a pure SPA with no SSR, so every route ships the same index.html and
 * relies on this effect to set a unique title, description, canonical link and
 * social-share tags after mount. Without it, deep pages inherit the homepage's
 * metadata and every shared link previews as the homepage.
 *
 * No react-helmet dependency — it upserts tags directly. Meta tags set here
 * override the static fallbacks in index.html because they target the same
 * name/property attributes.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({ title, description, path, image, noindex }) => {
  // During prerendering there is no DOM and effects never run, so report the
  // same values to the collector that scripts/prerender.mjs reads. Browser
  // behaviour below is unchanged.
  if (isServerRender) {
    collectSeo({ title, description, path, image, noindex });
  }

  useEffect(() => {
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const imageUrl = image
      ? (image.startsWith('http') ? image : `${SITE_URL}${image}`)
      : `${SITE_URL}/og-image.jpg`;

    document.title = title;

    // Upsert a <meta name=...> or <meta property=...> tag.
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Upsert the single canonical link.
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:type', 'website');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);
  }, [title, description, path, image, noindex]);

  return null;
};
