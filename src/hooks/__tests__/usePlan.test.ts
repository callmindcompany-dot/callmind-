import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlan } from '../usePlan';
import { PRICING_PLANS } from '../../config/pricing';

/**
 * Entitlement is the thing customers pay for, so the table below walks every
 * plan against every gate. The two cases that matter most are at the bottom:
 * CallMind staff must bypass limits, and a *customer's* founder must not --
 * that distinction is what the old `isFounder` checks got wrong, exempting the
 * one person in each company most likely to hit a limit.
 */

const authState = {
  profile: { companyId: 'cmp_1' } as any,
  isGodMode: false,
  isFounder: false,
};

vi.mock('../../AuthContext', () => ({
  useAuth: () => authState,
}));

let companyRow: any = null;
let usageCounts = { seats: 0, admins: 0, leads: 0, automationRules: 0 };

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, any> = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        in: () => chain,
        maybeSingle: async () => ({ data: companyRow, error: null as unknown }),
        then: undefined,
      };
      // Count queries resolve on the builder itself.
      chain.then = (resolve: any) => {
        const count =
          table === 'leads' ? usageCounts.leads
          : table === 'automation_rules' ? usageCounts.automationRules
          : usageCounts.seats;
        return Promise.resolve({ count, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );

const setCompany = (row: any) => { companyRow = row; };

const render = async () => {
  const hook = renderHook(() => usePlan(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
};

beforeEach(() => {
  authState.isGodMode = false;
  authState.isFounder = false;
  usageCounts = { seats: 0, admins: 0, leads: 0, automationRules: 0 };
  setCompany({
    plan: 'starter', plan_status: 'active', seat_limit: 10,
    billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null,
  });
});

describe('usePlan entitlements', () => {
  it.each([
    ['trial',   { bulkImport: false, pdfExport: false, teamTargets: false, aiLeadScoring: false, apiAccess: false }],
    ['starter', { bulkImport: false, pdfExport: false, teamTargets: false, aiLeadScoring: false, apiAccess: false }],
    ['growth',  { bulkImport: true,  pdfExport: true,  teamTargets: true,  aiLeadScoring: true,  apiAccess: true }],
    ['pro',     { bulkImport: true,  pdfExport: true,  teamTargets: true,  aiLeadScoring: true,  apiAccess: true }],
  ])('%s unlocks the right features', async (plan, expected) => {
    setCompany({ plan, plan_status: 'active', seat_limit: 10, billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null });
    const { result } = await render();

    expect(result.current.planId).toBe(plan);
    for (const [feature, allowed] of Object.entries(expected)) {
      expect(result.current.can(feature as any)).toBe(allowed);
    }
  });

  it('caps seats at the lower of purchased seats and the plan ceiling', async () => {
    // Pro allows 50, but this company only bought 3.
    setCompany({ plan: 'pro', plan_status: 'active', seat_limit: 3, billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null });
    const { result } = await render();
    expect(result.current.limit('seats')).toBe(3);
  });

  it('reports unlimited leads on Pro as Infinity and never at limit', async () => {
    usageCounts.leads = 5_000_000;
    setCompany({ plan: 'pro', plan_status: 'active', seat_limit: 50, billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null });
    const { result } = await render();
    expect(result.current.limit('leads')).toBe(Infinity);
    expect(result.current.atLimit('leads')).toBe(false);
  });

  it('blocks once usage reaches the cap', async () => {
    usageCounts.leads = 50_000; // Starter's lead limit
    const { result } = await render();
    expect(result.current.atLimit('leads')).toBe(true);
    expect(result.current.remaining('leads')).toBe(0);
  });

  it('drops a lapsed subscription to trial limits, matching get_company_limits()', async () => {
    setCompany({ plan: 'pro', plan_status: 'expired', seat_limit: 50, billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null });
    const { result } = await render();

    expect(result.current.isLapsed).toBe(true);
    expect(result.current.plan.id).toBe('trial');
    expect(result.current.can('pdfExport')).toBe(false);
    expect(result.current.limit('leads')).toBe(PRICING_PLANS.trial.leadLimit);
  });

  it('treats a cancelled subscription the same way', async () => {
    setCompany({ plan: 'growth', plan_status: 'cancelled', seat_limit: 25, billing_cycle: 'monthly', plan_expires_at: null, trial_ends_at: null });
    const { result } = await render();
    expect(result.current.plan.id).toBe('trial');
  });

  it('exempts CallMind staff from every limit', async () => {
    authState.isGodMode = true;
    usageCounts.leads = 9_999_999;
    const { result } = await render();

    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.can('pdfExport')).toBe(true);
    expect(result.current.limit('seats')).toBe(Infinity);
    expect(result.current.atLimit('leads')).toBe(false);
  });

  it("does NOT exempt a customer's own founder", async () => {
    authState.isFounder = true; // but not isGodMode
    usageCounts.leads = 50_000;
    const { result } = await render();

    expect(result.current.isUnlimited).toBe(false);
    expect(result.current.can('pdfExport')).toBe(false);
    expect(result.current.atLimit('leads')).toBe(true);
  });

  it('falls back to trial rather than crashing when no company row exists', async () => {
    setCompany(null);
    const { result } = await render();
    expect(result.current.planId).toBe('trial');
    expect(result.current.isTrial).toBe(true);
  });
});
