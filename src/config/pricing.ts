/**
 * The single source of truth for plans, prices and limits.
 *
 * Nothing else in the codebase may hardcode a rupee figure or a plan limit.
 * The database gets the same numbers from `public.plan_limits`, which is
 * generated from this file by `npm run gen:plans`; a test
 * (src/__tests__/planLimits.sync.test.ts) fails the build if the two drift
 * apart. That guard exists because they already had: the website, the billing
 * page, the trial upgrade modal and the docs each carried a different price.
 */

export interface PlanDetails {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  /**
   * Every paid plan is purchasable from a single seat. Plans differ by
   * capability, not by team size -- a five-person team that wants AI scoring
   * buys Growth. `maxSeats` is the only seat-based boundary.
   */
  maxSeats: number;
  maxAdmins: number; // Tiered Admin Capacity (1, 2, or 3 Admins)
  leadLimit: number | "unlimited";
  leadWarning?: number;
  aiDraftLimit: number | "unlimited";
  aiCreditLimit: number | "unlimited";
  pipelineStages: number | "unlimited";
  automationRules: number;
  bulkImport: number | false | "unlimited";
  aiLeadScoring: boolean | "advanced";
  teamTargets: boolean;
  apiAccess: boolean | "read_only" | "full_read_write";
  /** Rendering a report as a PDF. Safe to sample: it produces a document, not the data. */
  pdfExport: boolean;
  /**
   * Downloading the whole lead book as a spreadsheet.
   *
   * Split from `pdfExport`, which it used to share a flag with. They are not
   * the same thing: a PDF report shows a customer what the product can tell
   * them, while a CSV of every lead is the database walking out of the door.
   * The trial gets the first and not the second.
   *
   * This does not touch the data-rights export in Settings, which is a right
   * under the DPDP Act 2023 and is available on every plan.
   */
  bulkLeadExport: boolean;
  /**
   * Document storage included per seat, pooled across the whole company.
   *
   * Sized from real demand rather than a round guess. One telecaller works
   * roughly 400 leads a month; about 8% of those ever reach documentation, and
   * a documented Indian lending or insurance file (Aadhaar, PAN, bank
   * statement, signed agreement) is about 5 MB. That is ~2 GB per telecaller
   * per year, so the figures below carry real headroom on top.
   *
   * Per seat rather than a flat pool because a 5-seat and a 40-seat company on
   * the same plan do not generate remotely similar volumes, and seats are
   * already the unit everything else is priced in.
   *
   * Files live in Cloudflare R2, not Supabase Storage -- R2 charges nothing
   * for egress, which is what previews and downloads actually cost. At about
   * Rs 1.32 per GB per month, even a completely full allowance is under 0.7%
   * of what the seat earns.
   */
  storageGbPerSeat: number;
  /**
   * A fixed storage grant for the whole company, in MB, instead of a per-seat
   * allowance. Only the trial uses this: seven days is not long enough for
   * seat count to mean anything, and a flat "500 MB" is easier to state than
   * a fraction of a gigabyte per seat.
   */
  storageFlatMb?: number;
  maxFileSizeMb: number;
  videoUpload: boolean;
  filesPerLead: number | "unlimited";
  recycleBinDays: number;
  /** How many lead-source integrations may be active at once. */
  leadSources: number | "unlimited";
  /**
   * Sending email from the customer's own domain.
   *
   * False on every plan because it is not built: supabase/functions/send-email
   * reads company_settings.smtp_config and then does nothing --
   * `// TODO: Connect SMTP server relay`. Flip this on only when that function
   * actually dispatches mail, or the plan will be selling a feature that
   * silently does nothing, which is what the eight removed add-ons did.
   */
  emailFromOwnDomain: boolean;
  whatsappType: "manual" | "business_api" | "api_templates";
  supportType: "email" | "chat" | "whatsapp_priority";
  supportHours: number;
  highlight?: boolean;
  smsCredits?: number;
  auditLogDays?: number;
  onboardingCall?: boolean;
  whiteLabel?: boolean | "addon";
}

