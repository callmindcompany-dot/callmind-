import { supabase } from './supabase';

/**
 * The team ranking, from the team's actual calls.
 *
 * LeaderboardScreen used to hold two arrays written by hand -- Priya Verma with
 * 168 calls, Ravi Kumar 142, Amit Patel 128, then Neha Gupta, Vikas Singh and
 * Suresh Malhotra below them. None of those people exist. Every telecaller who
 * opened the screen saw a podium of strangers, read their own absence from it as
 * being last, and could not have found the numbers anywhere else in the app
 * because there were none.
 *
 * Row-level security scopes calls and users to the caller's company (checked
 * against pg_policy, not assumed), so a telecaller can read what this needs and
 * nothing beyond their own tenant.
 */

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'allTime';

export interface LeaderRow {
  userId: string;
  name: string;
  initials: string;
  calls: number;
  conversions: number;
  /** Marks the signed-in agent's own row, so they can find themselves. */
  isMe: boolean;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

/** Start of the window, or null for all time. */
function since(period: LeaderboardPeriod): string | null {
  if (period === 'allTime') return null;
  const d = new Date();
  if (period === 'weekly') d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export const leaderboardService = {
  /**
   * One row per team member, ranked by calls then conversions.
   *
   * Throws. A leaderboard that renders as empty after a failed query reads as
   * "nobody on your team has made a call", which is a thing an agent would
   * believe and act on.
   *
   * Members with no calls are included rather than dropped -- a ranking that
   * silently omits people is not a ranking, and an agent looking for their own
   * name needs to find it on their first day.
   */
  async fetch(
    companyId: string,
    myUserId: string,
    period: LeaderboardPeriod,
  ): Promise<LeaderRow[]> {
    if (!companyId) return [];

    const { data: members, error: memberError } = await supabase
      .from('users')
      .select('id, name, display_name, email')
      .eq('company_id', companyId)
      .neq('status', 'disabled');

    if (memberError) throw memberError;

    let callQuery = supabase
      .from('calls')
      .select('agent_id')
      .eq('company_id', companyId);

    const from = since(period);
    if (from) callQuery = callQuery.gte('created_at', from);

    const { data: calls, error: callError } = await callQuery;
    if (callError) throw callError;

    // Conversions are a property of the lead, not the call, so they are counted
    // from leads and are not windowed -- a lead converted last month is still
    // converted. The period applies to call volume only, which is what the tabs
    // are actually comparing.
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('assigned_to, status')
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    if (leadError) throw leadError;

    const callCount = new Map<string, number>();
    for (const c of calls ?? []) {
      if (!c.agent_id) continue;
      callCount.set(c.agent_id, (callCount.get(c.agent_id) ?? 0) + 1);
    }

    const conversionCount = new Map<string, number>();
    for (const l of leads ?? []) {
      if (!l.assigned_to) continue;
      if (String(l.status ?? '').toLowerCase() !== 'converted') continue;
      conversionCount.set(l.assigned_to, (conversionCount.get(l.assigned_to) ?? 0) + 1);
    }

    const rows: LeaderRow[] = (members ?? []).map((m) => {
      const name = m.display_name || m.name || m.email?.split('@')[0] || 'Team member';
      return {
        userId: m.id,
        name,
        initials: initialsOf(name),
        calls: callCount.get(m.id) ?? 0,
        conversions: conversionCount.get(m.id) ?? 0,
        isMe: m.id === myUserId,
      };
    });

    rows.sort((a, b) => {
      if (b.calls !== a.calls) return b.calls - a.calls;
      if (b.conversions !== a.conversions) return b.conversions - a.conversions;
      return a.name.localeCompare(b.name);
    });

    return rows;
  },
};
