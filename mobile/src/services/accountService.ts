import { supabase } from './supabase';

/**
 * Deleting your own account, from inside the app.
 *
 * The Play Store requires this of any app that creates accounts, and CallMind
 * had no path at all -- the privacy policy said to write to the grievance
 * address, which does not pass review.
 *
 * Both calls go to SECURITY DEFINER functions added by
 * 20260818000000_account_deletion.sql. The work is in Postgres rather than here
 * on purpose: a client cannot delete its own auth row, and twenty-three tables
 * carry a column naming a user, so doing this from the app would mean twenty-odd
 * round trips with no transaction around them. A half-finished deletion is worse
 * than none.
 *
 * The web app's version is the counter-example. It fires six deletes, checks the
 * result of none of them, and reports success regardless -- so it usually
 * claimed to have deleted data that row-level security had refused to touch.
 */

/** Machine-readable codes the two functions raise in the DETAIL of a P0001. */
export type DeletionBlock = 'LAST_ADMIN' | 'NO_SESSION' | 'NO_PROFILE' | 'CONFIRM_MISMATCH';

export interface DeletionPreview {
  email: string;
  role: string | null;
  /** Leads that go back to the company unassigned. */
  leadsToReturn: number;
  /** Call records the company keeps, with this agent's name taken off. */
  callsKept: number;
  /** Attendance rows, which are removed with the account. */
  attendanceDays: number;
  otherMembers: number;
  /** Set when deletion is refused outright. Today only LAST_ADMIN. */
  blocked: DeletionBlock | null;
}

/**
 * Pulls the machine code out of a Postgres P0001.
 *
 * The functions raise a user-safe MESSAGE and a JSON DETAIL, the same shape
 * src/lib/planErrors.ts parses on the web:
 *   DETAIL = '{"code":"LAST_ADMIN"}'
 */
export function deletionBlockOf(error: unknown): DeletionBlock | null {
  const details = (error as { details?: string } | null)?.details;
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as { code?: string };
    return (parsed.code as DeletionBlock) ?? null;
  } catch {
    return null;
  }
}

export const accountService = {
  /**
   * What deletion would do, before the agent commits to it.
   *
   * Throws. Showing the confirmation screen with zeroes because the count query
   * failed would tell someone they have nothing to lose, which is the one thing
   * this screen must never get wrong.
   */
  async preview(): Promise<DeletionPreview> {
    const { data, error } = await supabase.rpc('account_deletion_preview');
    if (error) throw error;

    const row = data as {
      email: string;
      role: string | null;
      leads_to_return: number;
      calls_kept: number;
      attendance_days: number;
      other_members: number;
      blocked: DeletionBlock | null;
    };

    return {
      email: row.email,
      role: row.role,
      leadsToReturn: row.leads_to_return,
      callsKept: row.calls_kept,
      attendanceDays: row.attendance_days,
      otherMembers: row.other_members,
      blocked: row.blocked,
    };
  },

  /**
   * Deletes the account. There is no undo and no grace period.
   *
   * `confirm` must be the literal 'DELETE'. The function checks it too, so the
   * RPC cannot be fired by accident from a console with no argument -- pg_cron
   * is not installed on this database, so a "deleting in 7 days" timer would be
   * a promise with nothing behind it to keep.
   *
   * Returns how many leads went back to the company, which is what the agent
   * most wants confirmed.
   */
  async deleteAccount(confirm: string): Promise<{ leadsReturned: number }> {
    const { data, error } = await supabase.rpc('delete_my_account', { p_confirm: confirm });
    if (error) throw error;

    const row = data as { deleted: boolean; leads_returned: number };
    return { leadsReturned: row.leads_returned };
  },
};