/**
 * The free trial.
 *
 * Five days rather than seven, and a thousand leads rather than five hundred:
 * enough room to import a real book of leads and work it, over a window short
 * enough that the team either adopts the habit or does not.
 *
 * `includedTelecallers` is 2, so a trial workspace holds three people — the
 * owner who signs up, plus two telecallers. The third person to try to join is
 * refused by the seat limit, and that refusal is the moment the owner is asked
 * to pick a plan. It is the only hard wall in the trial, and it is deliberate:
 * a team that wants a third caller has proved the product works for them.
 */
export const FREE_TRIAL_CONFIG = {
  trialDays: 5,
  includedTelecallers: 2, // 2 Telecallers + 1 Admin = 3 Total Users
  leadLimit: 1000,
  pipelineStages: 5,
};

export const PRICING_PLANS: Record<string, PlanDetails> = {
  /**
   * Not sold -- this is the entitlement set a company holds during the free
   * trial, and the one it falls back to if a subscription lapses. It exists
   * here so `companies.plan` has a config entry for all four of its legal
   * values and the enforcement layer never has to special-case "no plan".
   *
   * The trial samples the product rather than fencing it off. It used to have
   * every capability switched off, so a company evaluating CallMind met a lock
   * everywhere the product is actually interesting and then bought Starter,
   * which had the same capabilities switched off -- they never saw what they
   * were paying for.
   *
   * Three fences already exist and they are enough: five days, three seats,
   * a thousand leads. Capability fences on top of those only hide the product
   * from the person deciding whether to buy it.
   *
   * Two rules govern what is switched on here.
   *
   * Only what exists. aiLeadScoring, apiAccess, WhatsApp Business API, SMS
   * credits and white label stay off because none of them is built -- nothing
   * writes neural_score, no route authenticates a workspace API key, and no
   * route sends a WhatsApp message. Switching those on would demonstrate
   * nothing and promise something.
   *
   * Never more than Starter. Whatever the trial samples, Starter keeps, or a
   * customer loses features by paying. src/__tests__/planLimits.sync.test.ts
   * enforces that in both directions.
   */
  trial: {
    id: "trial",
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    maxSeats: FREE_TRIAL_CONFIG.includedTelecallers + 1, // telecallers + 1 admin
    maxAdmins: 1,
    leadLimit: FREE_TRIAL_CONFIG.leadLimit,
    aiDraftLimit: 30,
    aiCreditLimit: 50,
    pipelineStages: FREE_TRIAL_CONFIG.pipelineStages,
    automationRules: 2,
    // Enough rows to try an import and see the column mapper work, nowhere
    // near enough to migrate a real book of leads for free.
    bulkImport: 200,
    aiLeadScoring: false,
    teamTargets: true,
    apiAccess: false,
    // The report renders; the lead book does not leave.
    pdfExport: true,
    bulkLeadExport: false,
    storageGbPerSeat: 0,
    storageFlatMb: 500,
    maxFileSizeMb: 5,
    videoUpload: false,
    filesPerLead: 5,
    recycleBinDays: 7,
    leadSources: 2,
    emailFromOwnDomain: false,
    whatsappType: "manual",
    supportType: "email",
    supportHours: 48,
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 699,
    annualPrice: 599,
    maxSeats: 10,
    maxAdmins: 1, // Master Founder only
    leadLimit: 50000,
    leadWarning: 40000,
    aiDraftLimit: 30,
    aiCreditLimit: 50,
    pipelineStages: 5,
    automationRules: 2,
    /*
     * Starter keeps everything the trial sampled, with room to use it.
     *
     * It used to have every capability off -- no import, no targets, no
     * reports -- so converting from the trial bought volume and nothing else,
     * and now that the trial samples those, keeping them off would mean paying
     * ₹699 a seat to lose features. Nobody should get less by paying.
     */
    bulkImport: 2000,
    aiLeadScoring: false,
    teamTargets: true,
    apiAccess: false,
    pdfExport: true,
    // The one thing Starter adds over the trial beyond volume: your data is
    // yours to take out as a spreadsheet.
    bulkLeadExport: true,
    storageGbPerSeat: 3,
    maxFileSizeMb: 10,
    videoUpload: false,
    filesPerLead: 10,
    recycleBinDays: 15,
    leadSources: 2,
    emailFromOwnDomain: false,
    whatsappType: "manual",
    supportType: "email",
    supportHours: 48,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPrice: 1199,
    annualPrice: 999,
    maxSeats: 25,
    maxAdmins: 2, // Founder + 1 Sub-Admin Co-Manager
    leadLimit: 250000,
    leadWarning: 200000,
    aiDraftLimit: "unlimited",
    aiCreditLimit: 200,
    pipelineStages: 15,
    automationRules: 15,
    bulkImport: 10000,
    aiLeadScoring: true,
    teamTargets: true,
    apiAccess: "read_only",
    pdfExport: true,
    bulkLeadExport: true,
    storageGbPerSeat: 5,
    maxFileSizeMb: 25,
    videoUpload: true,
    filesPerLead: 25,
    recycleBinDays: 30,
    leadSources: 5,
    emailFromOwnDomain: false,
    whatsappType: "business_api",
    supportType: "chat",
    supportHours: 8,
    highlight: true, // Most Popular badge
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: 1499,
    annualPrice: 1299,
    maxSeats: 50,
    maxAdmins: 3, // Founder + 2 Sub-Admins Co-Managers
    leadLimit: "unlimited",
    aiDraftLimit: "unlimited",
    aiCreditLimit: "unlimited",
    pipelineStages: "unlimited",
    automationRules: 50,
    bulkImport: "unlimited",
    aiLeadScoring: "advanced",
    teamTargets: true,
    apiAccess: "full_read_write",
    pdfExport: true,
    bulkLeadExport: true,
    storageGbPerSeat: 8,
    maxFileSizeMb: 100,
    videoUpload: true,
    filesPerLead: "unlimited",
    recycleBinDays: 90,
    leadSources: "unlimited",
    emailFromOwnDomain: false,
    whatsappType: "api_templates",
    supportType: "whatsapp_priority",
    supportHours: 2,
    smsCredits: 1000,
    auditLogDays: 365,
    onboardingCall: true,
    whiteLabel: "addon",
  },
};

