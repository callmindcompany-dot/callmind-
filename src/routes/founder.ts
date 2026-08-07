import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { supabaseAdmin } from '../lib/dbAdapter';
import { authGuard } from '../middleware/authGuard';
import { logger } from '../lib/logger';
import { FOUNDER_OWNERS } from '../constants';

const router = express.Router();

/**
 * Cross-tenant reads for the Founder Hub.
 *
 * These used to happen straight from the browser: `useOrganizationTenants`
 * selected from `organization_tenants_view`, and `useFounderHooks` selected
 * every row of `support_tickets` with no company filter. Both worked only
 * because those tables had no tenant isolation -- which meant every ordinary
 * customer could run the same two queries from devtools and read the whole
 * platform.
 *
 * Closing that (20260730_rls_gap_closure.sql for the view,
 * 20260814000000_close_permissive_policies.sql for the tickets) is what made
 * this router necessary. The privileged read now happens on the server, behind
 * a check the browser cannot influence.
 */

const founderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests' },
});

router.use(founderLimiter);
router.use(authGuard);

/**
 * Platform ownership is the email allow-list, never `role === 'founder'`.
 *
 * Every customer is given the founder role on signup -- it is what
 * distinguishes the person who created the company from the telecallers they
 * invite. Treating it as a platform privilege is how the impersonation function
 * came to accept any customer.
 *
 * Fails closed: an unset INTERNAL_TEAM_EMAILS means nobody, not everybody.
 */
function requirePlatformOwner(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const email = String((req as any).user?.email || '').trim().toLowerCase();

  if (FOUNDER_OWNERS.length === 0) {
    logger.error('[Founder API] INTERNAL_TEAM_EMAILS is not set — refusing all cross-tenant access');
    res.status(503).json({ error: 'Platform administration is not configured' });
    return;
  }

  if (!email || !FOUNDER_OWNERS.map((e: string) => e.toLowerCase()).includes(email)) {
    logger.warn('[Founder API] Cross-tenant request denied', {
      actor: (req as any).user?.id,
      email: email || '(none)',
      path: req.path,
    });
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}

router.use(requirePlatformOwner);

/**
 * GET /api/founder/tenants
 *
 * organization_tenants_view is security_invoker, so reading it as the caller
 * would return only their own company. supabaseAdmin holds the service role,
 * which bypasses RLS — that is the point, and it is safe precisely because
 * requirePlatformOwner ran first.
 */
router.get('/tenants', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const perPage = 50;
    const search = String(req.query.search ?? '').trim();
    const plan = String(req.query.plan ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    let query = supabaseAdmin
      .from('organization_tenants_view')
      .select('*', { count: 'exact' });

    if (search) query = query.ilike('name', `%${search}%`);
    if (plan && plan !== 'all') query = query.eq('plan', plan);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, count, error } = await query
      .order('name', { ascending: true })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) throw error;

    res.json({ tenants: data ?? [], totalCount: count ?? 0 });
  } catch (err: any) {
    logger.error('[Founder API Tenants Error]:', err);
    res.status(500).json({ error: 'Failed to load tenants' });
  }
});

/**
 * GET /api/founder/tenants/export
 *
 * The CSV export ran the same unfiltered query from the browser. Paging is
 * dropped here because an export is meant to be complete, but the row cap
 * stays: an unbounded select on the whole platform is a way to take the
 * database down by accident.
 */
router.get('/tenants/export', async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const plan = String(req.query.plan ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    let query = supabaseAdmin.from('organization_tenants_view').select('*');

    if (search) query = query.ilike('name', `%${search}%`);
    if (plan && plan !== 'all') query = query.eq('plan', plan);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query.order('name', { ascending: true }).limit(5000);
    if (error) throw error;

    res.json({ tenants: data ?? [] });
  } catch (err: any) {
    logger.error('[Founder API Tenant Export Error]:', err);
    res.status(500).json({ error: 'Failed to export tenants' });
  }
});

/**
 * GET /api/founder/support-tickets
 *
 * Tickets across every tenant, for the support inbox.
 */
