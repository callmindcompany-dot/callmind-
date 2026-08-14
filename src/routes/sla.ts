import express from 'express';
import { SlaService } from '../services/sla.service';
import { logger } from '../lib/logger';
import { rateLimit } from 'express-rate-limit';
import { authGuard, AuthenticatedRequest } from '../middleware/authGuard';

const router = express.Router();

// Rate limiter for SLA endpoints
const slaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests to SLA service' },
});

router.use(slaLimiter);

/**
 * Every route here is authenticated, and the company is taken from the caller's
 * verified token -- never from the query string or the request body.
 *
 * These endpoints previously had no authentication at all. server.ts mounts
 * them with no middleware, and the handlers read `companyId` straight from the
 * request, so anyone who knew a company id could read that tenant's SLA
 * settings, change them, and -- through /check-breaches -- trigger a run that
 * reassigns its leads. No login required.
 */
router.use(authGuard);

/** The company the caller actually belongs to, per their verified token. */
function callerCompanyId(req: AuthenticatedRequest): string | undefined {
  return req.user?.company_id;
}

/** Changing SLA policy reassigns other people's leads; keep it to admins. */
const SLA_ADMIN_ROLES = ['admin', 'sub_admin', 'founder'];

function requireAdmin(req: AuthenticatedRequest, res: express.Response): boolean {
  const role = String(req.user?.role || '').toLowerCase();
  if (!SLA_ADMIN_ROLES.includes(role)) {
    res.status(403).json({ error: 'Forbidden: only an admin can change SLA settings' });
    return false;
  }
  return true;
}

// GET /api/sla/settings
router.get('/settings', async (req, res) => {
  try {
    const companyId = callerCompanyId(req);
    if (!companyId) {
      return res.status(409).json({ error: 'Your account is not linked to a company yet' });
    }

    const settings = await SlaService.getCompanySlaSettings(companyId);
    res.json({ success: true, settings });
  } catch (err: any) {
    logger.error('[SLA API Get Settings Error]:', err);
    res.status(500).json({ error: 'Failed to fetch SLA settings' });
  }
});

// PUT /api/sla/settings
router.put('/settings', async (req, res) => {
  try {
    const companyId = callerCompanyId(req);
    if (!companyId) {
      return res.status(409).json({ error: 'Your account is not linked to a company yet' });
    }
    if (!requireAdmin(req, res)) return;

    // companyId is deliberately not destructured from the body. If a client
    // sends one it is ignored.
    const {
      newLeadResponseTimeMins,
      overdueCallbackBufferMins,
      staleLeadThresholdDays,
      autoReassignEnabled,
      reassignRotationMode,
      excludedStatuses,
    } = req.body;

    const updated = await SlaService.updateCompanySlaSettings(companyId, {
      newLeadResponseTimeMins,
      overdueCallbackBufferMins,
      staleLeadThresholdDays,
      autoReassignEnabled,
      reassignRotationMode,
      excludedStatuses,
    });

    res.json({ success: true, settings: updated });
  } catch (err: any) {
    logger.error('[SLA API Update Settings Error]:', err);
    res.status(500).json({ error: 'Failed to update SLA settings' });
  }
});

// POST /api/sla/check-breaches
router.post('/check-breaches', async (req, res) => {
  try {
    const companyId = callerCompanyId(req);
    if (!companyId) {
      return res.status(409).json({ error: 'Your account is not linked to a company yet' });
    }
    // This run can reassign leads away from the agents holding them.
    if (!requireAdmin(req, res)) return;

    const result = await SlaService.processCompanySlaBreaches(companyId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[SLA API Check Breaches Error]:', err);
    res.status(500).json({ error: 'Failed to process SLA breaches' });
  }
});

// GET /api/sla/summary
router.get('/summary', async (req, res) => {
  try {
    const companyId = callerCompanyId(req);
    if (!companyId) {
      return res.status(409).json({ error: 'Your account is not linked to a company yet' });
    }

    const summary = await SlaService.getSlaSummary(companyId);
    res.json({ success: true, summary });
  } catch (err: any) {
    logger.error('[SLA API Summary Error]:', err);
    res.status(500).json({ error: 'Failed to fetch SLA summary' });
  }
});

export default router;
