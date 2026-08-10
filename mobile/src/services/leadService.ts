import { supabase } from './supabase';
import { LeadItem } from '../screens/LeadListScreen';

/**
 * Format initials from full name (e.g. "Rahul Sharma" -> "RS")
 */
function getInitials(name: string): string {
  if (!name) return 'LD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Helper to compute status badge styling
 */
function getStatusBadgeStyle(status: string): { tag: string; color: string; bgColor: string } {
  switch (status?.toLowerCase()) {
    case 'new':
      return { tag: 'New', color: '#2563eb', bgColor: '#eff6ff' };
    case 'contacted':
      return { tag: 'Contacted', color: '#0284c7', bgColor: '#f0f9ff' };
    case 'interested':
      return { tag: 'Interested', color: '#16a34a', bgColor: '#f0fdf4' };
    case 'call back':
    case 'call back later':
      return { tag: 'Follow-up', color: '#d97706', bgColor: '#fffbeb' };
    case 'converted':
      return { tag: 'Converted', color: '#059669', bgColor: '#ecfdf5' };
    case 'not interested':
    case 'rejected':
      return { tag: 'Closed', color: '#dc2626', bgColor: '#fef2f2' };
    default:
      return { tag: status || 'Lead', color: '#475569', bgColor: '#f8fafc' };
  }
}

/**
 * Format timestamp into readable string (e.g. "10:30 AM" or "Yesterday")
 */
function formatTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

export interface RawDbLead {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  assigned_to?: string;
  source?: string;
  priority?: string;
  city?: string;
  state?: string;
  address?: string;
  comment?: string;
  created_at: string;
  updated_at?: string;
  /** Set on every call. Used to sink a just-attempted lead down its band. */
  last_contact_at?: string | null;
}


/** One shape for a lead row, wherever it was read from. */
function toLeadItem(row: RawDbLead): LeadItem {
  const badge = getStatusBadgeStyle(row.status);
  return {
    id: row.id,
    name: row.name || 'Unnamed Lead',
    phone: row.phone || '',
    city: row.address || row.source || 'General',
    tag: badge.tag,
    time: formatTime(row.created_at),
    createdAt: row.created_at,
    color: badge.color,
    bgColor: badge.bgColor,
    initials: getInitials(row.name),
    status: row.status,
    email: row.email,
    priority: row.priority,
    address: row.address,
    comment: row.comment,
    lastContactAt: row.last_contact_at ?? null,
  };
}

export const leadService = {
  /**
   * Fetch leads assigned to current telecaller user in company
   */
  async fetchAssignedLeads(companyId: string, userId: string): Promise<LeadItem[]> {
    if (!companyId || !userId) return [];

    // Throws. The try/catch here returned [] on any failure, which renders as
    // "you have no leads today" -- an agent would take that at face value and
    // stop working.
    //
    // No ordering clause: the list is ordered by call priority in
    // src/services/priorityQueue.ts. It used to be created_at descending, which
    // is import order.
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .eq('assigned_to', userId)
      .eq('is_deleted', false);

    if (error) throw error;

    return ((data ?? []) as RawDbLead[]).map(toLeadItem);
  },

  /**
   * Update status of lead and record activity log
   */
  async updateLeadStatus(
    companyId: string,
    userId: string,
    leadId: string,
    newStatus: string,
    oldStatus?: string
  ): Promise<boolean> {
    if (!companyId || !leadId) return false;

    try {
      // 1. Update lead status
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('[leadService] Failed updating lead status:', updateError);
        return false;
      }

      // 2. Insert into lead_activity_log
      const { error: logError } = await supabase.from('lead_activity_log').insert({
        company_id: companyId,
        lead_id: leadId,
        activity_type: 'status_change',
        description: `Lead status updated to ${newStatus}`,
        created_by: userId,
        from_status: oldStatus || null,
        to_status: newStatus,
      });

      if (logError) {
        console.warn('[leadService] Warning inserting activity log:', logError);
      }

      return true;
    } catch (err) {
      console.error('[leadService] Exception in updateLeadStatus:', err);
      return false;
    }
  },

  /**
   * Adds a lead this agent found themselves.
   *
   * There was no way to do this from the phone. Leads arrived by webhook or by
   * the admin importing a file, so a telecaller given a number by a customer,
   * a colleague or a walk-in had nowhere to put it -- they wrote it on paper,
   * and the CRM never learned about the call they made from it.
   *
   * leads.id is TEXT, not a uuid with a default, so the id is generated here.
   * The prefix marks where the lead came from, which the admin can see.
   *
   * Assigned to the agent who added it. They are the one who is going to call
   * it, and an unassigned lead sitting in the company pool is how a referral
   * gets forgotten.
   *
   * Throws. trg_enforce_lead_limit raises P0001 when the plan's lead limit is
   * reached, and the caller needs the message rather than a silent failure.
   */
  async createLead(input: {
    companyId: string;
    userId: string;
    name: string;
    phone: string;
    email?: string;
    city?: string;
    comment?: string;
    priority?: string;
  }): Promise<string> {
    const name = input.name.trim();
    const phone = input.phone.replace(/[^\d+]/g, '');
    if (!name) throw new Error('A name is needed.');
    if (phone.replace(/\D/g, '').length < 10) throw new Error('That does not look like a phone number.');

    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase.from('leads').insert({
      id,
      company_id: input.companyId,
      name,
      phone,
      email: input.email?.trim() || null,
      address: input.city?.trim() || null,
      comment: input.comment?.trim() || null,
      status: 'New',
      priority: input.priority || 'Medium',
      source: 'added_by_agent',
      assigned_to: input.userId,
      is_deleted: false,
      is_unseen: false,
    });

    if (error) throw error;
    return id;
  },

  /**
   * Corrects a lead's details.
   *
   * Every Edit control on LeadDetailScreen had no handler, so an agent who
   * learned the correct spelling of a name or a working email address on a call
   * had no way to record it, and the next person to ring dialled the same wrong
   * number.
   *
   * Only the fields a telecaller can genuinely know are writable. Status is not
   * among them: it is set by the post-call form, beside the call that justifies
   * it.
   */
  async updateLeadDetails(
    companyId: string,
    leadId: string,
    fields: { name?: string; phone?: string; email?: string; city?: string; comment?: string; priority?: string },
  ): Promise<void> {
    if (!companyId || !leadId) throw new Error('Missing company or lead id.');

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) {
      const n = fields.name.trim();
      if (!n) throw new Error('A name is needed.');
      patch.name = n;
    }
    if (fields.phone !== undefined) {
      const p = fields.phone.replace(/[^\d+]/g, '');
      if (p.replace(/\D/g, '').length < 10) throw new Error('That does not look like a phone number.');
      patch.phone = p;
    }
    if (fields.email !== undefined) patch.email = fields.email.trim() || null;
    if (fields.city !== undefined) patch.address = fields.city.trim() || null;
    if (fields.comment !== undefined) patch.comment = fields.comment.trim() || null;
    if (fields.priority !== undefined) patch.priority = fields.priority;

    const { error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', leadId)
      .eq('company_id', companyId);

    if (error) throw error;
  },

  /**
   * Records the result of a call against the lead itself.
   *
   * This is what the post-call sheet was missing. It wrote to `calls` and
   * `callbacks` and never touched `leads`, so the status stayed 'New' and the
   * lead kept its place in the queue -- the agent scrolled past people they had
   * already spoken to for the rest of the day.
   *
   * Throws, unlike updateLeadStatus above, which returns false and leaves the
   * caller to notice. An agent who has filled the form and seen it close
   * believes the call is recorded; if the write failed they need to be told
   * while the lead is still in front of them.
   */
  async recordCallOutcome(
    companyId: string,
    userId: string,
    leadId: string,
    newStatus: string,
    oldStatus?: string,
  ): Promise<void> {
    if (!companyId || !leadId) throw new Error('Missing company or lead id.');

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        // Sinks the lead below ones nobody has tried yet. There is no retry
        // scheduler in this app, so this column is the whole mechanism.
        last_contact_at: now,
        updated_at: now,
      })
      .eq('id', leadId)
      .eq('company_id', companyId);

    if (error) throw error;

    // The activity trail is useful but not worth failing the call log over --
    // the outcome is already saved by the time this runs.
    const { error: logError } = await supabase.from('lead_activity_log').insert({
      company_id: companyId,
      lead_id: leadId,
      activity_type: 'status_change',
      description: `Call logged — ${newStatus}`,
      created_by: userId,
      from_status: oldStatus || null,
      to_status: newStatus,
    });
    if (logError) console.warn('[leadService] activity log not written:', logError);
  },

  /**
   * Search this agent's leads by name, phone or email.
   *
   * A digits-only term is treated as a phone fragment and matched with a
   * left-anchored LIKE, which the (company_id, phone) index can serve. Anything
   * else goes to ilike on name and email. Row-level security scopes the result
   * to what this agent may see, so there is nothing to filter afterwards.
   *
   * Throws. An empty list from a failed query reads as "no such lead", and the
   * agent concludes the record is not in the CRM.
   */
  async searchLeads(companyId: string, term: string, limit = 25): Promise<LeadItem[]> {
    if (!companyId || term.trim().length < 2) return [];

    const raw = term.trim();
    const digits = raw.replace(/\D/g, '');
    const isPhone = digits.length >= 4 && digits.length === raw.replace(/[\s+\-()]/g, '').length;

    let query = supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .limit(limit);

    query = isPhone
      ? query.ilike('phone', `%${digits}%`)
      : query.or(`name.ilike.%${raw}%,email.ilike.%${raw}%`);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(toLeadItem);
  },
};
