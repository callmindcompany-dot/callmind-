import { PRICING_PLANS, resolveLimit, formatStorage, type PlanDetails } from '../../config/pricing';

/**
 * Marketing copy for the plans, derived from the plan config.
 *
 * Every seat count, lead cap and rule count on the pricing page used to be a
 * hand-typed string. They fell out of step with src/config/pricing.ts -- the
 * page advertised "11 to 25 Telecaller Seats" for Growth long after that was
 * the intended shape, and the seat ranges no longer exist at all. Deriving the
 * numbers means a config change updates the website by itself.
 *
 * Only prose that carries no number stays hardcoded below.
 */

const inr = new Intl.NumberFormat('en-IN');

const formatCount = (value: number | false | 'unlimited', noun: string, pluralNoun = `${noun}s`) => {
  const n = resolveLimit(value);
  if (n === Infinity) return `Unlimited ${pluralNoun}`;
  return `${inr.format(n)} ${n === 1 ? noun : pluralNoun}`;
};

export const describeSeats = (plan: PlanDetails) =>
  `1 - ${plan.maxSeats} seats`;

export const describeLeads = (plan: PlanDetails) =>
  plan.leadLimit === 'unlimited' ? 'Unlimited leads' : `${inr.format(plan.leadLimit)} leads`;

const SUPPORT_LABEL: Record<PlanDetails['supportType'], string> = {
  email: 'Email support',
  chat: 'Priority chat support',
  whatsapp_priority: 'Priority WhatsApp support',
};

const WHATSAPP_LABEL: Record<PlanDetails['whatsappType'], string> = {
  manual: 'Manual WhatsApp messaging',
  business_api: 'WhatsApp Business API integration',
  api_templates: 'WhatsApp API with approved templates',
};

/**
 * The bullet list shown on a pricing card.
 *
 * Every line here has to name something the product does. Five did not, and
 * they were the five that made the paid tiers look worth paying for:
 *
 *   pipeline stages       no pipeline_stages table; identical on every plan,
 *                         so the number rose with the price and nothing else
 *   AI lead scoring       nothing writes leads.neural_score
 *   REST API              no api_keys table, no authenticated route
 *   WhatsApp Business API sending was never wired to Meta, and reported success
 *   365 days of audit logs  audit_logs records no customer action, and pg_cron
 *                         is not installed to expire anything
 *
 * They are gone from src/config/pricing.ts, so four of the five disappear from
 * this list by themselves -- their flags are false and the `if` never fires.
 * That is the point of deriving copy from the config: the card cannot claim
 * what the config does not hold. Only the pipeline-stages line was
 * unconditional, and it is deleted here.
 *
 * src/__tests__/planClaimsAreBuilt.test.ts fails if any of them come back
 * without the implementation arriving first.
 */
export const describePlan = (plan: PlanDetails): string[] => {
  const bullets: string[] = [
    `${plan.maxAdmins} admin${plan.maxAdmins === 1 ? '' : 's'}`,
    `Up to ${plan.maxSeats} telecaller seats (from 1 seat)`,
    `${describeLeads(plan)} stored`,
    `${formatCount(plan.automationRules, 'automation rule')}`,
  ];

  bullets.push(
    plan.aiCreditLimit === 'unlimited'
      ? 'Unlimited AI credits'
      : `${inr.format(plan.aiCreditLimit)} AI credits / month`,
  );

  if (plan.bulkImport === 'unlimited') bullets.push('Unlimited bulk CSV import');
  else if (typeof plan.bulkImport === 'number') {
    bullets.push(`Bulk CSV import up to ${inr.format(plan.bulkImport)} rows`);
  }

  if (plan.aiLeadScoring === 'advanced') bullets.push('Advanced AI lead scoring');
  else if (plan.aiLeadScoring) bullets.push('AI lead scoring');

  if (plan.teamTargets) bullets.push('Team targets and leaderboards');
  if (plan.pdfExport) bullets.push('PDF report export');

  bullets.push(
    plan.storageFlatMb
      ? `${formatStorage(plan.storageFlatMb)} document storage`
      : `${plan.storageGbPerSeat} GB document storage per seat`,
  );

  if (plan.apiAccess === 'full_read_write') bullets.push('Full read/write REST API');
  else if (plan.apiAccess === 'read_only') bullets.push('Read-only REST API');

  bullets.push(WHATSAPP_LABEL[plan.whatsappType]);
  bullets.push(`${SUPPORT_LABEL[plan.supportType]} (${plan.supportHours}h response)`);

  if (plan.onboardingCall) bullets.push('Guided onboarding call');

  return bullets;
};

/**
 * What `plan` adds over `from` — the bullets that actually changed.
 *
 * Every card printing its full list means the reader has to diff three
 * fourteen-line lists by eye to find out what another ₹500 a seat buys, which
 * is work nobody does. This computes the difference instead of a copywriter
 * asserting it, so "Everything in Starter, plus…" stays true when a limit
 * moves in src/config/pricing.ts.
 *
 * Compares rendered strings, so a bullet whose number changed counts as added
 * and one that is word-for-word identical drops out. That is exactly the
 * distinction a reader cares about.
 */
export const describeUpgrade = (plan: PlanDetails, from: PlanDetails): string[] => {
  const previous = new Set(describePlan(from));
  return describePlan(plan).filter((line) => !previous.has(line));
};

/*
 * One line saying who each plan is for.
 *
 * Growth's said "automation, AI scoring and team targets": AI scoring does not
 * exist, and team targets are on every plan including the free trial, so one
 * of the three named things was a reason to pay. Pro's said "multi-team
 * hierarchy and full API access", and there is no customer-facing API at all.
 *
 * What separates the plans is volume -- seats, leads, AI credits, automation
 * rules, import size, storage. So that is what these say.
 */
export const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: 'For small teams starting with SIM telecalling. Your free trial continues straight into Starter.',
  growth: 'For teams that have outgrown Starter: five times the seats, five times the leads, and enough automation rules to run a real follow-up sequence.',
  pro: 'For call centres working at volume, with unlimited leads and AI credits and the largest team CallMind supports.',
};

/** The three purchasable plans, ready to render. */
export const MARKETING_PLANS = (['starter', 'growth', 'pro'] as const).map((id) => {
  const plan = PRICING_PLANS[id];
  return {
    id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    seats: describeSeats(plan),
    leads: describeLeads(plan),
    description: PLAN_DESCRIPTIONS[id],
    highlight: Boolean(plan.highlight),
    // Was "Most Popular". Nobody has bought a plan yet -- one company exists
    // and it is on trial -- so that was a fact about customers we do not have.
    // "Recommended" is our opinion, which we are entitled to.
    badge: plan.highlight ? 'Recommended' : undefined,
    features: describePlan(plan),
  };
});
