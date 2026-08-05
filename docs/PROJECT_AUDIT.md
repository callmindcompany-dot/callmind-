# CALLMIND CRM - COMPREHENSIVE PROJECT AUDIT REPORT

**Auditor Role:** Principal Software Architect & Product Auditor  
**Date:** July 31, 2026  
**Target Codebase:** CallMind Monorepo (Web CRM + Mobile App + Express Server + Supabase DB)  
**Rule Compliance:** 0 Code Mutations Made. Full Codebase Inspection & Empirical Evidence Provided.

---

## ━━ 1. FOLDER STRUCTURE ━━

The repository follows a hybrid monorepo design organizing Web Frontend, Mobile App, Express API Server, and Supabase Backend:

```
callmind/
├── .agents/                    # Custom agent skills & guidelines
├── .claude/                    # Team guidelines & context
├── docs/                       # Comprehensive documentation suite (16 MD files)
├── reports/                    # Comprehensive audit and project reports
├── mobile/                     # React Native Expo Mobile App
│   ├── assets/                 # App icons, splash screens
│   ├── src/
│   │   ├── components/         # Mobile UI components
│   │   ├── screens/            # 53 Mobile Screen components
│   │   └── services/           # Mobile API & sync services
│   ├── App.tsx                 # Mobile Navigation & Root Provider
│   └── package.json            # Expo & React Native dependencies
├── public/                     # Static Web Assets (Favicons, OG Images)
├── scripts/                    # Database setup & maintenance scripts
├── src/                        # React 19 + Vite Web Application
│   ├── __tests__/              # Unit & Integration test suites
│   ├── assets/                 # SVGs, Fonts, Images
│   ├── components/             # 73 Web UI components & subfolders (founder, leads, integrations)
│   ├── config/                 # Pricing & feature configurations
│   ├── features/               # Domain-specific feature modules
│   ├── hooks/                  # 80 React custom hooks
│   ├── lib/                    # Core libraries (aiGuardrail, aiRouter, dbAdapter, logger, sanitize)
│   ├── routes/                 # Express backend API routers
│   ├── services/               # Core business services (leads, deduplication, audit, scheduler)
│   ├── types/                  # TypeScript interfaces & database definitions
│   ├── utils/                  # Utility functions (aiMapper, fieldPatterns, sanitize, timestamp)
│   ├── website/                # Public SEO Marketing Site
│   ├── App.tsx                 # Web Router & App Shell
│   ├── AuthContext.tsx         # Supabase Authentication State Provider
│   ├── CompanyContext.tsx      # Multi-tenant Company Context Provider
│   └── main.tsx                # Client Entry Point
├── supabase/                   # Supabase Deno Edge Functions
│   └── functions/              # Edge functions (indiamart-poll, send-whatsapp-message, etc.)
├── full_master_supabase_setup.sql # Production Master Supabase DB Script
├── schema.sql                  # Database Schema Definitions
├── server.ts                   # Express.js REST Server Entry Point
├── vite.config.ts              # Vite & SSR Build Configuration
└── package.json                # Web & Server Node.js dependencies
```

---

## ━━ 2. COMPONENT INVENTORY ━━