router.get('/support-tickets', async (req, res) => {
  try {
    const status = String(req.query.status ?? '').trim();
    const priority = String(req.query.priority ?? '').trim();

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (status && status !== 'All') query = query.eq('status', status.toLowerCase());
    if (priority && priority !== 'All') query = query.eq('priority', priority.toLowerCase());

    // No search filter here on purpose. The caller searches across
    // company_name, user_email and description, which is a client-side filter
    // in useFounderTickets. Adding a single-column ilike would quietly return
    // a different set than the one the operator sees.

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tickets: data ?? [] });
  } catch (err: any) {
    logger.error('[Founder API Support Tickets Error]:', err);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

/**
 * PATCH /api/founder/support-tickets/:id/status
 *
 * Open <-> closed. The id is the only thing taken from the request, and the
 * status is derived here rather than accepted, so a malformed body cannot put
 * a ticket into a state the UI does not know about.
 */
router.patch('/support-tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const current = String(req.body?.currentStatus ?? '').toLowerCase();

    if (current !== 'open' && current !== 'closed') {
      return res.status(400).json({ error: 'currentStatus must be "open" or "closed"' });
    }

    const nextStatus = current === 'open' ? 'closed' : 'open';

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    logger.info('[Founder API] Support ticket status changed', {
      actor: (req as any).user?.email,
      ticketId: id,
      nextStatus,
    });

    res.json({ ticketId: id, nextStatus });
  } catch (err: any) {
    logger.error('[Founder API Ticket Status Error]:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

/** Ids arrive as an array from the browser; take only well-formed strings. */
function readIds(body: unknown): string[] {
  const raw = (body as any)?.ticketIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 500);
}

/** PATCH /api/founder/support-tickets/bulk-status */
router.patch('/support-tickets/bulk-status', async (req, res) => {
  try {
    const ids = readIds(req.body);
    const nextStatus = String(req.body?.nextStatus ?? '').toLowerCase();

    if (ids.length === 0) return res.status(400).json({ error: 'ticketIds must be a non-empty array' });
    if (nextStatus !== 'open' && nextStatus !== 'closed') {
      return res.status(400).json({ error: 'nextStatus must be "open" or "closed"' });
    }

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    logger.info('[Founder API] Bulk ticket status change', {
      actor: (req as any).user?.email, count: ids.length, nextStatus,
    });

    res.json({ updated: ids.length, nextStatus });
  } catch (err: any) {
    logger.error('[Founder API Bulk Status Error]:', err);
    res.status(500).json({ error: 'Failed to update tickets' });
  }
});

/**
 * DELETE /api/founder/support-tickets/:id
 *
 * Reports the row count back rather than assuming success, so the caller can
 * distinguish "deleted" from "was not there" -- the client already treats a
 * zero count as an error, and it stays true through the server.
 */
router.delete('/support-tickets/:id', async (req, res) => {
  try {
    const { error, count } = await supabaseAdmin
      .from('support_tickets')
      .delete({ count: 'exact' })
      .eq('id', req.params.id);

    if (error) throw error;

    logger.info('[Founder API] Support ticket deleted', {
      actor: (req as any).user?.email, ticketId: req.params.id, deleted: count ?? 0,
    });

    res.json({ deleted: count ?? 0 });
  } catch (err: any) {
    logger.error('[Founder API Ticket Delete Error]:', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

/** PATCH /api/founder/support-tickets/:id/notes — internal notes on a ticket. */
router.patch('/support-tickets/:id/notes', async (req, res) => {
  try {
    const notes = req.body?.notes;
    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'notes must be a string' });
    }

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update({ internal_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ ticketId: req.params.id });
  } catch (err: any) {
    logger.error('[Founder API Ticket Notes Error]:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

/** POST /api/founder/support-tickets/bulk-delete */
router.post('/support-tickets/bulk-delete', async (req, res) => {
  try {
    const ids = readIds(req.body);
    if (ids.length === 0) return res.status(400).json({ error: 'ticketIds must be a non-empty array' });

    const { error, count } = await supabaseAdmin
      .from('support_tickets')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (error) throw error;

    logger.info('[Founder API] Bulk ticket delete', {
      actor: (req as any).user?.email, requested: ids.length, deleted: count ?? 0,
    });

    res.json({ deleted: count ?? 0 });
  } catch (err: any) {
    logger.error('[Founder API Bulk Delete Error]:', err);
    res.status(500).json({ error: 'Failed to delete tickets' });
  }
});

export default router;
