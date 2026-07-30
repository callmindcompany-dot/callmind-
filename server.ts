import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
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
import adminRouter from "./src/routes/admin";
import authRouter from "./src/routes/auth";
import leadsRouter, { startLeadsBackgroundCrons } from "./src/routes/leads";
import callsRouter from "./src/routes/calls";
import paymentsRouter from "./src/routes/payments";
import { supabaseAdmin } from "./src/lib/dbAdapter";

const __filename_resolved = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname_resolved = typeof import.meta !== "undefined" && import.meta.url ? path.dirname(__filename_resolved) : (typeof __dirname !== "undefined" ? __dirname : process.cwd());

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        // F-17 FIX: Allow Google Fonts stylesheets (used by Outfit/Inter in the app)
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // F-17 FIX: Allow Google Fonts static assets
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // F-17 FIX: Allow self + data URIs for inline SVGs/base64 images
        imgSrc: ["'self'", "data:", "https:"],
        // F-17 FIX: Allow Supabase API + Sentry + Razorpay endpoints
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://sentry.io",
          "https://*.sentry.io",
          "https://lumberjack.razorpay.com",
          "https://api.razorpay.com"
        ],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        frameAncestors: ["'none'"],
        // F-17 FIX: Report CSP violations to a log endpoint so we can see breakage
        reportUri: ["/api/csp-report"]
      }
    }
  }));

  app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }));
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

  // Apply CSRF protection globally to subsequent routes
  app.use(doubleCsrfProtection);

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
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

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
      setHeaders: (res, filePath) => {
        // index.html must never be cached: it carries the references to the
        // current hashed bundles, so a stale copy points at deleted files.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
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