### Web Application Components (`src/components/`) - Total: 73+
- **Core Dashboard & Shell:** `DashboardLayout.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, `FounderDashboard.tsx`, `FounderHub.tsx`, `SubscriptionStatusHeader.tsx`, `TrialBanner.tsx`, `TrialLockOverlay.tsx`.
- **CRM & Leads:** `LeadsPage.tsx`, `PipelineBoard.tsx`, `SmartImportModal.tsx`, `DuplicateResolutionModal.tsx`, `DynamicFieldRenderer.tsx`, `CustomFieldManager.tsx`, `AgentDrillDownSlider.tsx`.
- **Communication & Calls:** `CallsPage.tsx`, `CommunicationPage.tsx`, `ChatInbox.tsx`, `SequencesPage.tsx`, `SchedulerPage.tsx`.
- **Analytics & AI:** `ReportsPage.tsx`, `AnalyticsPage.tsx`, `AIInsightsHub.tsx`, `AISetupBot.tsx`, `AITrainingPage.tsx`, `DynamicCharts.tsx`, `HeatmapChart.tsx`, `ExportReportModal.tsx`, `ScheduleReportModal.tsx`.
- **Team & Attendance:** `TeamPage.tsx`, `AttendanceSection.tsx`, `AgentLiveMonitor.tsx`, `TeamAnnouncementsSection.tsx`, `TeamJoinToolsSection.tsx`, `TeamTargetsSection.tsx`, `SubAdminInviteModal.tsx`, `SubAdminManagementTab.tsx`, `TelecallerInviteModal.tsx`, `CoFounderManagement.tsx`.
- **Integrations & Automation:** `IntegrationsPage.tsx`, `AutomationPage.tsx`, `GeminiKeysManager.tsx`.
- **Billing & Account:** `BillingPage.tsx`, `UpgradeModal.tsx`, `TrialUpgradeModal.tsx`, `AccountExpiredPage.tsx`, `AccountPausedPage.tsx`, `OrganizationTenants.tsx`.
- **System & Audits:** `AuditLogPage.tsx`, `PlatformAuditLog.tsx`, `AnnouncementsPage.tsx`, `CleanupWidget.tsx`, `ErrorBoundary.tsx`, `CallMindLoader.tsx`, `CallMindPulseLoader.tsx`, `SkeletonLoader.tsx`, `ConfirmModal.tsx`, `ActionProgressBar.tsx`, `FeatureGate.tsx`, `HelpCenterPage.tsx`, `SupportPage.tsx`, `VideoTutorialsPage.tsx`, `RoadmapPage.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`, `RefundPage.tsx`, `FoundersLab.tsx`.

### Mobile Application Screens (`mobile/src/screens/`) - Total: 53 Screens
- `01_SplashScreen.tsx`, `02_OnboardingSlides.tsx`, `03_ProfileSetup.tsx`, `04_OTPVerify.tsx`, `05_JoinCompany.tsx`, `06_ApprovalPending.tsx`, `07_UserInfoCollection.tsx`, `08_ProfileEditScreen.tsx`, `10_LanguageSelectionScreen.tsx`, `11_AppPermissionsScreen.tsx`, `17_CompanyJoinedSuccess.tsx`, `25_DeviceManagementScreen.tsx`, `26_ActivityTimelineScreen.tsx`, `27_TrainingLearningScreen.tsx`, `28_RateAppScreen.tsx`, `37_IncomingAssignedCallScreen.tsx`, `38_CallingScreen.tsx`, `39_ActiveCallOverlay.tsx`, `40_DialPadScreen.tsx`, `42_CallCompletedCard.tsx`, `54_CallLogScreen.tsx`, `59_InboxScreen.tsx`, `61_AnnouncementDetailScreen.tsx`, `62_NotificationCenterScreen.tsx`, `64_AICallSummaryCard.tsx`, `65_AILeadInsightScreen.tsx`, `67_AITalkScriptScreen.tsx`, `68_VoiceNotesModal.tsx`, `81_ThemeToggleScreen.tsx`, `83_AboutAppScreen.tsx`, `84_PrivacyTermsWebView.tsx`, `86_BiometricLockScreen.tsx`, `90_DeviceVerificationModal.tsx`, `91_OfflineSyncBanner.tsx`, `128_LeadFilterSheet.tsx`, `131_ScheduleCallbackSheet.tsx`, `137_ConfirmDialogs.tsx`, `HomeScreen.tsx`, `LeadListScreen.tsx`, `LeadDetailScreen.tsx`, `PostCallFeedbackSheet.tsx`, `AttendanceScreen.tsx`, `CallbacksScreen.tsx`, `LeaderboardScreen.tsx`, `PerformanceScreen.tsx`, `QualityAnalyticsScreen.tsx`, `SettingsScreen.tsx`, `HelpCenterScreen.tsx`, `DocumentsScreen.tsx`, `LeadImportScreen.tsx`, `TargetScreen.tsx`, `SubscriptionLockScreen.tsx`, `AnnouncementDetailScreen.tsx`.

---

## ━━ 3. PAGES (CLIENT ROUTES) ━━

### Web Application Routes (`src/App.tsx`)
- Public Marketing: `/`, `/pricing`, `/features`, `/about`, `/contact`, `/mobile-app`
- Auth & Onboarding: `/login`, `/join`, `/onboarding`
- Authenticated CRM Core: `/dashboard`, `/leads`, `/calls`, `/team`, `/automation`, `/reports`, `/billing`, `/integrations`, `/settings`, `/announcements`, `/audit-logs`, `/ai-insights`, `/founders-lab`, `/help`, `/support`
- Status Pages: `/account-expired`, `/account-paused`

---

## ━━ 4. APIS & SERVER ENDPOINTS ━━

### Express REST Server (`server.ts` & `src/routes/`)
- **Authentication & Trial (`src/routes/auth.ts`):**
  - `GET /api/trial/status` (Check trial validity & seat usage)
  - `POST /api/trial/start` (Initialize 7-day free trial)
  - `GET /api/auth/impersonate-login` (Super admin tenant impersonation)
- **Leads & Webhooks (`src/routes/leads.ts`):**
  - `POST /v1/webhooks/incoming/:companyId` (Universal lead intake webhook)
  - `POST /v1/routing/auto-assign` (Round-Robin lead assignment dispatcher)
- **AI Router (`src/routes/ai.ts`):**
  - `POST /api/ai/generate` (Gemini API text generation & summarization)
- **Payments (`src/routes/payments.ts`):**
  - `POST /api/payments/create-order` (Razorpay order creation)
  - `POST /api/payments/verify` (HMAC SHA256 signature verification)
  - `POST /v1/webhooks/razorpay` (Asynchronous Razorpay payment captured webhook)
- **Admin & Systems (`src/routes/admin.ts`, `src/routes/calls.ts`):**
  - `GET /api/admin/metrics` (System performance diagnostics)

### Supabase Deno Edge Functions (`supabase/functions/`)
- `indiamart-poll` (Cron every 10m: Fetches IndiaMART leads)
- `justdial-poll` (Cron every 10m: Fetches JustDial leads)
- `tradeindia-poll` (Cron every 10m: Fetches TradeIndia leads)
- `send-whatsapp-message` (Dispatches Meta WhatsApp Business API messages)
- `send-email` (Dispatches SMTP emails)
- `execute-automation-rules` (Evaluates trigger-condition-action workflow rules)
- `purge-user-data` (DPDP Act right-to-be-forgotten hard deletion)

---

## ━━ 5. DATABASE TABLES ━━

Exhaustive table list from `full_master_supabase_setup.sql` & `schema.sql`:

1. `companies` (Master tenant table)
2. `users` / `profiles` (1:1 with Supabase Auth)
3. `leads` (Prospects & CRM deals)
4. `call_logs` (SIM Call history)
5. `lead_activity` (Audit timeline per lead)
6. `agent_status` (Real-time online/offline & GPS attendance)
7. `sim_cards` (Dual SIM device mappings)
8. `integrations` (API keys for IndiaMART, Meta, etc.)
9. `automation_rules` (No-code triggers & conditions)
10. `scheduled_messages` (Drip campaign queue)
11. `invoices` (GST tax invoices)
12. `billing_intents` (Razorpay payment replay guard)
13. `founder_configs` (Company routing settings)
14. `team_settings` (Pod & manager configurations)
15. `audit_logs` (Security & admin audit trail)
16. `system_errors` (Server error log storage)
17. `report_templates` (Saved custom report definitions)
18. `custom_field_definitions` (Dynamic CRM fields)
19. `ai_usage_logs` (Gemini API token cost tracking)

---

## ━━ 6. HOOKS ━━

80 React Custom Hooks in `src/hooks/` for state & data querying:
- `useLeadsQuery.ts`, `useLeadsPaginated.ts`, `useLeadMutations.ts`, `useLeadActivity.ts`, `useDeduplication.ts`
- `useDashboardStats.ts`, `useDashboardSummary.ts`, `useAgentsQuery.ts`, `useTeam.ts`, `useAttendance.ts`, `useAgentMonitor.ts`
- `useCalls.ts`, `useCallDisposition.ts`, `useCallbacks.ts`, `useHourlyCalls.ts`
- `useBilling.ts`, `useTrial.ts`, `useAutomationRules.ts`, `useAutomationLogs.ts`
- `useCustomFields.ts`, `useCompanySettings.ts`, `useIntegrationSettings.ts`, `useIndiaMartConfig.ts`, `useFacebookConfig.ts`
- `useAIConfig.ts`, `useAiKeys.ts`, `useFounderLab.ts`, `useFounderHooks.ts`
- `useAdvancedReports.ts`, `useReportsData.ts`, `useAuditLogs.ts`, `useCleanup.ts`

---

## ━━ 7. CONTEXT PROVIDERS ━━

1. **`AuthContext.tsx` (`src/AuthContext.tsx`):** Manages Supabase Auth session, JWT token decoding, user profile loading, and role checking.
2. **`CompanyContext.tsx` (`src/CompanyContext.tsx`):** Manages current multi-tenant company details, plan limits, and active subscription state.

---

## ━━ 8. SERVICES ━━

Located in `src/services/`:
1. `leads.service.ts`: Core lead creation, status updates, and batch processing.
2. `deduplication.service.ts`: E.164 phone matching and duplicate lead merging.
3. `audit.service.ts`: Dispatches events to `audit_logs`.
4. `claims.service.ts`: Supabase JWT custom claims parser.
5. `error.service.ts`: Standardized client-side error handling & Sentry logging.
6. `schedulerService.ts`: Local callback reminder queue manager.

---

## ━━ 9. UTILITIES ━━

Located in `src/lib/` and `src/utils/`:
1. `aiGuardrail.ts`: 6-layer prompt injection & SQLi detection pipeline.
2. `aiRouter.ts`: Round-robin Gemini API key rotation system.
3. `aiUsage.ts`: Token counter and cost estimator.
4. `dbAdapter.ts`: Unified database interface for Supabase Admin client.
5. `logger.ts`: Structured JSON logging formatter.
6. `requestLogger.ts`: Express request correlation ID tracker.
7. `sanitize.ts`: Input XSS HTML/Script stripper.
8. `subscriptionLimits.ts`: Plan seat and lead limit checker.
9. `aiMapper.ts`: CSV column header auto-detection algorithm.
10. `fieldPatterns.ts`: Regex patterns for lead field extraction.
11. `leadRotting.ts`: Time-decay calculation for uncontacted leads.
12. `timestamp.ts`: Date formatting utilities.
13. `trialTracking.ts`: Countdown timer calculation for free trials.

---

## ━━ 10. DUPLICATE CODE ━━

- **Sanitization Duplication:** `src/lib/sanitize.ts` and `src/utils/sanitize.ts` both implement string sanitization routines independently.
- **Leads Fetching Duplication:** `src/hooks/useLeads.ts`, `src/hooks/useLeadsQuery.ts`, and `src/hooks/useLeadsPaginated.ts` contain overlapping query logic for the `leads` table.
- **Timestamp Adapters:** `src/utils/timestamp.ts` defines a custom `MockTimestamp` class alongside standard JS `Date` helpers, creating redundant date wrapper paths.

---

## ━━ 11. DEAD CODE ━━

- **`src/utils/timestamp.ts` (Lines 6-30):** `MockTimestamp` class was originally used for local offline testing and is no longer called in production runtime paths.
- **Unused Component Props:** Several legacy options in `DynamicCharts.tsx` remain defined in interfaces but are unrendered in current layout views.

---

## ━━ 12. MISSING IMPLEMENTATIONS ━━

- **Facebook HMAC Live Verification:** `server.ts` includes webhook routing for Facebook Lead Ads, but live HMAC-SHA256 signature verification requires production Meta App credentials.
- **IndiaMART Vendor Key Integration:** `indiamart-poll` Edge Function operates with dev fallback mock payloads until live production API keys are entered by tenant admins.

---

## ━━ 13. MOCK IMPLEMENTATIONS ━━

1. **`src/components/CleanupWidget.tsx` (Line 49):**
   * Storage usage meter currently uses estimated mock calculations rather than calling the Supabase Storage bucket size API directly.
2. **`src/components/LeadsPage.tsx` (Line 1434):**
   * `seedDummyData` function generates 30 mock Indian leads (`Aarav`, `Vivaan`, etc.) for testing UI filter controls.
3. **`mobile/src/screens/PerformanceScreen.tsx` (Line 107):**
   * Performance overview line graph renders a styled UI placeholder box (`graphMockBox`) pending final chart integration.

---

## ━━ 14. TODO COMMENTS ━━

- **`src/components/CleanupWidget.tsx` (Line 49):**
  `// TODO: Replace with real storage usage from Supabase Storage API or a`

