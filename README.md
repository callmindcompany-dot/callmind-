# CallMind CRM — India's Best Telecalling Platform

> AI-powered telecalling CRM with lead management, team monitoring, communication automation, and real-time analytics — built for India's fastest-growing sales teams.

---

## Overview

CallMind CRM is a full-stack admin web application for managing telecalling teams at scale. It combines lead lifecycle management, AI-powered communication (Gemini), real-time agent monitoring, and multi-channel integrations into a single unified platform.

**Key capabilities:**
- 📲 **PWA & Desktop Installation** — Progressive Web App with standalone installation on Windows/macOS/Android, offline asset caching, and auto-updating Service Worker
- 🏢 **Enterprise Branch Hierarchy** — Multi-branch data isolation, region/state/department topology, city auto-matching, and top scope filter bar (100% optional, Default = OFF)
- 📞 **Lead Management** — Import, assign, deduplicate, and track leads through a customizable pipeline
- 🤖 **AI Insights** — Gemini-powered call analysis, FAQ generation, and smart lead mapping
- 📊 **Real-Time Reports** — Agent performance, call heatmaps, conversion funnels, and scheduled exports
- 💬 **Multi-Channel Comms** — WhatsApp, Email, SMS, and scheduled message sequences
- 👥 **Team Operations** — Round-robin assignment, attendance tracking, targets, and live agent monitoring
- 🔌 **Integrations** — IndiaMart, JustDial, TradeIndia, Facebook Leads, Google Ads, and Webhooks
- 📄 **Document Storage & Workflow** — Cloudflare R2 (zero-egress cost) integration with presigned URLs, Admin Review Queue, 90° image rotation, DPDP access logging, and single PDF bundle generation
- 💰 **Billing & Plans** — Subscription management, Razorpay UPI priority checkout, invoice tracking, DB trigger plan limit enforcement, and upgrade flows
- 🛡️ **Security** — CSRF protection, rate limiting, Helmet CSP headers, role-based access, and audit logs

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, Tailwind CSS 4, Framer Motion |
| **Progressive Web App** | `vite-plugin-pwa`, Workbox Service Worker, Standalone Web App Manifest |
| **State Management** | TanStack Query v5, React Context |
| **Forms & Validation** | React Hook Form, Zod v4 |
| **Backend** | Express.js (Node 20), Helmet, CORS, CSRF |
| **Database** | Supabase (PostgreSQL + Auth + Row-Level Security) |
| **Edge Functions** | Supabase Edge Functions (Deno runtime) |
| **AI** | Google Gemini (`@google/genai`) |
| **Charts** | Recharts 3 |
| **Testing** | Vitest 4, React Testing Library, jsdom |
| **Build Tool** | Vite 6, esbuild |
| **Monitoring** | Sentry (`@sentry/react`) |
| **Containerization** | Docker, Docker Compose |

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 20
- **npm** ≥ 10
- A **Supabase** project ([supabase.com](https://supabase.com))
- A **Google Gemini** API key ([aistudio.google.com](https://aistudio.google.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/callmind-crm.git
cd callmind-crm

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template and add your keys
cp .env.example .env

# Start development server
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `APP_URL` | Production app URL (for OAuth callbacks) |
| `MASTER_FOUNDER_EMAIL` | Super-admin email for founder privileges |
| `INTERNAL_TEAM_EMAILS` | Comma-separated internal team emails |
| `CSRF_SECRET` | Secret for CSRF token generation |
| `SENTRY_DSN` | Sentry DSN for error monitoring |

### Database Setup

Run the schema in your Supabase SQL Editor:

```bash
# The full schema is in schema.sql
# It creates tables: users, leads, companies, calls, leads_activity,
# call_dispositions, invoices, announcements, feature_roadmap, and more.
```

---

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload (port 3000) |
| `npm run build` | Build frontend (Vite) + backend (esbuild) for production |
| `npm start` | Run production server from `dist/` |
| `npm run test` | Run all tests with Vitest |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` build output |
| `npm run preview` | Preview production build locally |

---

## Project Structure

```
callmind/
├── src/
│   ├── components/          # 68+ page & UI components
│   │   ├── Dashboard.tsx            # Main KPI dashboard
│   │   ├── LeadsPage.tsx            # Lead management (123KB)
│   │   ├── CallsPage.tsx            # Call logs & disposition
│   │   ├── CommunicationPage.tsx    # Multi-channel messaging
│   │   ├── TeamPage.tsx             # Team & agent management
│   │   ├── ReportsPage.tsx          # Analytics & reports
│   │   ├── SettingsPage.tsx         # Company & user settings
│   │   ├── BillingPage.tsx          # Plans & invoices
│   │   ├── IntegrationsPage.tsx     # Third-party integrations
│   │   ├── AutomationPage.tsx       # Workflow automation rules
│   │   ├── AIInsightsHub.tsx        # AI analytics & insights
│   │   ├── FounderHub.tsx           # Founder admin panel
│   │   ├── FoundersLab.tsx          # Internal experiments
│   │   ├── integrations/            # Integration config panels
│   │   └── __tests__/               # Component tests
│   ├── hooks/               # 76 custom React Query hooks
│   │   ├── useLeads.ts              # Lead CRUD & pagination
│   │   ├── useBilling.ts            # Subscription & invoices
│   │   ├── useTeam.ts               # Team member management
│   │   ├── useCalls.ts              # Call data queries
│   │   ├── useAnnouncements.ts      # Announcements CRUD
│   │   └── __tests__/               # Hook tests
│   ├── services/            # Business logic services
│   │   ├── leads.service.ts         # Lead data access layer
│   │   ├── audit.service.ts         # Audit log tracking
│   │   ├── deduplication.service.ts # Lead dedup engine
│   │   └── schedulerService.ts      # Message scheduling
│   ├── routes/              # Express API routes
│   │   ├── ai.ts                    # Gemini AI endpoints
│   │   ├── admin.ts                 # Admin operations
│   │   ├── auth.ts                  # Authentication routes
│   │   ├── leads.ts                 # Lead API + background crons
│   │   └── calls.ts                 # Call API routes
│   ├── types/               # 14 TypeScript interface files
│   ├── utils/               # Utility functions
│   ├── lib/                 # Shared libraries (sanitize, db)
│   ├── features/            # Feature-specific modules
│   ├── website/             # Public-facing landing pages
│   ├── config/              # App configuration
│   ├── AuthContext.tsx       # Auth state & session management
│   ├── CompanyContext.tsx    # Multi-tenant company context
│   ├── ProtectedRoute.tsx   # Auth/role/trial route guards
│   ├── App.tsx              # Root routes & app shell
│   └── main.tsx             # React entry point
├── supabase/
│   └── functions/           # 24 Deno Edge Functions
│       ├── indiamart-poll/          # IndiaMart lead sync
│       ├── justdial-poll/           # JustDial lead sync
│       ├── tradeindia-poll/         # TradeIndia lead sync
│       ├── facebook-poll/           # Facebook Leads sync
│       ├── send-whatsapp-message/   # WhatsApp messaging
│       ├── send-email/              # Email dispatch
│       ├── send-scheduled-messages/ # Scheduled message worker
│       ├── webhook-receiver/        # Inbound webhook handler
│       ├── log-call/                # Call logging
│       ├── execute-automation-rules/# Automation engine
│       ├── data-cleanup-cron/       # Data hygiene cron
│       └── ...                      # 12 more functions
├── server.ts                # Express production server
├── schema.sql               # Full PostgreSQL schema
├── vitest.config.ts         # Test configuration
├── vite.config.ts           # Vite build configuration
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose orchestration
└── package.json             # Dependencies & scripts
```

---

## Core Modules

### 🏠 Dashboard
Real-time KPI widgets: total leads, calls today, conversion rates, team performance. Glassmorphic cards with smooth Framer Motion transitions.

### 📋 Lead Management
Full-lifecycle lead tracking with 8 status stages (New → Converted). Features CSV/Excel import with AI-powered field mapping, duplicate detection, round-robin assignment, and infinite-scroll pagination via virtualized lists.

### 📞 Call Tracking
Click-to-call integration, call disposition workflows, hourly heatmap analytics, and automatic callback scheduling.

### 💬 Communication Hub
Multi-channel messaging: WhatsApp (Business API), Email (SMTP), and SMS. Includes template management, message sequences, and scheduled dispatch via edge functions.

### 📊 Reports & Analytics
Pre-built reports: Agent performance, lead source yield, conversion funnels, WhatsApp delivery rates, and hourly call volumes. Exportable as PDF/Excel with scheduled email delivery.

### 🤖 AI Insights (Gemini)
AI-powered features: smart lead scoring, call summary analysis, FAQ generation, training data configuration, and automated setup assistance.

### 👥 Team Management
Agent profiles, attendance tracking, daily/weekly/monthly targets, team announcements, and real-time live agent monitoring with drill-down analytics.

### ⚙️ Automation
No-code workflow rules engine: trigger automations on lead status changes, auto-assign leads, send notifications, and execute custom sequences.

### 🔌 Integrations
Native connectors for IndiaMart, JustDial, TradeIndia, Facebook Lead Ads, Google Ads, and custom webhooks. Each integration has a dedicated configuration panel and health monitoring.

### 💰 Billing
Plan management, seat-based pricing, invoice history, and upgrade intent workflows with founder review.

### 🛤️ Roadmap
Public feature roadmap with phase tracking (Phase 2/Phase 3), progress bars, community upvoting, and admin CRUD.

---

## Security

- **Authentication**: Supabase Auth with session management and role-based access
- **Route Protection**: Multi-layer guards (auth → onboarding → founder → subscription)
- **CSRF**: Double-submit cookie pattern via `csrf-csrf`
- **Rate Limiting**: Per-route rate limits (100 AI requests/hour)
- **Headers**: Helmet.js security headers
- **Input Sanitization**: HTML sanitization on all user inputs
- **Audit Logging**: Full audit trail for admin operations
- **Error Monitoring**: Sentry integration for production error tracking

---

## Testing

```bash
# Run all tests
npm run test

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test configuration:**
- Environment: `jsdom`
- Coverage target: 50% (lines, functions, branches, statements)
- Coverage provider: V8

**Current test coverage:**
- `useLeads` — Pagination, loading, error states
- `useAuth` — Authentication, session, sign-out
- `useBilling` — Subscriptions, invoices, upgrade mutations
- `ProtectedRoute` — Auth redirects, role-based access
- `sanitizeHTML` — XSS prevention, edge cases

---

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t callmind-crm .
docker run -p 3000:3000 --env-file .env callmind-crm
```

The Dockerfile uses a multi-stage build (Node 20 Alpine) to produce a lean production image.

---

## Edge Functions

Supabase Edge Functions (Deno) handle background jobs and third-party integrations:

| Function | Purpose |
|---|---|
| `indiamart-poll` | Sync leads from IndiaMart API — scheduled only after `schedule_integration_polls()` is run |
| `justdial-poll` | Sync leads from JustDial — same |
| `tradeindia-poll` | Sync leads from TradeIndia — same |
| `facebook-poll` | Sync Facebook Lead Ads — same |
| `send-whatsapp-message` | **Not implemented.** Answers 501; never called Meta |
| `receive-whatsapp-webhook` | **Not implemented.** Answers 501, including the setup handshake |
| `send-email` | Custom-domain SMTP is disabled on every plan; returns `success: false` |
| `send-scheduled-messages` | Cron-based scheduled message worker |
| `execute-automation-rules` | Automation rule execution engine |
| `data-cleanup-cron` | Periodic data hygiene jobs |
| `log-call` | Server-side call event logging |
| `webhook-receiver` | Generic inbound webhook handler |
| `submit-join-request` | Team join request processing |
| `validate-join` | Join request validation |
| `test-smtp` / `test-whatsapp` / `test-voip` | Integration health checks |
| `export-user-data` | GDPR-compliant data export |
| `purge-user-data` | GDPR-compliant data deletion |
| `legal-actions` | Legal compliance operations |
| `accept-terms` | Terms of service acceptance |
| `impersonate-company` | Admin company impersonation |
| `scheduled-worker` | General scheduled task runner |

---

## Contributing

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure `npm run lint` passes (zero TypeScript errors)
4. Ensure `npm run test` passes (all tests green)
5. Submit a pull request with clear description

---

## License

Proprietary — CallMind CRM. All rights reserved.

---

<p align="center">
  Built with ❤️ for India's telecalling teams<br/>
  <strong>CallMind CRM</strong> — <a href="https://callmind.app">callmind.app</a>
</p>
