import { supabase } from './supabase';

/**
 * Whether the company's subscription still allows work.
 *
 * The database enforces the plan now — seat limits, lead limits and the billing
 * columns are all guarded by triggers, and an expired company falls back to
 * trial limits. The mobile app never asked. `isSubscriptionLocked` was declared
 * in App.tsx and never read, and SubscriptionLockScreen was imported and never
 * rendered, so a telecaller whose company had lapsed would have seen writes
 * start failing with a Postgres error and no explanation.
 */

export interface PlanStatus {
  locked: boolean;
  companyName: string;
  /** Formatted for display, or null when the company has no end date recorded. */
  expiryDate: string | null;
}

/** plan_status values that stop work. Matches the CHECK on companies. */
const LOCKED_STATES = new Set(['expired', 'cancelled', 'past_due']);

export const planStatusService = {
  /**
   * Reads companies for this agent's tenant.
   *
   * Fails open. If the check itself cannot run — offline, a policy change, a
   * transient error — the agent keeps working. Locking someone out of their
   * leads because a status query failed is worse than letting a lapsed company
   * work for another few minutes, and the database is still refusing anything
   * that actually breaches the plan.
   */
  async check(companyId: string | null | undefined): Promise<PlanStatus> {
    const open: PlanStatus = { locked: false, companyName: '', expiryDate: null };
    if (!companyId) return open;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, plan_status, plan_expires_at, trial_ends_at, plan')
        .eq('id', companyId)
        .maybeSingle();

      if (error || !data) return open;

      const status = String(data.plan_status ?? '').toLowerCase();
      if (!LOCKED_STATES.has(status)) return open;

      // A trial shows its trial end; a paid plan shows when it lapsed.
      const ends = data.plan === 'trial' ? data.trial_ends_at : data.plan_expires_at;

      return {
        locked: true,
        companyName: data.name || 'Your workspace',
        expiryDate: ends
          ? new Date(ends).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : null,
      };
    } catch {
      return open;
    }
  },
};