---

## ━━ 15. SECURITY RISKS ━━

1. **Environment Variables Fallback:** `server.ts` defaults `COOKIE_SECRET` to `'dev-only-cookie-secret'` in non-production modes. Production environment variables MUST be strictly enforced on deployment.
2. **Service Role Key Scope:** `src/lib/dbAdapter.ts` instantiates `supabaseAdmin` using `SUPABASE_SERVICE_ROLE_KEY`. This key MUST remain server-side only and never be exposed in Vite client bundles.

---

## ━━ 16. PERFORMANCE RISKS ━━

1. **Unpaginated Data Queries:** `LeadsPage.tsx` falls back to fetching large arrays when pagination options are disabled by custom filters, risking browser memory pressure with 10,000+ leads.
2. **JSONB Custom Data Queries:** `leads.custom_data` fields are queried via `->>` operators. Missing GIN indexes on dynamic JSONB keys could cause full table scans on large databases.

---

## ━━ 17. MOBILE / WEB INCONSISTENCIES ━━

1. **Role Access Control:** Web CRM permits Admin (`founder`, `sub_admin`) logins; Mobile App hard-blocks admin roles to prevent mobile screenshot leaks.
2. **Telecommunication Method:** Mobile App uses native Android SIM dialing (`tel:` intent); Web CRM relies on manual phone interaction or WhatsApp Web links.
3. **Attendance Verification:** Mobile App enforces GPS & selfie clock-in; Web CRM provides monitoring dashboards only.

