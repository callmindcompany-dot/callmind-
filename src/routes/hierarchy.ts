import { Router, Request, Response } from 'express';
import { HierarchyService } from '../services/hierarchy.service';
import { logger } from '../lib/logger';
import { supabaseAdmin } from '../lib/dbAdapter';

const router = Router();

// Middleware: Authenticate User & Scope Tenant/Role
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

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single();

    if (profErr || !profile || !profile.company_id) {
      return res.status(403).json({ error: 'User does not belong to a valid active company tenant.' });
    }

    (req as any).user = user;
    (req as any).companyId = profile.company_id;
    (req as any).userRole = profile.role;

    next();
  } catch (err: any) {
    logger.error('[HierarchyRouter] Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication validation failure.' });
  }
};

router.use(authMiddleware as any);

/**
 * Creating regions, branches and departments is org-structure work.
 *
 * These endpoints previously only required a valid session, so any telecaller
 * could add nodes to their company's hierarchy. Tenant isolation held -- the
 * company comes from the caller's profile, not the request -- but the action
 * itself belongs to an administrator.
 */
const HIERARCHY_ADMIN_ROLES = ['founder', 'admin', 'sub_admin', 'floor_manager'];

function requireHierarchyAdmin(req: Request, res: Response): boolean {
  const role = String((req as any).userRole || '').toLowerCase();
  if (!HIERARCHY_ADMIN_ROLES.includes(role)) {
    res.status(403).json({ error: 'Forbidden: only an administrator can change the organization structure.' });
    return false;
  }
  return true;
}


/**
 * GET /api/hierarchy
 * Retrieve complete Organization Hierarchy tree (Regions, Branches, Departments)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const tree = await HierarchyService.getHierarchyTree(companyId);
    return res.status(200).json({ success: true, ...tree });
  } catch (err: any) {
    logger.error('[HierarchyRouter] GET / error:', err);
    return res.status(500).json({ error: 'Failed to retrieve organization hierarchy.' });
  }
});

/**
 * PATCH /api/hierarchy/settings
 * Toggle Branch & Region Management Feature State (Admin/Founder Only)
 */
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userRole = (req as any).userRole;
    const { enabled } = req.body;

    if (!['founder', 'sub_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Founder or Sub-Admin can update Organization Hierarchy settings.' });
    }

    const updated = await HierarchyService.toggleBranchManagement(companyId, Boolean(enabled));
    return res.status(200).json({ success: true, company: updated });
  } catch (err: any) {
    logger.error('[HierarchyRouter] PATCH /settings error:', err);
    return res.status(500).json({ error: 'Failed to update hierarchy settings.' });
  }
});

/**
 * POST /api/hierarchy/regions
 * Create Region node
 */
router.post('/regions', async (req: Request, res: Response) => {
  try {
    if (!requireHierarchyAdmin(req, res)) return;

    const companyId = (req as any).companyId;
    const { name, code } = req.body;

    if (!name) return res.status(400).json({ error: 'Region name is required.' });

    const region = await HierarchyService.createRegion(companyId, name, code);
    return res.status(201).json({ success: true, region });
  } catch (err: any) {
    logger.error('[HierarchyRouter] POST /regions error:', err);
    return res.status(500).json({ error: 'Failed to create region.' });
  }
});

/**
 * POST /api/hierarchy/branches
 * Create Branch node
 */
router.post('/branches', async (req: Request, res: Response) => {
  try {
    if (!requireHierarchyAdmin(req, res)) return;

    const companyId = (req as any).companyId;
    const { name, code, region_id, state_id, city, address } = req.body;

    if (!name) return res.status(400).json({ error: 'Branch name is required.' });

    const branch = await HierarchyService.createBranch(companyId, {
      name,
      code,
      region_id,
      state_id,
      city,
      address,
    });

    return res.status(201).json({ success: true, branch });
  } catch (err: any) {
    logger.error('[HierarchyRouter] POST /branches error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create branch.' });
  }
});

/**
 * POST /api/hierarchy/departments
 * Create Department node
 */
router.post('/departments', async (req: Request, res: Response) => {
  try {
    if (!requireHierarchyAdmin(req, res)) return;

    const companyId = (req as any).companyId;
    const { branch_id, name, code } = req.body;

    if (!name || !branch_id) return res.status(400).json({ error: 'Branch ID and Department name are required.' });

    const department = await HierarchyService.createDepartment(companyId, branch_id, name, code);
    return res.status(201).json({ success: true, department });
  } catch (err: any) {
    logger.error('[HierarchyRouter] POST /departments error:', err);
    return res.status(500).json({ error: 'Failed to create department.' });
  }
});

export default router;
