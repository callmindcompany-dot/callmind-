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