---

## ━━ 18. FEATURES IMPLEMENTED ━━

- ✅ Multi-tenant PostgreSQL Database with Row-Level Security (RLS)
- ✅ Passwordless Magic Link & Google Authentication
- ✅ Native Android Dual-SIM Calling & Post-Call Feedback Sheet
- ✅ GPS & Selfie Telecaller Clock-In Attendance Verification
- ✅ 6-Layer Gemini AI Prompt Injection & Guardrail Pipeline
- ✅ Double-CSRF & Helmet CSP Web Security Headers
- ✅ Razorpay Payment Integration & `billing_intents` Replay Defense
- ✅ Automated Round-Robin Telecaller Lead Assignment Engine
- ✅ B2B GST Tax Calculation (CGST/SGST vs IGST) & Invoice Generation

---

## ━━ 19. FEATURES PARTIALLY IMPLEMENTED ━━

- ⚠️ **Marketplace Lead Polling:** IndiaMART/JustDial Edge Functions are functional but require production API keys for live feeds.
- ⚠️ **Storage Cleanup Meter:** Storage breakdown widget uses estimated calculations instead of direct bucket size APIs.
- ⚠️ **Mobile Analytics Chart:** `PerformanceScreen.tsx` renders UI structure (`graphMockBox`) awaiting live chart bindings.

---

## ━━ 20. FEATURES NOT IMPLEMENTED (BY DESIGN) ━━

- ❌ **Call Audio Recording:** Intentionally omitted to eliminate wiretapping liabilities, legal consent issues, and massive PII storage costs.
- ❌ **In-Browser VoIP WebRTC Calling:** Replaced by Native SIM dialing to save VoIP trunking costs for Indian businesses.

---

**Audit Summary:** The CallMind CRM project demonstrates exceptional architectural maturity, strict multi-tenant database isolation (RLS), enterprise-grade security headers, and an extensive suite of web and mobile features tailored for Indian telecalling operations.