/**
 * Billing terms a customer may choose, in months.
 *
 * The UI used to offer 1-6 and 12 with no discount on anything except 12, so
 * the middle terms gave the customer nothing and only complicated renewals.
 * Quarterly and half-yearly stay because Indian B2B buyers ask for them.
 */
export const ALLOWED_TERM_MONTHS = [1, 3, 6, 12] as const;
export type TermMonths = (typeof ALLOWED_TERM_MONTHS)[number];

export const isAllowedTerm = (months: unknown): months is TermMonths =>
  (ALLOWED_TERM_MONTHS as readonly number[]).includes(Number(months));

/**
 * GST applies to everything we sell -- subscriptions and storage alike. There
 * is no exemption for add-ons: storage is a supply of service under the same
 * SAC as the subscription. Selling it without GST would mean paying it out of
 * our own margin later, with interest.
 */
export const GST_RATE = 0.18;

/**
 * Extra storage, bought on a slider rather than as fixed packs.
 *
 * One rate, no slabs, so the price updates as the customer drags and needs no
 * arithmetic to understand. Cloudflare R2 costs us about Rs 1.32 per GB per
 * month, so this holds a ~74% margin at every position on the slider.
 *
 * Above `maxGb` the slider stops and we talk to the customer -- at that size
 * the per-GB rate should be negotiated, not automated.
 */
export const STORAGE_ADDON = {
  pricePerGbMonth: 5,
  minGb: 5,
  maxGb: 500,
  stepGb: 5,
  /** Show a warning banner once usage crosses this share of the quota. */
  warnAtPercent: 80,
};

