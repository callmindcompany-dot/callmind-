import { supabaseAdmin } from '../lib/dbAdapter';
import { logger } from '../lib/logger';
import { AuditService } from './audit.service';

export type NotificationType =
  | 'lead_assigned'
  | 'lead_updated'
  | 'followup_reminder'
  | 'meeting_reminder'
  | 'task_reminder'
  | 'approval_required'
  | 'approval_completed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'payment_received'
  | 'invoice_generated'
  | 'ticket_assigned'
  | 'ticket_escalated'
  | 'renewal_reminder'
  | 'mention'
  | 'system_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateNotificationDTO {
  companyId: string;
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title?: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  templateVars?: Record<string, string>;
  expiresInDays?: number;
}

export interface GetNotificationsFilter {
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  search?: string;
  category?: 'all' | 'unread' | 'leads' | 'calls' | 'payments' | 'tasks' | 'system';
  limit?: number;
  offset?: number;
}

// In-Memory Rate Limiter for Spam Control (20 notifications / 10 sec per user)
const userNotificationRateTracker = new Map<string, { count: number; resetAt: number }>();

export class NotificationService {
  /**
   * Enterprise Multi-Tier Notification Dispatcher
   * Validates RBAC permissions, DND Quiet Hours, Rate Limiting, Template Parsing, and Deep Links.
   */
  static async createNotification(dto: CreateNotificationDTO) {
    try {
      // 1. RATE LIMITING & SPAM CONTROL (Max 20 notifs / 10s per user)
      const now = Date.now();
      const rateKey = `${dto.companyId}:${dto.userId}`;
      const tracker = userNotificationRateTracker.get(rateKey) || { count: 0, resetAt: now + 10000 };

      if (now > tracker.resetAt) {
        tracker.count = 0;
        tracker.resetAt = now + 10000;
      }

      tracker.count++;
      userNotificationRateTracker.set(rateKey, tracker);

      if (tracker.count > 20 && dto.priority !== 'urgent') {
        logger.warn(`[NotificationService] Rate limit exceeded for user ${dto.userId}. Non-urgent notification throttled.`);
        return null;
      }

      // 2. RBAC PERMISSION CHECK: Block Financial notifications for Telecallers
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', dto.userId)
        .maybeSingle();

      if (targetUser?.role === 'telecaller' && ['payment_received', 'invoice_generated', 'renewal_reminder'].includes(dto.type)) {
        logger.warn(`[NotificationService] Blocked financial notification ${dto.type} for telecaller user ${dto.userId}`);
        return null;
      }

      // 3. MULTI-TIER PREFERENCES (User Level ➔ Role Level ➔ Company Default)
      let pref = await this.getEffectivePreferences(dto.companyId, dto.userId, targetUser?.role || 'telecaller', dto.type);

      if (pref && !pref.in_app_enabled && dto.priority !== 'urgent') {
        logger.info(`[NotificationService] Notification skipped per user preference: ${dto.type}`);
        return null;
      }

      // 4. QUIET HOURS / DND CHECK (10 PM to 8 AM)
      let isDndActive = false;
      if (pref?.dnd_enabled) {
        const currentHour = new Date().getHours(); // 0-23
        // Default DND: 22 (10 PM) to 8 (8 AM)
        if (currentHour >= 22 || currentHour < 8) {
          isDndActive = true;
        }
      }

      // If DND is active and notification is non-urgent, withhold push/in-app alert
      if (isDndActive && dto.priority !== 'urgent') {
        logger.info(`[NotificationService] DND Active. Non-urgent notification queued silently for user ${dto.userId}`);
      }

      let title = dto.title || '';
      let body = dto.body || '';
      let priority = dto.priority || 'medium';
      let actionUrl = dto.actionUrl || '';

      // 5. TEMPLATE LOAD & CUSTOMIZATION (Company Template ➔ System Template)
      if ((!title || !body) && dto.type) {
        const template = await this.getEffectiveTemplate(dto.companyId, dto.type);
        if (template) {
          title = title || template.title_template;
          body = body || template.body_template;
          priority = dto.priority || template.default_priority || 'medium';
          actionUrl = actionUrl || template.default_action_url || '';

          // Interpolate {{vars}}
          if (dto.templateVars) {
            Object.entries(dto.templateVars).forEach(([key, val]) => {
              title = title.replace(new RegExp(`{{${key}}}`, 'g'), val);
              body = body.replace(new RegExp(`{{${key}}}`, 'g'), val);
              actionUrl = actionUrl.replace(new RegExp(`{{${key}}}`, 'g'), val);
            });
          }
        }
      }

      // 6. DEEP LINKING RESOLUTION
      actionUrl = this.resolveDeepLink(dto.type, actionUrl, dto.metadata);

      // Expiry Date (Default 90 days)
      const expiryDays = dto.expiresInDays || 90;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      // 7. DATABASE INSERTION
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          company_id: dto.companyId,
          user_id: dto.userId,
          type: dto.type,
          priority: priority,
          title: title || 'System Notification',
          body: body || 'You have a new update.',
          action_url: actionUrl,
          metadata: dto.metadata || {},
          is_read: false,
          is_archived: false,
          is_pinned: false,
          expires_at: expiresAt,
          delivery_status: {
            in_app: isDndActive ? 'queued_dnd' : 'delivered',
            mobile_push: pref?.mobile_push_enabled && !isDndActive ? 'pending' : 'disabled',
            email: pref?.email_enabled ? 'pending' : 'disabled',
            whatsapp: pref?.whatsapp_enabled ? 'pending' : 'disabled',
            retries: 0
          },
        })
        .select()
        .single();

