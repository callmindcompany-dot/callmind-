/**
 * Single source of truth for what CallMind can actually do.
 *
 * WHY THIS FILE EXISTS
 * Marketing copy had drifted from the product: the site advertised three
 * integrations while ten shipped, invented customer testimonials, and quoted
 * prices that matched neither the pricing config nor the billing flow. At the
 * same time large real features (automation rules, message sequences, offline
 * sync, multi-language, leaderboard) were never mentioned at all.
 *
 * THE RULE
 * Every entry below names the file(s) that implement it in `source`. If you
 * cannot point at working code, it does not belong here. When a feature is
 * removed from the product, remove it here and it disappears from the site.
 *
 * Line counts referenced in review notes were taken from the repo at the time
 * of writing and are only an indication that these are real implementations
 * rather than stubs.
 */

export interface Capability {
  /** Short title, sentence case. */
  title: string;
  /** One or two plain sentences. No superlatives, no invented metrics. */
  description: string;
  /** Grouping used to lay out the platform page. */
  group: CapabilityGroup;
  /** Files that implement this. Reviewers use these to verify the claim. */
  source: string[];
  /** True when this is a differentiator worth calling out for the India market. */
  indiaEdge?: boolean;
}

export type CapabilityGroup =
  | 'leads'
  | 'calling'
  | 'automation'
  | 'communication'
  | 'analytics'
  | 'team'
  | 'ai'
  | 'trust';

export const CAPABILITY_GROUPS: Record<CapabilityGroup, { label: string; blurb: string }> = {
  leads: {
    label: 'Lead Management',
    blurb: 'Capture from every source, de-duplicate, and route to the right telecaller.',
  },
  calling: {
    label: 'Calling',
    blurb: 'Dial from the telecaller’s own SIM and log every outcome automatically.',
  },
  automation: {
    label: 'Automation',
    blurb: 'Rules and sequences that run without anyone remembering to run them.',
  },
  communication: {
    label: 'Communication',
    // Was "WhatsApp and email from one inbox, on your own credentials."
    // Neither channel sends: the WhatsApp functions never reach Meta, and
    // send-email reports custom-domain sending disabled.
    blurb: 'Every conversation with a lead in one place, whoever handled it.',
  },
  analytics: {
    label: 'Reports & Analytics',
    blurb: 'See what happened today, and get it emailed to you tomorrow.',
  },
  team: {
    label: 'Team Operations',
    blurb: 'Targets, attendance and visibility across the whole calling floor.',
  },
  ai: {
    label: 'AI Assistance',
    blurb: 'Gemini-powered help with scripts, summaries and messy spreadsheets.',
  },
  trust: {
    label: 'Security & Compliance',
    blurb: 'Built for Indian data-protection expectations from the start.',
  },
};

