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
 * The bullet list shown on a pricing card. Numbers come from the config; the
 * qualitative lines are fixed and were checked against the code that
 * implements them (see src/website/data/capabilities.ts).
 */
export const describePlan = (plan: PlanDetails): string[] => {
  const bullets: string[] = [
    `${plan.maxAdmins} admin${plan.maxAdmins === 1 ? '' : 's'}`,
    `Up to ${plan.maxSeats} telecaller seats (from 1 seat)`,
    `${describeLeads(plan)} stored`,
    `${formatCount(plan.pipelineStages, 'pipeline stage')}`,
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

  if (plan.auditLogDays) bullets.push(`${plan.auditLogDays} days of audit logs`);
  if (plan.onboardingCall) bullets.push('Guided onboarding call');

  return bullets;
};

export const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: 'For small teams starting with SIM telecalling. Your free trial continues straight into Starter.',
  growth: 'For growing teams that need automation, AI scoring and team targets.',
  pro: 'For call centres and high-volume teams needing multi-team hierarchy and full API access.',
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
    badge: plan.highlight ? 'Most Popular' : undefined,
    features: describePlan(plan),
  };
});
