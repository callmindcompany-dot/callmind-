import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import { requestLogger } from "./src/lib/requestLogger";
import { logger } from "./src/lib/logger";

// Import modular routes
import aiRouter from "./src/routes/ai";
import adminRouter, { runTrialExpirationJob } from "./src/routes/admin";
import authRouter from "./src/routes/auth";
import leadsRouter, { startLeadsBackgroundCrons } from "./src/routes/leads";
import callsRouter from "./src/routes/calls";
import paymentsRouter from "./src/routes/payments";
import notificationsRouter from "./src/routes/notifications";
import searchRouter from "./src/routes/search";
import hierarchyRouter from "./src/routes/hierarchy";
import documentsRouter from "./src/routes/documents";
import slaRouter from "./src/routes/sla";
import { integrationHealthRouter } from "./src/routes/integrationHealth";
import { whatsappInboxRouter } from "./src/routes/whatsappInbox";
import founderRouter from "./src/routes/founder";
import { supabaseAdmin } from "./src/lib/dbAdapter";

const __filename_resolved = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname_resolved = typeof import.meta !== "undefined" && import.meta.url ? path.dirname(__filename_resolved) : (typeof __dirname !== "undefined" ? __dirname : process.cwd());

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5173;

  // Rate Limiting Guards
  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit to 100 AI requests per hour
    message: { error: "Too many AI requests from this IP. Please try again later." }
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 50,
    message: { error: "Too many administrative attempts." }
  });

  // F-15 FIX: Attach structured logger and correlation IDs
  app.use(requestLogger);

  // Global Middlewares & Security Headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        // F-17 FIX: Allow Google Fonts stylesheets (used by Outfit/Inter in the app)
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // F-17 FIX: Allow Google Fonts static assets
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // F-17 FIX: Allow self + data URIs for inline SVGs/base64 images + blob URIs
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        // F-17 FIX: Allow Supabase API + Sentry + Razorpay + Cloudflare R2 endpoints
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://sentry.io",
          "https://*.sentry.io",
          "https://lumberjack.razorpay.com",
          "https://api.razorpay.com",
          "https://*.r2.cloudflarestorage.com"
        ],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "blob:"],
        objectSrc: ["'self'", "blob:"],
        frameAncestors: ["'none'"],
        // F-17 FIX: Report CSP violations to a log endpoint so we can see breakage
        reportUri: ["/api/csp-report"]
      }
    } : false
  }));

  const allowedOrigins = process.env.APP_URL 
    ? [process.env.APP_URL, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://127.0.0.1:3000'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://127.0.0.1:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }));
  // Retain the raw request bytes — webhook HMAC verification must hash exactly
  // what the provider signed, which JSON.stringify(req.body) does not reproduce.
  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  // F-04 FIX: Fail-fast on missing cookie secret in production
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET env var is required in production');
  }
  app.use(cookieParser(cookieSecret || 'dev-only-cookie-secret'));

  // Mount API & webhook routes (webhooks must be mounted before CSRF to exclude them)
  app.use('/v1', leadsRouter); // Covers /v1/webhooks/* and /v1/routing/*
  app.use('/v1', paymentsRouter); // Covers /v1/webhooks/razorpay
  app.use('/v1/documents', documentsRouter); // Covers /v1/documents/*

  const {
    generateCsrfToken: generateToken,
    doubleCsrfProtection
  } = doubleCsrf({
    // F-03 FIX: Fail-fast on missing CSRF secret in production
    getSecret: () => {
      const secret = process.env.CSRF_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('CSRF_SECRET env var is required in production');
      }
      return secret || 'dev-only-csrf-secret';
    },
    getSessionIdentifier: (req: any) => req.headers.authorization || "",
    cookieName: "x-csrf-token",
    cookieOptions: {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    size: 64,
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    getCsrfTokenFromRequest: (req: any) => {
      return req.headers["x-csrf-token"] || req.body?._csrf;
    },
  });

  // Apply CSRF protection to API routes only (exempting static SPA pages)
  app.use('/api', (req, res, next) => {
    if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
      return next();
    }
    doubleCsrfProtection(req, res, next);
  });

  // CSRF token provider endpoint
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: generateToken(req, res) });
  });

  // Limit sensitive route handlers
  app.use('/api/ai', aiLimiter);
  app.use('/api/admin', adminLimiter);

  app.use('/api/ai', aiRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', authRouter); // Covers /api/trial/* and /api/auth/*
  app.use('/api/calls', callsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/hierarchy', hierarchyRouter);
  app.use('/api/sla', slaRouter);
  app.use('/api/integration-health', integrationHealthRouter);
  app.use('/api/whatsapp', whatsappInboxRouter);
  // Cross-tenant reads for the Founder Hub. The router guards itself with the
  // INTERNAL_TEAM_EMAILS allow-list — server.ts mounts no global auth.
  app.use('/api/founder', founderRouter);

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    let dbStatus = "connected";
    try {
      const { error } = await supabaseAdmin.from("users").select("id").limit(1);
      if (error) throw error;
    } catch (dbErr) {
      logger.error("[Health Check Error] Database check failed", dbErr);
      dbStatus = "disconnected";
    }

    const overallStatus = dbStatus === "connected" ? "healthy" : "degraded";

    res.status(overallStatus === "healthy" ? 200 : 500).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        gemini: process.env.GEMINI_API_KEY ? "online" : "offline_simulation",
        database: dbStatus
      }
    });
  });

  // F-17 FIX: CSP violation report endpoint — browsers POST here when a directive is violated
  // Logs violations so we can identify missing CSP directives without breaking users silently.
  app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    const report = req.body?.['csp-report'];
    if (report) {
      logger.warn('[CSP Violation]', {
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        documentUri: report['document-uri'],
      });
    }
    res.status(204).end();
  });

  // Start background lead ingestion polling loops
  startLeadsBackgroundCrons();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/v1')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    /**
     * Routes the SPA actually declares (see the <Route> list in src/App.tsx).
     *
     * Used only to decide the HTTP status. Anything not listed gets a 404
     * status while still receiving the SPA shell, so React renders the proper
     * 404 page. Previously every unknown URL returned 200 with the shell — a
     * soft 404, which tells search engines a mistyped URL is a real page.
     *
     * Keep in sync when adding a route. Getting this wrong only affects the
     * status code, never whether the page renders.
     */
    const KNOWN_EXACT_ROUTES = new Set([
      '/', '/platform', '/product', '/mobile-app', '/solutions', '/security',
      '/pricing', '/company', '/contact', '/integrations', '/docs', '/faq',
      '/resources', '/legal/privacy', '/legal/terms', '/legal/refund',
      '/privacy', '/terms', '/refund',
      '/login', '/signup', '/onboarding', '/join', '/founder-hub',
      '/account/paused', '/account/expired', '/preview/loader',
    ]);
    const KNOWN_ROUTE_PREFIXES = ['/docs/', '/dashboard'];

    const isKnownRoute = (p: string) => {
      const normalised = p.replace(/\/+$/, '') || '/';
      return (
        KNOWN_EXACT_ROUTES.has(normalised) ||
        KNOWN_ROUTE_PREFIXES.some((prefix) => normalised.startsWith(prefix))
      );
    };

    // Vite fingerprints everything under /assets (index-D9r9h5eG.js), so those
    // files can never change behind a given URL and are safe to cache forever.
    // They were being served with express.static's default of no cache headers,
    // which made every repeat visitor re-download the whole bundle.
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      immutable: true,
      maxAge: '1y',
      // A missing hashed asset should 404, not fall through to the SPA handler
      // and return index.html with a 200 — that turns a deploy mismatch into a
      // confusing MIME error in the browser instead of a clear miss.
      fallthrough: false,
    }));

    // Everything else in dist (favicon.svg, robots.txt, sitemap.xml, og-image,
    // screenshots) keeps a stable name, so it gets a short cache with
    // revalidation rather than an immutable one.
    app.use(express.static(distPath, {
      maxAge: '1h',
      // Prerendering writes dist/<route>/index.html, so every marketing route is
      // also a directory on disk. With the default redirect:true, a request for
      // /platform 301s to /platform/ and the prerendered page is never served by
      // the handler below. Turning it off makes static skip directories and lets
      // that handler return the file directly, with no redirect hop.
      redirect: false,
      setHeaders: (res, filePath) => {
        // index.html must never be cached: it carries the references to the
        // current hashed bundles, so a stale copy points at deleted files.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));

    // Serve the prerendered HTML for public marketing routes when it exists,
    // otherwise fall back to the SPA shell. scripts/prerender.mjs writes
    // dist/<route>/index.html at build time so crawlers (and social/AI bots,
    // which do not run JavaScript) receive real content and per-page meta tags
    // instead of an empty <div id="root">. Matched explicitly rather than by
    // letting express.static handle the directory, so /platform is served
    // directly instead of 301-redirecting to /platform/.
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');

      const requested = req.path.replace(/\/+$/, '');
      if (requested) {
        const prerendered = path.join(distPath, requested, 'index.html');
        // Confine to distPath: req.path is attacker-controlled, and a crafted
        // traversal must not be able to read files outside the build output.
        if (prerendered.startsWith(distPath) && fs.existsSync(prerendered)) {
          return res.sendFile(prerendered);
        }
      }

      // Unknown path: still hand back the SPA shell so React renders the 404
      // page, but say 404 rather than 200. A 200 here is a soft 404 — it tells
      // crawlers a mistyped URL is a real page, and they will index it.
      if (!isKnownRoute(req.path)) {
        return res.status(404).sendFile(path.join(distPath, 'index.html'));
      }

      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[Express Error] ${req.method} ${req.path}:`, {
      message: err.message || String(err),
      code: err.code,
      stack: err.stack,
    });

    if (res.headersSent) {
      return next(err);
    }

    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({
        error: 'Invalid or missing CSRF token',
        message: 'Please refresh the page and try again.',
      });
    }

    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
      correlationId: (req as any).correlationId,
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    
    // Start automated background crons for trial expiration (hourly)
    setInterval(() => {
      runTrialExpirationJob().catch(err => logger.error('[Cron] Hourly trial expiration error:', err));
    }, 60 * 60 * 1000);
    
    setTimeout(() => {
      runTrialExpirationJob().catch(err => logger.error('[Cron] Initial trial expiration error:', err));
    }, 5000);
  });

  // Graceful Shutdown handling (SIGTERM/SIGINT)
  const shutdown = () => {
    logger.info("Shutdown signal received. Closing HTTP server gracefully...");
    server.close(() => {
      logger.info("HTTP server closed. Exiting process.");
      process.exit(0);
    });
    
    // Force close after 10 seconds if graceful close fails
    setTimeout(() => {
      logger.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer();
