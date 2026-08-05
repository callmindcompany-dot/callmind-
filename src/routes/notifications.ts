import { Router, Request, Response } from 'express';
import { NotificationService, GetNotificationsFilter, NotificationType } from '../services/notification.service';
import { logger } from '../lib/logger';
import { supabaseAdmin } from '../lib/dbAdapter';

const router = Router();

// Middleware: Authenticate User and Extract Auth Token & Company Scope
const authMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired authorization token.' });
    }

    // Get User Profile & Company Scope
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (profErr || !profile || !profile.company_id) {
      return res.status(403).json({ error: 'User does not belong to a valid active company tenant.' });
    }

    (req as any).user = user;
    (req as any).userProfile = profile;
    (req as any).companyId = profile.company_id;
    (req as any).userId = profile.id;
    (req as any).userRole = profile.role;

    next();
  } catch (err: any) {
    logger.error('[NotificationsRouter] Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication validation failure.' });
  }
};

router.use(authMiddleware as any);

/**
 * GET /api/notifications
 * List notifications for current authenticated tenant user
 * Supports search, filters, category tabs, and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const filter: GetNotificationsFilter = {
      type: req.query.type as NotificationType,
      priority: req.query.priority as any,
      isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined,
      isArchived: req.query.isArchived !== undefined ? req.query.isArchived === 'true' : false,
      isPinned: req.query.isPinned !== undefined ? req.query.isPinned === 'true' : undefined,
      search: req.query.search as string,
      category: (req.query.category as any) || 'all',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await NotificationService.getNotifications(companyId, userId, filter);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[NotificationsRouter] GET / error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Ultra-fast unread badge counter query
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const unreadCount = await NotificationService.getUnreadCount(companyId, userId);
    return res.status(200).json({ success: true, unreadCount });
  } catch (err: any) {
    logger.error('[NotificationsRouter] GET /unread-count error:', err);
    return res.status(500).json({ error: 'Failed to retrieve unread notification count.' });
  }
});

/**
 * POST /api/notifications
 * System / Admin API to trigger a notification
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userRole = (req as any).userRole;

    // Only Admin or Manager roles (or system internal calls) can create arbitrary notifications for users
    if (!['founder', 'sub_admin', 'floor_manager', 'team_lead'].includes(userRole)) {
      return res.status(403).json({ error: 'Role unauthorized to trigger custom notifications.' });
    }

    const { targetUserId, type, priority, title, body, actionUrl, metadata, templateVars } = req.body;

    if (!type || (!targetUserId && !req.body.userId)) {
      return res.status(400).json({ error: 'Missing required parameters: targetUserId and type are mandatory.' });
    }

    const notification = await NotificationService.createNotification({
      companyId,
      userId: targetUserId || req.body.userId,
      type,
      priority,
      title,
      body,
      actionUrl,
      metadata,
      templateVars,
    });

    return res.status(201).json({ success: true, notification });
  } catch (err: any) {
    logger.error('[NotificationsRouter] POST / error:', err);
    return res.status(500).json({ error: 'Failed to create notification.' });
  }
});

/**
 * PATCH /api/notifications/read
 * Mark single or batch of notifications as read
 */
router.patch('/read', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'notificationIds must be a non-empty array of UUIDs.' });
    }

    const result = await NotificationService.markAsRead(companyId, userId, notificationIds);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[NotificationsRouter] PATCH /read error:', err);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for tenant user as read
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const result = await NotificationService.markAllAsRead(companyId, userId);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[NotificationsRouter] PATCH /read-all error:', err);
    return res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

/**
 * PATCH /api/notifications/:id/pin
 * Toggle pin status of a notification
 */
router.patch('/:id/pin', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const notificationId = req.params.id;

    const notification = await NotificationService.togglePin(companyId, userId, notificationId);
    return res.status(200).json({ success: true, notification });
  } catch (err: any) {
    logger.error('[NotificationsRouter] PATCH /:id/pin error:', err);
    return res.status(500).json({ error: 'Failed to toggle pin status.' });
  }
});

/**
 * PATCH /api/notifications/archive
 * Batch archive notifications
 */
router.patch('/archive', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'notificationIds must be a non-empty array of UUIDs.' });
    }

    const result = await NotificationService.archiveNotifications(companyId, userId, notificationIds);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[NotificationsRouter] PATCH /archive error:', err);
    return res.status(500).json({ error: 'Failed to archive notifications.' });
  }
});

/**
 * DELETE /api/notifications
 * Batch delete notifications
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'notificationIds must be a non-empty array of UUIDs.' });
    }

    const result = await NotificationService.deleteNotifications(companyId, userId, notificationIds);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[NotificationsRouter] DELETE / error:', err);
    return res.status(500).json({ error: 'Failed to delete notifications.' });
  }
});

/**
 * GET /api/notifications/preferences
 * Fetch user notification preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const preferences = await NotificationService.getUserPreferences(companyId, userId);
    return res.status(200).json({ success: true, preferences });
  } catch (err: any) {
    logger.error('[NotificationsRouter] GET /preferences error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notification preferences.' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Upsert user notification preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const { type, in_app_enabled, mobile_push_enabled, email_enabled, whatsapp_enabled } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Missing required parameter: type.' });
    }

    const updated = await NotificationService.updatePreference(companyId, userId, type, {
      in_app_enabled,
      mobile_push_enabled,
      email_enabled,
      whatsapp_enabled
    });

    return res.status(200).json({ success: true, preference: updated });
  } catch (err: any) {
    logger.error('[NotificationsRouter] PUT /preferences error:', err);
    return res.status(500).json({ error: 'Failed to update notification preference.' });
  }
});

export default router;
