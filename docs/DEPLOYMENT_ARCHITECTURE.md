# CALLMIND CRM — DEPLOYMENT ARCHITECTURE (`DEPLOYMENT_ARCHITECTURE.md`)

**Author:** Principal DevOps & Infrastructure Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Vercel (Web) + Railway/AWS (Server) + Supabase Cloud (DB) + Google Play (Mobile)

---

## ━━ 1. PRODUCTION DEPLOYMENT TOPOLOGY ━━

```
 [Client Browsers / PC App] ──► [Vercel Global CDN (Vite React 19 SPA + PWA Service Worker)]
                                      │
                                      ▼
 [Express REST API] ──────────► [Railway / AWS EC2 Container Server (`server.ts`)]
                                      │
                                      ▼
 [Database Layer] ────────────► [Supabase PostgreSQL + PgBouncer Pooler]
                                      │
                                      ▼
 [Mobile Devices] ────────────► [Google Play Store Android APK (Expo SDK 52)]
```

---

## ━━ 2. CI/CD DEPLOYMENT PIPELINE ━━

1. **Code Commit:** Push to `main` branch triggers GitHub Actions runner.
2. **Automated Verification:** Runs `npm run lint`, `npm run test`, and `npm run build`.
3. **Database Migration:** Executes Supabase SQL migrations automatically.
4. **Edge Functions Deployment:** Deploys Deno Edge Functions via Supabase CLI.
5. **Web & PWA Build & CD:** Vercel builds static asset bundle, generates `sw.js` and `manifest.webmanifest` via `vite-plugin-pwa`, and deploys to production edge.
6. **Mobile Release:** EAS Build generates production Android AAB/APK for Google Play Console.

---

**CTO Approval:** Deployment Architecture approved for production release.
