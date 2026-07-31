import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { resetSeo, getCollectedSeo, type CollectedSeo } from './website/seoCollector';

/**
 * Server entry used only by scripts/prerender.mjs at build time.
 *
 * This is not an SSR server — the app still ships as an SPA. The prerenderer
 * renders each public marketing route once during the build and writes the
 * resulting HTML to disk, so crawlers get real content instead of an empty
 * <div id="root">. The client then hydrates over it as usual.
 *
 * Deliberately mirrors src/main.tsx except for two things:
 *   - StaticRouter instead of BrowserRouter (no history/DOM on the server)
 *   - no Sentry init (nothing to report from a build step, and its browser
 *     integrations expect a DOM)
 */
export function render(url: string): { html: string; seo: CollectedSeo } {
  resetSeo();

  // A fresh client per route: prerendering must not carry cached query state
  // from one page into the next.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Nothing should fetch during prerender; if something tries, fail fast
        // rather than hanging the build on retries.
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StaticRouter>
    </StrictMode>
  );

  return { html, seo: getCollectedSeo() };
}