export const CAPABILITIES: Capability[] = [
  // ── Leads ──────────────────────────────────────────────────────────────────
  {
    title: 'Multi-source lead capture',
    description:
      'Leads arrive automatically from IndiaMART, JustDial, TradeIndia, Meta Lead Ads, website forms and any custom webhook.',
    group: 'leads',
    source: [
      'supabase/functions/indiamart-poll',
      'supabase/functions/justdial-poll',
      'supabase/functions/tradeindia-poll',
      'supabase/functions/facebook-poll',
      'supabase/functions/webhook-receiver',
    ],
    indiaEdge: true,
  },
  {
    title: 'Duplicate detection',
    description:
      'Incoming leads are checked against your existing database so two telecallers never call the same person.',
    group: 'leads',
    source: ['src/services/deduplication.service.ts', 'src/components/DuplicateResolutionModal.tsx'],
  },
  {
    title: 'Round-robin assignment',
    description:
      'New leads are distributed across telecallers who are actually online, with manual override when you need it.',
    group: 'leads',
    source: ['src/components/leads/LeadDistributionPanel.tsx', 'src/hooks/useRoutingConfig.ts'],
  },
  {
    title: 'Kanban pipeline board',
    description: 'Drag leads through your own stages and see the whole funnel on one screen.',
    group: 'leads',
    source: ['src/components/PipelineBoard.tsx', 'src/hooks/usePipelineLeads.ts'],
  },
  {
    title: 'Custom fields',
    description:
      'Add the fields your business actually tracks. They appear on lead forms, imports and the mobile app.',
    group: 'leads',
    source: ['src/components/CustomFieldManager.tsx', 'src/components/DynamicFieldRenderer.tsx'],
  },
  {
    title: 'Lead rotting alerts',
    description: 'Leads nobody has touched are flagged automatically before they go cold.',
    group: 'leads',
    source: ['src/utils/leadRotting.ts'],
  },

  // ── Calling ────────────────────────────────────────────────────────────────
  {
    title: '1-tap SIM dialing',
    description:
      'Telecallers dial from their own SIM through the phone’s native dialer. No VoIP setup, no per-minute call charges.',
    group: 'calling',
    source: ['mobile/src/screens/38_CallingScreen.tsx', 'mobile/src/screens/40_DialPadScreen.tsx'],
    indiaEdge: true,
  },
  {
    title: 'Automatic call logging',
    description:
      'Duration, timestamp and outcome sync to the CRM after every call, without anyone typing them in.',
    group: 'calling',
    source: ['supabase/functions/log-call', 'mobile/src/screens/54_CallLogScreen.tsx'],
  },
  {
    title: 'Post-call disposition in 2 taps',
    description: 'Log the result, add a note and schedule the callback straight after hanging up.',
    group: 'calling',
    source: ['mobile/src/screens/PostCallFeedbackSheet.tsx', 'src/hooks/useCallDisposition.ts'],
  },
  // "Voice notes — record a note by speaking instead of typing" was listed
  // here, citing mobile/src/screens/68_VoiceNotesModal.tsx as its source. That
  // file does not exist and never has, RECORD_AUDIO is not among the
  // permissions in app.json, and CallMind does not capture audio at all. The
  // entry advertised a feature that could not have been built without
  // contradicting the privacy policy.

  {
    title: 'Callback scheduling',
    description: 'Set a callback and the telecaller gets reminded on their phone when it is due.',
    group: 'calling',
    source: ['mobile/src/screens/131_ScheduleCallbackSheet.tsx', 'src/hooks/useCallbacks.ts'],
  },
  {
    title: 'Works offline',
    description:
      'Calls and notes are stored on the device when the network drops and sync themselves once it returns — built for field teams on patchy mobile data.',
    group: 'calling',
    source: ['mobile/src/services/sync.ts', 'mobile/src/screens/91_OfflineSyncBanner.tsx'],
    indiaEdge: true,
  },

  // ── Automation ─────────────────────────────────────────────────────────────
  {
    title: 'No-code automation rules',
    description:
      'Trigger actions when a lead changes stage, goes untouched, or arrives from a specific source — assign it, notify someone, or start a sequence.',
    group: 'automation',
    source: ['src/components/AutomationPage.tsx', 'supabase/functions/execute-automation-rules'],
  },
  /*
   * "Message sequences" and "Scheduled messages" are gone from this list.
   *
   * Both build a queue and hand it to a worker, and the worker has nothing to
   * hand it to: send-whatsapp-message never reached Meta, and send-email
   * reports custom-domain sending disabled. Worse, the worker used to mark
   * every row 'sent' regardless, because supabase.functions.invoke resolves
   * with { error } instead of throwing and the surrounding try/catch never
   * fired. It now records the real failure (see
   * supabase/functions/_shared/dispatch.ts).
   *
   * The screens still exist and the queue still works. What does not exist is
   * delivery, which is the entire point of a scheduled message -- so listing
   * them as capabilities promised the one part that is missing. They come back
   * when a channel sends.
   */

  // ── Communication ──────────────────────────────────────────────────────────
  {
    title: 'WhatsApp follow-up from the lead',
    /*
     * Was "Send and receive WhatsApp on your own Business API credentials,
     * with replies landing in a shared inbox."
     *
     * Neither direction is connected to Meta. send-whatsapp-message had the
     * Graph API call commented out and returned an invented message id;
     * receive-whatsapp-webhook stored nothing and answered 200, so Meta would
     * have considered every inbound message delivered and never retried. Both
     * now refuse, and this describes the part that works: the telecaller opens
     * WhatsApp with the lead's number already filled in.
     */
    description:
      'Open WhatsApp on the lead’s number straight from the app, without retyping it.',
    group: 'communication',
    source: ['src/components/ChatInbox.tsx'],
  },
  {
    title: 'Email from your own domain',
    description: 'Connect your SMTP credentials and send email that comes from your business, not ours.',
    group: 'communication',
    source: ['supabase/functions/send-email', 'supabase/functions/test-smtp'],
  },
  {
    title: 'Message templates',
    description: 'Save the messages your team sends most often and reuse them consistently.',
    group: 'communication',
    source: ['src/hooks/useMessageTemplates.ts'],
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  {
    title: 'Agent performance reports',
    description: 'Calls placed, connected, talk time and conversion, per telecaller.',
    group: 'analytics',
    source: ['src/hooks/useAgentPerformanceReport.ts', 'src/components/ReportsPage.tsx'],
  },
  {
    title: 'Conversion funnel',
    description: 'Where leads drop out between arriving and closing.',
    group: 'analytics',
    source: ['src/hooks/useConversionFunnelReport.ts'],
  },
  {
    title: 'Lead source yield',
    description: 'Which source actually produces business, so you stop paying for the ones that do not.',
    group: 'analytics',
    source: ['src/hooks/useLeadSourceYieldReport.ts'],
  },
  {
    title: 'Hourly call heatmap',
    description: 'The hours your team connects best, so you can schedule calling around them.',
    group: 'analytics',
    source: ['src/hooks/useHourlyCallsReport.ts', 'src/components/HeatmapChart.tsx'],
  },
  {
    title: 'Scheduled report delivery',
    description: 'Pick the reports you care about and have them emailed on a schedule.',
    group: 'analytics',
    source: ['src/hooks/useReportSchedules.ts', 'src/components/ScheduleReportModal.tsx'],
  },
  {
    title: 'PDF and Excel export',
    description: 'Take any report out of CallMind for your own reviews and accounting.',
    group: 'analytics',
    source: ['src/components/ReportsPage.tsx'],
  },

  // ── Team ───────────────────────────────────────────────────────────────────
  {
    title: 'Live agent monitor',
    description: 'See who is online, who is on a call, and what the floor is doing right now.',
    group: 'team',
    source: ['src/components/AgentLiveMonitor.tsx', 'src/hooks/useAgentMonitor.ts'],
  },
  {
    title: 'Daily and monthly targets',
    description: 'Set call targets per telecaller and track progress against them on both web and mobile.',
    group: 'team',
    source: ['src/components/TeamTargetsSection.tsx', 'mobile/src/screens/TargetScreen.tsx'],
  },
  {
    title: 'Attendance tracking',
    description: 'Telecallers mark attendance from the app and admins see the summary.',
    group: 'team',
    source: ['src/components/AttendanceSection.tsx', 'mobile/src/screens/AttendanceScreen.tsx'],
  },
  {
    title: 'Team leaderboard',
    description: 'A ranked view of the calling floor that gives telecallers something to compete for.',
    group: 'team',
    source: ['mobile/src/screens/LeaderboardScreen.tsx'],
  },
  {
    title: 'QR onboarding for telecallers',
    description: 'A new telecaller scans a code, requests to join, and an admin approves — no manual account setup.',
    group: 'team',
    source: [
      'src/components/TeamJoinToolsSection.tsx',
      'supabase/functions/submit-join-request',
      'supabase/functions/validate-join',
    ],
  },
  {
    title: 'In-app training',
    description: 'Training material and guided learning inside the telecaller app, so onboarding does not need a trainer.',
    group: 'team',
    source: ['mobile/src/screens/27_TrainingLearningScreen.tsx', 'src/components/VideoTutorialsPage.tsx'],
  },
  {
    title: 'Works in multiple languages',
    description:
      'Telecallers pick the language they are comfortable in, so hiring is not limited to English speakers.',
    group: 'team',
    source: ['mobile/src/screens/10_LanguageSelectionScreen.tsx'],
    indiaEdge: true,
  },
  {
    title: 'Announcements',
    description: 'Push a message to the whole calling floor and see it land on their phones.',
    group: 'team',
    source: ['src/components/AnnouncementsPage.tsx', 'mobile/src/screens/61_AnnouncementDetailScreen.tsx'],
  },

  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    title: 'AI talk scripts',
    description: 'Suggested talking points and objection handling on the telecaller’s screen during the call.',
    group: 'ai',
    source: ['mobile/src/screens/67_AITalkScriptScreen.tsx', 'src/components/AITrainingPage.tsx'],
  },
  {
    title: 'AI lead insights',
    description: 'A short read on a lead before dialing, based on the history already in your CRM.',
    group: 'ai',
    source: ['mobile/src/screens/65_AILeadInsightScreen.tsx', 'src/components/AIInsightsHub.tsx'],
  },
  {
    title: 'AI call summaries',
    description: 'Turn call notes into a short summary so the next person picking up the lead has context.',
    group: 'ai',
    source: ['mobile/src/screens/64_AICallSummaryCard.tsx'],
  },
  {
    title: 'AI column mapping on import',
    description:
      'Upload a messy spreadsheet and CallMind works out which column is the name, phone and city.',
    group: 'ai',
    source: ['src/utils/aiMapper.ts', 'src/components/SmartImportModal.tsx'],
  },
  {
    title: 'Your own AI usage controls',
    description: 'AI requests are rate-limited and guard-railed, and usage is tracked per workspace.',
    group: 'ai',
    source: ['src/lib/aiGuardrail.ts', 'src/lib/aiUsage.ts', 'src/lib/aiRouter.ts'],
  },

  // ── Trust ──────────────────────────────────────────────────────────────────
  {
    title: 'Zero call audio stored',
    description:
      'Calls run over the carrier network. CallMind records duration and outcome — never the audio.',
    group: 'trust',
    source: ['mobile/src/screens/38_CallingScreen.tsx'],
    indiaEdge: true,
  },
  {
    title: 'Export your data on demand',
    description: 'Request a full export of your workspace whenever you want it. No lock-in.',
    group: 'trust',
    source: ['supabase/functions/export-user-data'],
  },
  {
    title: 'Right to erasure',
    description: 'Permanently delete your workspace data, aligned with India’s DPDP Act.',
    group: 'trust',
    source: ['supabase/functions/purge-user-data'],
    indiaEdge: true,
  },
  {
    title: 'GST-compliant invoices',
    description: 'Every subscription payment produces a tax invoice with the CGST and SGST split.',
    group: 'trust',
    source: ['src/routes/payments.ts', 'src/components/BillingPage.tsx'],
    indiaEdge: true,
  },
  {
    title: 'Audit logs',
    // Exports and stage changes are not logged -- no call site exists for
    // either. What is logged: lead deletion and restore, bulk distribution and
    // assignment, document upload and view, admin metadata sync.
    description: 'Lead deletions, bulk reassignments, document access and admin changes are recorded and reviewable.',
    group: 'trust',
    source: ['src/components/AuditLogPage.tsx', 'src/services/audit.service.ts'],
  },
  {
    title: 'Biometric app lock',
    description: 'Lock the telecaller app behind the phone’s fingerprint or face unlock.',
    group: 'trust',
    source: ['mobile/src/screens/86_BiometricLockScreen.tsx'],
  },
  {
    title: 'Device management',
    description:
      'See which devices are signed in and remove one that is lost, shared or no longer with the company.',
    group: 'trust',
    source: ['mobile/src/screens/25_DeviceManagementScreen.tsx', 'src/routes/admin.ts'],
  },
  {
    title: 'Role-based access',
    description:
      'Telecallers cannot export your lead database or reach billing. Only admins and founders hold those permissions.',
    group: 'trust',
    source: ['src/ProtectedRoute.tsx', 'src/components/FeatureGate.tsx'],
  },
];

/** Capabilities grouped for rendering, in the order the groups are declared. */
export const capabilitiesByGroup = (Object.keys(CAPABILITY_GROUPS) as CapabilityGroup[]).map(
  (group) => ({
    group,
    ...CAPABILITY_GROUPS[group],
    items: CAPABILITIES.filter((c) => c.group === group),
  })
);

/** The India-specific differentiators, for the home page. */
export const indiaEdgeCapabilities = CAPABILITIES.filter((c) => c.indiaEdge);
