import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import {
  PRICING_PLANS,
  getPlanById,
  resolveLimit,
  type PlanDetails,
} from '../config/pricing';

/**
 * The one place to ask what a company is entitled to.
 *
 * Before this, AuthContext hardcoded every account to the Growth plan with
 * Infinity for every limit, so no plan meant anything -- a Starter customer
 * had Pro capabilities and there was no reason to ever upgrade.
 *
 * This hook is for the interface only. The real gate is in Postgres
 * (20260802000200_plan_enforcement.sql), because the browser holds an
 * authenticated supabase-js client and anything enforced only in React can be
 * skipped from devtools. That split is deliberate, and it is why this hook
 * fails *open*: if the limits query fails we fall back to the bundled config
 * rather than locking a paying customer out over a network blip. The database
 * is still there to say no.
 */

export type PlanFeature =
  | 'bulkImport'
  | 'pdfExport'
  | 'apiAccess'
  | 'teamTargets'
  | 'aiLeadScoring'
  | 'sequences'
  | 'exports'
  | 'automations';

export type PlanMetric =
  | 'seats'
  | 'admins'
  | 'leads'
  | 'automationRules'
  | 'aiCredits'
  | 'bulkImport';

export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled';

interface CompanyPlanRow {
  plan: string | null;
  plan_status: string | null;
  seat_limit: number | null;
  billing_cycle: string | null;
  plan_expires_at: string | null;
  trial_ends_at: string | null;
}

const LAPSED: PlanStatus[] = ['expired', 'cancelled'];

const daysUntil = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
};

