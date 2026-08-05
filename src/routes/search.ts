import { Router, Request, Response } from 'express';
import { SearchService } from '../services/search.service';
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
    (req as any).userProfile = profile;
    (req as any).companyId = profile.company_id;
    (req as any).userId = profile.id;
    (req as any).userRole = profile.role;

    next();
  } catch (err: any) {
    logger.error('[SearchRouter] Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication validation failure.' });
  }
};

router.use(authMiddleware as any);

/**
 * GET /api/search
 * Global Search endpoint across 22+ modules with RBAC filtering & pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    const query = (req.query.q as string) || '';
    const categoriesParam = (req.query.categories as string) || 'all';
    const categories = categoriesParam.split(',').map((c) => c.trim().toLowerCase());
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const response = await SearchService.search(companyId, userId, userRole, query, categories, limit, offset);

    // If valid search term, log to recent searches asynchronously
    if (query && query.trim().length >= 2) {
      SearchService.saveRecentSearch(companyId, userId, query, categoriesParam).catch((): null => null);
    }

    return res.status(200).json({ success: true, ...response });
  } catch (err: any) {
    logger.error('[SearchRouter] GET / error:', err);
    return res.status(500).json({ error: 'Failed to execute global search.' });
  }
});

/**
 * GET /api/search/suggestions
 * Ultra-fast 5-item autocomplete suggestion endpoint
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const query = (req.query.q as string) || '';

    const suggestions = await SearchService.getSuggestions(companyId, userId, userRole, query);
    return res.status(200).json({ success: true, suggestions });
  } catch (err: any) {
    logger.error('[SearchRouter] GET /suggestions error:', err);
    return res.status(500).json({ error: 'Failed to retrieve search suggestions.' });
  }
});

/**
 * GET /api/search/recent
 * Fetch recent search history for current user
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const recent = await SearchService.getRecentSearches(companyId, userId);
    return res.status(200).json({ success: true, recent });
  } catch (err: any) {
    logger.error('[SearchRouter] GET /recent error:', err);
    return res.status(500).json({ error: 'Failed to retrieve recent searches.' });
  }
});

/**
 * DELETE /api/search/recent
 * Clear recent search history for current user
 */
router.delete('/recent', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = (req as any).userId;

    const result = await SearchService.clearRecentSearches(companyId, userId);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error('[SearchRouter] DELETE /recent error:', err);
    return res.status(500).json({ error: 'Failed to clear recent searches.' });
  }
});

export default router;
