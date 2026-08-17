import React, { useEffect } from 'react';
import { SITE_URL } from '../siteConfig';
import { collectSeo, isServerRender, BreadcrumbItem } from '../seoCollector';

export interface SEOHeadProps {
  /** Page title. Appears in the browser tab and as the primary search/share headline. */
  title: string;
  /** ~150–160 char summary for search snippets and link previews. */
  description: string;
  /**
   * Route path for this page, e.g. "/pricing". Used to build the canonical URL
   * and og:url. Defaults to the current pathname.
   */
  path?: string;
  /** Absolute or root-relative OG/Twitter preview image. Defaults to /og-image.jpg. */
  image?: string;
  /** When true, asks crawlers not to index this page (e.g. legal/utility pages). */
  noindex?: boolean;
  /** Targeted search keywords. */
  keywords?: string[];
  /** Breadcrumb navigation items for Schema.org BreadcrumbList. */
  breadcrumbs?: BreadcrumbItem[];
  /** Schema.org structured data object or array of objects. */
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Per-page document head & SEO manager.
 * Supports dynamic client meta injection as well as build-time static HTML prerendering.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  path,
  image,
  noindex,
  keywords,
  breadcrumbs,
  jsonLd,
}) => {
  // During prerendering there is no DOM and effects never run, so report the
  // values to the collector that scripts/prerender.mjs reads.
  if (isServerRender) {
    collectSeo({ title, description, path, image, noindex, keywords, breadcrumbs, jsonLd });
  }

  useEffect(() => {
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const imageUrl = image
      ? image.startsWith('http')
        ? image
        : `${SITE_URL}${image}`
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

    // Upsert the canonical link.
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    setMeta('name', 'description', description);
    if (keywords && keywords.length > 0) {
      setMeta('name', 'keywords', keywords.join(', '));
    }
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'CallMind CRM');
    setMeta('property', 'og:locale', 'en_IN');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', imageUrl);

    // Schema.org Structured Data
    const schemas: Array<Record<string, any>> = [];
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.path.startsWith('http') ? b.path : `${SITE_URL}${b.path}`,
        })),
      });
    }

    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        schemas.push(...jsonLd);
      } else {
        schemas.push(jsonLd);
      }
    }

    let scriptEl = document.head.querySelector<HTMLScriptElement>('script#page-structured-data');
    if (schemas.length > 0) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.setAttribute('type', 'application/ld+json');
        scriptEl.setAttribute('id', 'page-structured-data');
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': schemas,
      });
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, path, image, noindex, keywords, breadcrumbs, jsonLd]);

  return null;
};