/** Reads the caller's company subscription row. */
function useCompanySubscription(companyId: string | null) {
  return useQuery<CompanyPlanRow | null>({
    queryKey: ['plan', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('plan, plan_status, seat_limit, billing_cycle, plan_expires_at, trial_ends_at')
        .eq('id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyPlanRow | null;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

/** Current usage per metered resource, counted server-side. */
function usePlanUsage(companyId: string | null) {
  return useQuery({
    queryKey: ['plan', 'usage', companyId],
    queryFn: async () => {
      if (!companyId) return { seats: 0, admins: 0, leads: 0, automationRules: 0 };

      const countIn = async (
        table: string,
        build: (q: any) => any = (q) => q,
      ): Promise<number> => {
        const { count, error } = await build(
          supabase.from(table).select('id', { head: true, count: 'exact' }).eq('company_id', companyId),
        );
        // A failed count must not read as zero -- that would make a full
        // account look empty and hide the limit rather than enforce it.
        if (error) throw error;
        return count ?? 0;
      };

      const [seats, admins, leads, automationRules] = await Promise.all([
        countIn('users', (q) => q.not('status', 'in', '("disabled","removed")')),
        countIn('users', (q) =>
          q.not('status', 'in', '("disabled","removed")').in('role', ['admin', 'sub_admin', 'founder']),
        ),
        countIn('leads', (q) => q.eq('is_deleted', false)),
        countIn('automation_rules'),
      ]);

      return { seats, admins, leads, automationRules };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

export interface UsePlanResult {
  plan: PlanDetails;
  planId: string;
  status: PlanStatus;
  isTrial: boolean;
  isLapsed: boolean;
  daysRemaining: number;
  /** Purchased seats, which may be below the plan's ceiling. */
  purchasedSeats: number;
  /** True for CallMind's own staff, who are not subject to customer limits. */
  isUnlimited: boolean;
  isLoading: boolean;
  can: (feature: PlanFeature) => boolean;
  limit: (metric: PlanMetric) => number;
  used: (metric: PlanMetric) => number;
  remaining: (metric: PlanMetric) => number;
  atLimit: (metric: PlanMetric) => boolean;
}

export function usePlan(): UsePlanResult {
  const auth = useAuth() as any;
  const companyId: string | null = auth?.profile?.companyId ?? null;

  // isGodMode is the CallMind staff allow-list (an email list in
  // src/constants). isFounder is deliberately NOT used here: it includes the
  // founder of every customer company, and a customer's own founder must be
  // subject to the limits they paid for.
  const isUnlimited: boolean = Boolean(auth?.isGodMode);

  const { data: company, isLoading: companyLoading } = useCompanySubscription(companyId);
  const { data: usage, isLoading: usageLoading } = usePlanUsage(companyId);

  const planId = (company?.plan || 'trial').toLowerCase();
  const status = ((company?.plan_status as PlanStatus) || 'trialing') as PlanStatus;
  const isLapsed = LAPSED.includes(status);

  // Matches get_company_limits() in the database: a lapsed subscription drops
  // to trial entitlements rather than locking the company out of its own data.
  const effectivePlan: PlanDetails = useMemo(
    () => getPlanById(isLapsed ? 'trial' : planId) ?? PRICING_PLANS.trial,
    [planId, isLapsed],
  );

  const purchasedSeats = company?.seat_limit ?? effectivePlan.maxSeats;

  const limit = useCallback(
    (metric: PlanMetric): number => {
      if (isUnlimited) return Infinity;
      switch (metric) {
        case 'seats':
          return Math.min(purchasedSeats, effectivePlan.maxSeats);
        case 'admins':
          return effectivePlan.maxAdmins;
        case 'leads':
          return resolveLimit(effectivePlan.leadLimit);
        case 'automationRules':
          return effectivePlan.automationRules;
        case 'aiCredits':
          return resolveLimit(effectivePlan.aiCreditLimit);
        case 'bulkImport':
          return resolveLimit(effectivePlan.bulkImport);
        default:
          return Infinity;
      }
    },
    [isUnlimited, effectivePlan, purchasedSeats],
  );

  const used = useCallback(
    (metric: PlanMetric): number => {
      switch (metric) {
        case 'seats':
          return usage?.seats ?? 0;
        case 'admins':
          return usage?.admins ?? 0;
        case 'leads':
          return usage?.leads ?? 0;
        case 'automationRules':
          return usage?.automationRules ?? 0;
        default:
          return 0;
      }
    },
    [usage],
  );

  const remaining = useCallback(
    (metric: PlanMetric) => Math.max(0, limit(metric) - used(metric)),
    [limit, used],
  );

  const atLimit = useCallback(
    (metric: PlanMetric) => {
      if (isUnlimited) return false;
      const cap = limit(metric);
      if (cap === Infinity) return false;
      return used(metric) >= cap;
    },
    [isUnlimited, limit, used],
  );

  const can = useCallback(
    (feature: PlanFeature): boolean => {
      if (isUnlimited) return true;
      switch (feature) {
        case 'bulkImport':
          return resolveLimit(effectivePlan.bulkImport) > 0;
        case 'pdfExport':
        case 'exports':
          return effectivePlan.pdfExport;
        case 'apiAccess':
          return effectivePlan.apiAccess !== false;
        case 'teamTargets':
          return effectivePlan.teamTargets;
        case 'aiLeadScoring':
          return effectivePlan.aiLeadScoring !== false;
        case 'automations':
          return effectivePlan.automationRules > 0;
        case 'sequences':
          // Drip sequences ride on the automation engine.
          return effectivePlan.automationRules > 0 && !isLapsed;
        default:
          return false;
      }
    },
    [isUnlimited, effectivePlan, isLapsed],
  );

  const isTrial = planId === 'trial' || status === 'trialing';

  return {
    plan: effectivePlan,
    planId,
    status,
    isTrial,
    isLapsed,
    daysRemaining: daysUntil(isTrial ? company?.trial_ends_at : company?.plan_expires_at),
    purchasedSeats,
    isUnlimited,
    isLoading: companyLoading || usageLoading,
    can,
    limit,
    used,
    remaining,
    atLimit,
  };
}
