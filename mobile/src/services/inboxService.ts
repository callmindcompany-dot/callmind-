import { supabase } from './supabase';

/**
 * The Inbox tab, from the tables behind it.
 *
 * 59_InboxScreen took no data at all. It rendered a hand-written array --
 * "Monthly Target Update", "Product Training Session", "Holiday Notice", "New
 * Leads Assigned", "Weekly Performance Update", dated May 2024 -- and rendered
 * it whichever tab was selected, under a red badge permanently reading 3. One
 * of the six bottom tabs was a picture of an inbox.
 *
 * Both tables were already there. `announcements` is what an admin broadcasts;
 * `notifications` is what the system sends one agent. Row-level security scopes
 * both to the caller's company.
 */

export interface InboxItem {
  id: string;
  title: string;
  /** Body text. Announcements carry the whole thing; notifications a summary. */
  body: string;
  /** ISO. Formatted for display by the screen, so sorting stays honest. */
  at: string;
  isRead: boolean;
  isPinned: boolean;
  category: string;
}

/** Rows an agent should never see, whatever the query returns. */
const HIDDEN_ROLES = new Set(['admin', 'founder', 'owner']);

export const inboxService = {
  /**
   * Published announcements for this company.
   *
   * Throws. An inbox that renders empty after a failed query tells an agent
   * their manager has said nothing, which is exactly the message a broadcast
   * system must never send by accident.
   *
   * Read receipts come from `announcement_reads`, which is keyed by the auth
   * uuid rather than the text user id -- the two are the same string, but the
   * column is uuid and will reject anything that is not one.
   */
  async announcements(companyId: string, userId: string): Promise<InboxItem[]> {
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, category, target_role, is_pinned, published_at, created_at, is_archived, is_published')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    let readIds = new Set<string>();
    if (userId) {
      const { data: reads, error: readError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);
      // Not thrown. Everything shows as unread if this fails, which is the safe
      // direction -- an unread badge is a nuisance, a hidden announcement is not.
      if (readError) console.warn('[inboxService] read receipts unavailable:', readError.message);
      else readIds = new Set((reads ?? []).map((r) => r.announcement_id));
    }

    return (data ?? [])
      .filter((a) => a.is_published !== false && a.is_archived !== true)
      .filter((a) => !a.target_role || !HIDDEN_ROLES.has(String(a.target_role).toLowerCase()))
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.content ?? '',
        at: a.published_at ?? a.created_at,
        isRead: readIds.has(a.id),
        isPinned: a.is_pinned === true,
        category: a.category ?? 'general',
      }));
  },

  /** This agent's own notifications. Throws, for the same reason. */
  async notifications(companyId: string, userId: string): Promise<InboxItem[]> {
    if (!companyId || !userId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, is_read, is_pinned, is_archived, type, created_at, expires_at')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const now = Date.now();
    return (data ?? [])
      .filter((n) => n.is_archived !== true)
      .filter((n) => !n.expires_at || Date.parse(n.expires_at) > now)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? '',
        at: n.created_at,
        isRead: n.is_read === true,
        isPinned: n.is_pinned === true,
        category: String(n.type ?? 'general'),
      }));
  },

  /**
   * Marks an announcement read.
   *
   * Never throws. Opening something is not an action the agent asked to have
   * recorded, and failing the navigation because a receipt did not save would
   * be a worse outcome than a badge that stays lit.
   */
  async markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
    if (!announcementId || !userId) return;
    const { error } = await supabase
      .from('announcement_reads')
      .upsert({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() },
              { onConflict: 'announcement_id,user_id' });
    if (error) console.warn('[inboxService] read receipt not saved:', error.message);
  },
};