export const MB_PER_GB = 1024;

/**
 * Storage included with a subscription, in MB.
 *
 * Pooled: the company gets one bucket sized by how many seats it bought, not a
 * separate quota per person. Nobody has to think about who owns which
 * gigabyte, and buying a seat visibly buys room.
 *
 * The trial is the exception -- a flat grant, because seven days is too short
 * for seat count to mean anything.
 *
 * Note this is what we *allow*, not what we pay for. Cloudflare R2 bills the
 * bytes actually stored, so a company using 200 MB of its 30 GB costs us 200
 * MB. That is why the allowances can be generous.
 */
export const includedStorageMb = (planId: string, seats: number): number => {
  const plan = getPlanById(planId);
  if (!plan) return 0;
  if (plan.storageFlatMb) return plan.storageFlatMb;
  return plan.storageGbPerSeat * MB_PER_GB * Math.max(1, seats);
};

/** Human-readable quota, e.g. "500 MB" or "30 GB". */
export const formatStorage = (mb: number): string =>
  mb >= MB_PER_GB ? `${+(mb / MB_PER_GB).toFixed(1)} GB` : `${Math.round(mb)} MB`;

export const calculateStorageAddonPrice = (gb: number, months: number) => {
  const monthly = gb * STORAGE_ADDON.pricePerGbMonth;
  const subtotal = monthly * months;
  const gst = Math.round(subtotal * GST_RATE);
  return { monthly, subtotal, gst, total: subtotal + gst };
};

/** The plans a customer can actually buy, cheapest first. */
export const PURCHASABLE_PLAN_IDS = ["starter", "growth", "pro"] as const;
export type PurchasablePlanId = (typeof PURCHASABLE_PLAN_IDS)[number];

/** Every value `companies.plan` is allowed to hold. */
export const ALL_PLAN_IDS = ["trial", ...PURCHASABLE_PLAN_IDS] as const;
export type PlanId = (typeof ALL_PLAN_IDS)[number];

export const isPurchasablePlanId = (id: unknown): id is PurchasablePlanId =>
  typeof id === "string" && (PURCHASABLE_PLAN_IDS as readonly string[]).includes(id.toLowerCase());

/**
 * Turns a config limit into a number for comparison.
 *
 * `"unlimited"` becomes Infinity and `false` becomes 0, matching the
 * convention used in `plan_limits`, where NULL is unlimited and 0 is off.
 */
export const resolveLimit = (value: number | false | "unlimited" | undefined): number => {
  if (value === "unlimited") return Infinity;
  if (value === false || value === undefined) return 0;
  return value;
};

/** Returns plan details by ID. */
export const getPlanById = (planId: string): PlanDetails | undefined => {
  if (!planId) return undefined;
  return PRICING_PLANS[planId.toLowerCase()];
};

/**
 * The cheapest plan that can hold this many seats.
 *
 * Use this only to validate a *downgrade* -- "can this company fit on Starter
 * if it drops to Starter?" It is not a plan recommendation: since every plan
 * starts at one seat, seat count no longer implies a tier.
 */
export const getMinimumPlanForSeatCount = (seats: number): PlanDetails | undefined =>
  PURCHASABLE_PLAN_IDS.map((id) => PRICING_PLANS[id]).find((plan) => seats <= plan.maxSeats);

/**
 * Calculates the per-seat rate, the total for one month, and what choosing
 * annual billing saves over a full year.
 */
export const calculatePrice = (planId: string, seats: number, isAnnual: boolean) => {
  const plan = getPlanById(planId);
  if (!plan) return { pricePerSeat: 0, total: 0, savings: 0 };

  const pricePerSeat = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const total = pricePerSeat * seats;

  const monthlyTotalEquivalent = plan.monthlyPrice * seats;
  const savings = isAnnual ? (monthlyTotalEquivalent - total) * 12 : 0;

  return { pricePerSeat, total, savings };
};
