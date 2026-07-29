export interface PlanDetails {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  minSeats: number;
  maxSeats: number;
  maxAdmins: number; // Tiered Admin Capacity (1, 2, or 3 Admins)
  leadLimit: number | "unlimited";
  leadWarning?: number;
  aiDraftLimit: number | "unlimited";
  aiCreditLimit?: number | "unlimited";
  pipelineStages: number | "unlimited";
  automationRules: number;
  bulkImport: number | boolean | "unlimited";
  aiLeadScoring: boolean | "advanced";
  teamTargets: boolean;
  apiAccess: boolean | "read_only" | "full_read_write";
  pdfExport: boolean;
  whatsappType: "manual" | "business_api" | "api_templates";
  supportType: "email" | "chat" | "whatsapp_priority";
  supportHours: number;
  highlight?: boolean;
  smsCredits?: number;
  auditLogDays?: number;
  onboardingCall?: boolean;
  whiteLabel?: boolean | "addon";
}

export const FREE_TRIAL_CONFIG = {
  trialDays: 7,
  includedTelecallers: 3, // 3 Telecallers + 1 Admin = 4 Total Users
  leadLimit: 1000,
  pipelineStages: 5,
};

export const PRICING_PLANS: Record<string, PlanDetails> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 499,
    annualPrice: 399,
    minSeats: 1,
    maxSeats: 10,
    maxAdmins: 1, // Master Founder only
    leadLimit: 50000,
    leadWarning: 40000,
    aiDraftLimit: 30,
    pipelineStages: 5,
    automationRules: 2,
    bulkImport: false,
    aiLeadScoring: false,
    teamTargets: false,
    apiAccess: false,
    pdfExport: false,
    whatsappType: "manual",
    supportType: "email",
    supportHours: 48,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPrice: 799,
    annualPrice: 599,
    minSeats: 11,
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
    whatsappType: "business_api",
    supportType: "chat",
    supportHours: 8,
    highlight: true, // Most Popular badge
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: 1099,
    annualPrice: 899,
    minSeats: 26,
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
 * Returns plan details by ID
 */
export const getPlanById = (planId: string): PlanDetails | undefined => {
  return PRICING_PLANS[planId.toLowerCase()];
};

/**
 * Determines appropriate plan by seat count
 */
export const getPlanForSeatCount = (seats: number): PlanDetails => {
  if (seats <= 10) return PRICING_PLANS.starter;
  if (seats <= 25) return PRICING_PLANS.growth;
  return PRICING_PLANS.pro;
};

/**
 * Calculates total price, savings, and per-seat cost
 */
export const calculatePrice = (planId: string, seats: number, isAnnual: boolean) => {
  const plan = getPlanById(planId);
  if (!plan) return { pricePerSeat: 0, total: 0, savings: 0 };

  const pricePerSeat = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const total = pricePerSeat * seats;
  
  // Calculate savings compared to monthly plan if billing annually
  const monthlyTotalEquivalent = plan.monthlyPrice * seats;
  const savings = isAnnual ? (monthlyTotalEquivalent - total) * 12 : 0;

  return {
    pricePerSeat,
    total,
    savings,
  };
};
