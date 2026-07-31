/**
 * Prerenders the public marketing routes to static HTML.
 *
 * WHY
 * The site is a client-rendered SPA, so the HTML the server returns for every
 * route is the same shell with an empty <div id="root">. Measured: one
 * character of visible text and no <h1>. That is invisible to the crawlers that
 * matter for answer engines — ChatGPT, Perplexity, Claude and most social
 * preview bots do not execute JavaScript — and it is unreliable for Bing and
 * for Google's deferred rendering pass. Per-page <title>/OG tags set from a
 * useEffect have the same problem.
 *
 * WHAT THIS DOES NOT CHANGE
 * The app stays an SPA. This only writes a real first paint to disk for the
 * public pages; React hydrates over it and everything behaves as before. The
 * authenticated app is untouched — it should not be prerendered and is not.
 *
 * Run after `vite build` (see the `build` script in package.json).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const ssrEntry = join(root, 'dist-ssr', 'entry-server.js');

/**
 * Public routes only. Anything behind auth is deliberately excluded: it has no
 * SEO value and prerendering it would bake a logged-out shell onto app URLs.
 * Keep in sync with public/sitemap.xml.
 */
const ROUTES = [
  '/',
  '/platform',
  '/product',
  '/mobile-app',
  '/pricing',
  '/solutions',
  '/security',
  '/integrations',
  '/company',
  '/contact',
  '/faq',
  '/docs',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refund',
];

const escapeAttr = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Replace a meta/link tag's content in the template, or append it if the
 * template has no such tag. The shell in index.html already carries fallback
 * Open Graph tags; per-route values must win over them.
 */
function upsertMeta(html, selectorAttr, key, value) {
  if (!value) return html;
  const pattern = new RegExp(
    `(<meta\\s+${selectorAttr}=["']${key}["'][^>]*content=["'])([^"']*)(["'][^>]*>)`,
    'i'
  );
  if (pattern.test(html)) {
    return html.replace(pattern, `$1${escapeAttr(value)}$3`);
  }
  return html.replace(
    '</head>',
    `    <meta ${selectorAttr}="${key}" content="${escapeAttr(value)}" />\n  </head>`
  );
}

function upsertCanonical(html, href) {
  if (!href) return html;
  const pattern = /(<link\s+rel=["']canonical["'][^>]*href=["'])([^"']*)(["'][^>]*>)/i;
  if (pattern.test(html)) return html.replace(pattern, `$1${escapeAttr(href)}$3`);
  return html.replace('</head>', `    <link rel="canonical" href="${escapeAttr(href)}" />\n  </head>`);
}

async function main() {
  if (!existsSync(ssrEntry)) {
    console.error(`[prerender] SSR bundle missing at ${ssrEntry}`);
    console.error('[prerender] Run: vite build --ssr src/entry-server.tsx --outDir dist-ssr');
    process.exit(1);
  }

  const templatePath = join(distDir, 'index.html');
  if (!existsSync(templatePath)) {
    console.error(`[prerender] dist/index.html missing — run the client build first.`);
    process.exit(1);
  }

  const template = readFileSync(templatePath, 'utf8');
  const { render } = await import(pathToFileURL(ssrEntry).href);

  const SITE_URL = 'https://callmind.app';
  let failures = 0;

  for (const route of ROUTES) {
    let rendered;
    try {
      rendered = render(route);
    } catch (err) {
      failures += 1;
      console.error(`[prerender] FAILED ${route}: ${err.message}`);
      continue;
    }

    const { html: appHtml, seo } = rendered;

    // A route that renders almost nothing means something threw inside a
    // component and React swallowed it into an empty tree. Shipping that would
    // be worse than not prerendering, because the crawler would cache a blank
    // page, so surface it instead.
    const textLength = appHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
    if (textLength < 200) {
      failures += 1;
      console.error(`[prerender] FAILED ${route}: rendered only ${textLength} chars of text`);
      continue;
    }

    let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    const canonical = `${SITE_URL}${seo.path ?? route}`;
    if (seo.title) {
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(seo.title)}</title>`);
    }
    html = upsertMeta(html, 'name', 'description', seo.description);
    html = upsertMeta(html, 'name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');
    html = upsertMeta(html, 'property', 'og:title', seo.title);
    html = upsertMeta(html, 'property', 'og:description', seo.description);
    html = upsertMeta(html, 'property', 'og:url', canonical);
    html = upsertMeta(html, 'name', 'twitter:title', seo.title);
    html = upsertMeta(html, 'name', 'twitter:description', seo.description);
    html = upsertCanonical(html, canonical);

    const outPath =
      route === '/' ? join(distDir, 'index.html') : join(distDir, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf8');

    console.log(`[prerender] ${route.padEnd(18)} ${String(textLength).padStart(6)} chars of text`);
  }

  if (failures > 0) {
    console.error(`\n[prerender] ${failures} route(s) failed — not shipping a half-prerendered build.`);
    process.exit(1);
  }
  console.log(`\n[prerender] ${ROUTES.length} routes written.`);
}

main().catch((err) => {
  console.error('[prerender] crashed:', err);
  process.exit(1);
});