      if (error) {
        logger.error('[NotificationService] Insert error:', error);
        throw error;
      }

      // 8. AUDIT LOG INTEGRATION
      await AuditService.logEvent({
        action: 'NOTIFICATION_CREATED',
        targetId: notification.id,
        targetType: 'notifications',
        details: { type: dto.type, priority }
      }).catch((): null => null);

      logger.info(`[NotificationService] Created notification ${notification.id} for user ${dto.userId}`);
      return notification;
    } catch (err: any) {
      logger.error('[NotificationService] Failed to create notification:', err);
      throw err;
    }
  }

  /**
   * Deep Link Resolver (Maps Notification Type to Exact UI Screen Route)
   */
  private static resolveDeepLink(type: NotificationType, rawUrl: string, metadata?: Record<string, any>): string {
    if (rawUrl && rawUrl.length > 0) return rawUrl;
    if (!metadata) return '/dashboard';

    if (metadata.lead_id || metadata.leadId) {
      return `/leads?id=${metadata.lead_id || metadata.leadId}`;
    }
    if (metadata.invoice_number || metadata.invoiceId) {
      return `/billing?invoice=${metadata.invoice_number || metadata.invoiceId}`;
    }
    if (metadata.ticket_id || metadata.ticketId) {
      return `/support?ticketId=${metadata.ticket_id || metadata.ticketId}`;
    }
    if (metadata.call_id || metadata.callId) {
      return `/calls?id=${metadata.call_id || metadata.callId}`;
    }

    return '/dashboard';
  }

  /**
   * Multi-Tier Preference Hierarchy (User Specific ➔ Role Default ➔ Company Default)
   */
  private static async getEffectivePreferences(companyId: string, userId: string, role: string, type: NotificationType) {
    // 1. Try User-Level Specific Preference
    const { data: userPref } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle();

    if (userPref) return userPref;

    // 2. Try Role-Level Default Preference
    const { data: rolePref } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .eq('role_scope', role)
      .eq('type', type)
      .maybeSingle();

    if (rolePref) return rolePref;

    // 3. Try Company-Level Global Default
    const { data: compPref } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_company_default', true)
      .eq('type', type)
      .maybeSingle();

    return compPref || null;
  }

  /**
   * Template Fallback Hierarchy (Company Custom Template ➔ System Default Template)
   */
  private static async getEffectiveTemplate(companyId: string, type: NotificationType) {
    // 1. Try Company Specific Customized Template
    const { data: compTemp } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', type)
      .maybeSingle();

    if (compTemp) return compTemp;

    // 2. Try System Global Template
    const { data: sysTemp } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .is('company_id', null)
      .eq('type', type)
      .maybeSingle();

    return sysTemp || null;
  }

  /**
   * Query Notifications with Search, Filters, and Pagination
   */
  static async getNotifications(companyId: string, userId: string, filter: GetNotificationsFilter = {}) {
    const limit = Math.min(filter.limit || 20, 100);
    const offset = filter.offset || 0;

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (filter.isArchived !== undefined) {
      query = query.eq('is_archived', filter.isArchived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filter.category === 'unread' || filter.isRead === false) {
      query = query.eq('is_read', false);
    } else if (filter.category === 'leads') {
      query = query.in('type', ['lead_assigned', 'lead_updated']);
    } else if (filter.category === 'calls') {
      query = query.in('type', ['followup_reminder', 'meeting_reminder']);
    } else if (filter.category === 'payments') {
      query = query.in('type', ['payment_received', 'invoice_generated', 'renewal_reminder']);
    } else if (filter.category === 'tasks') {
      query = query.in('type', ['task_reminder', 'approval_required', 'approval_completed', 'ticket_assigned', 'ticket_escalated']);
    } else if (filter.category === 'system') {
      query = query.in('type', ['workflow_completed', 'workflow_failed', 'system_alert', 'mention']);
    }

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.priority) query = query.eq('priority', filter.priority);
    if (filter.isPinned !== undefined) query = query.eq('is_pinned', filter.isPinned);

    if (filter.search && filter.search.trim()) {
      const s = filter.search.trim();
      query = query.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      notifications: data || [],
      totalCount: count || 0,
      limit,
      offset,
      hasMore: (offset + (data?.length || 0)) < (count || 0)
    };
  }

  /**
   * Fast Unread Counter
   */
  static async getUnreadCount(companyId: string, userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false);

    if (error) return 0;
    return count || 0;
  }

  /**
   * Mark as Read
   */
  static async markAsRead(companyId: string, userId: string, notificationIds: string[]) {
    if (!notificationIds || notificationIds.length === 0) return { updatedCount: 0 };
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .in('id', notificationIds)
      .select();

    if (error) throw error;
    return { updatedCount: data?.length || 0 };
  }

  /**
   * Mark All Unread as Read
   */
  static async markAllAsRead(companyId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false)
      .select();

    if (error) throw error;
    return { updatedCount: data?.length || 0 };
  }

  /**
   * Toggle Pin
   */
  static async togglePin(companyId: string, userId: string, notificationId: string) {
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('is_pinned')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('id', notificationId)
      .single();

    if (!existing) throw new Error('Notification not found.');
    const nextPinned = !existing.is_pinned;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_pinned: nextPinned,
        pinned_at: nextPinned ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Archive
   */
  static async archiveNotifications(companyId: string, userId: string, notificationIds: string[]) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .in('id', notificationIds)
      .select();

    if (error) throw error;
    return { archivedCount: data?.length || 0 };
  }

  /**
   * Delete
   */
  static async deleteNotifications(companyId: string, userId: string, notificationIds: string[]) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .in('id', notificationIds)
      .select();

    if (error) throw error;
    return { deletedCount: data?.length || 0 };
  }

  /**
   * SLA Breach & Escalation Trigger Helper
   */
  static async triggerSlaBreachAlert(companyId: string, managerUserId: string, entityType: string, entityId: string, entityName: string) {
    return this.createNotification({
      companyId,
      userId: managerUserId,
      type: 'ticket_escalated',
      priority: 'urgent',
      title: `🔥 SLA Breach Alert: ${entityType}`,
      body: `${entityType} "${entityName}" breached SLA target and requires immediate attention.`,
      metadata: { entityType, entityId },
      templateVars: { ticket_id: entityId, subject: entityName }
    });
  }

  /**
   * Get User Preferences
   */
  static async getUserPreferences(companyId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update Preference
   */
  static async updatePreference(
    companyId: string,
    userId: string,
    type: NotificationType,
    preferences: {
      in_app_enabled?: boolean;
      mobile_push_enabled?: boolean;
      email_enabled?: boolean;
      whatsapp_enabled?: boolean;
      dnd_enabled?: boolean;
    }
  ) {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({
        company_id: companyId,
        user_id: userId,
        type,
        ...preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,user_id,type' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
