import { supabase } from './supabase';
import type { CallbackItem } from '../screens/CallbacksScreen';

/**
 * Scheduled follow-ups, from the table that holds them.
 *
 * The app used to derive its "callbacks" from the `calls` table — rows whose
 * outcome happened to be 'Call Back' — and never touched `public.callbacks` at
 * all. Two consequences, both bad:
 *
 *   A follow-up scheduled on the web, with a date and time an admin chose,
 *   never reached the telecaller who had to make it. It went into `callbacks`;
 *   the phone was reading `calls`.
 *
 *   What the phone did show had no scheduled time. It was a list of past calls
 *   that ended in "call back", ordered by when the call happened, which says
 *   nothing about when to ring back.
 *
 * Both apps now mean the same thing by the word.
 */

/** Status values the schema's CHECK constraint allows. */
export type CallbackStatus = 'Pending' | 'Completed' | 'Paused';

interface CallbackRow {
  id: string;
  company_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  reminder_date: string;
  notes: string | null;
  status: string;
  created_at: string;
  lead?: { id: string; name: string | null; phone: string | null } | null;
}

function getInitials(name: string): string {
  if (!name) return 'LD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function describeWhen(iso: string): { label: string; isToday: boolean; isOverdue: boolean } {
  const when = new Date(iso);
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToday = when >= startOfToday && when < startOfTomorrow;
  const isOverdue = when < now;

  if (isOverdue && !isToday) return { label: `Overdue — ${when.toLocaleDateString()} ${time}`, isToday: false, isOverdue };
  if (isToday) return { label: isOverdue ? `Due — ${time}` : `Today, ${time}`, isToday: true, isOverdue };
  if (when < new Date(startOfTomorrow.getTime() + 86400000)) return { label: `Tomorrow, ${time}`, isToday: false, isOverdue: false };
  return { label: `${when.toLocaleDateString()}, ${time}`, isToday: false, isOverdue: false };
}

export const callbackService = {
  /**
   * Pending callbacks assigned to this agent, soonest first.
   *
   * Throws. The old version returned [] on failure, which the screen rendered
   * as "no callbacks scheduled" — a telecaller would have finished the day
   * believing they had none.
   */
  async fetchCallbacks(companyId: string, userEmail: string): Promise<CallbackItem[]> {
    if (!companyId || !userEmail) return [];

    const { data, error } = await supabase
      .from('callbacks')
      .select('*, lead:leads (id, name, phone)')
      .eq('company_id', companyId)
      .eq('assigned_to', userEmail)
      .eq('status', 'Pending')
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: CallbackRow) => {
      const when = describeWhen(row.reminder_date);
      const name = row.lead?.name || 'Lead unavailable';
      return {
        id: row.id,
        leadId: row.lead_id ?? undefined,
        name,
        phone: row.lead?.phone || '',
        time: when.label,
        note: row.notes || 'Follow-up scheduled.',
        initials: getInitials(name),
        // Overdue reads red, everything else amber. The colour is the only
        // signal a telecaller gets that they are already late.
        avatarBg: when.isOverdue ? '#fee2e2' : '#fef3c7',
        avatarColor: when.isOverdue ? '#dc2626' : '#d97706',
        isToday: when.isToday,
        isOverdue: when.isOverdue,
        reminderDate: row.reminder_date,
      };
    });
  },

  /**
   * Schedule a follow-up. Written to `callbacks`, so the web sees it too.
   *
   * assigned_to holds the agent's email, matching CallsPage and the
   * log_manual_call RPC. It is the one identifier both apps agree on.
   */
  async scheduleCallback(input: {
    companyId: string;
    leadId: string;
    agentEmail: string;
    reminderDate: string;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('callbacks').insert({
      company_id: input.companyId,
      lead_id: input.leadId,
      assigned_to: input.agentEmail,
      reminder_date: input.reminderDate,
      notes: input.notes ?? null,
      status: 'Pending' satisfies CallbackStatus,
    });

    if (error) throw error;
  },

  /** Mark one done, once the agent has actually made the call. */
  async completeCallback(callbackId: string, companyId: string): Promise<void> {
    const { error, count } = await supabase
      .from('callbacks')
      .update({ status: 'Completed' satisfies CallbackStatus }, { count: 'exact' })
      .eq('id', callbackId)
      .eq('company_id', companyId);

    if (error) throw error;
    if (!count) throw new Error('That follow-up is no longer there — it may have been completed already.');
  },

  /** Push a follow-up later. */
  async snoozeCallback(callbackId: string, companyId: string, until: Date): Promise<void> {
    const { error, count } = await supabase
      .from('callbacks')
      .update({ reminder_date: until.toISOString() }, { count: 'exact' })
      .eq('id', callbackId)
      .eq('company_id', companyId);

    if (error) throw error;
    if (!count) throw new Error('That follow-up is no longer there.');
  },
};
