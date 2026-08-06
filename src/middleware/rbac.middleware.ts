import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { logger } from '../lib/logger';

// Default Role Permission Matrix
const DEFAULT_ROLE_MATRIX: Record<string, Record<string, string[]>> = {
  founder: {
    leads: ['view', 'create', 'update', 'delete', 'export', 'assign', 'approve'],
    calls: ['view', 'create', 'update', 'delete', 'export'],
    users: ['view', 'create', 'update', 'delete', 'export', 'assign', 'approve'],
    billing: ['view', 'create', 'update', 'delete', 'approve'],
    integrations: ['view', 'create', 'update', 'delete', 'approve'],
    settings: ['view', 'update'],
    whatsapp: ['view', 'create', 'update', 'delete', 'assign'],
  },
  admin: {
    leads: ['view', 'create', 'update', 'delete', 'export', 'assign', 'approve'],
    calls: ['view', 'create', 'update', 'export'],
    users: ['view', 'create', 'update', 'assign'],
    billing: ['view'],
    integrations: ['view', 'update'],
    settings: ['view'],
    whatsapp: ['view', 'create', 'update', 'assign'],
  },
  manager: {
    leads: ['view', 'create', 'update', 'export', 'assign'],
    calls: ['view', 'create', 'export'],
    users: ['view'],
    billing: [],
    integrations: ['view'],
    settings: [],
    whatsapp: ['view', 'create', 'assign'],
  },
  team_lead: {
    leads: ['view', 'create', 'update', 'assign'],
    calls: ['view', 'create'],
    users: ['view'],
    billing: [],
    integrations: [],
    settings: [],
    whatsapp: ['view', 'create'],
  },
  telecaller: {
    leads: ['view', 'update'],
    calls: ['view', 'create'],
    users: [],
    billing: [],
    integrations: [],
    settings: [],
    whatsapp: ['view', 'create'],
  },
};

export function requirePermission(moduleName: string, actionName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Never fall back to user_metadata: a signed-in user can write their own,
    // so reading role or company_id from it would let anyone promote themselves
    // to founder and clear every permission check below. authGuard resolves
    // both from app_metadata, which only the service role can set.
    const role = user.role || 'telecaller';
    const companyId = user.company_id;

    // A company's founder holds every permission inside their own tenant. This
    // is tenant-scoped by design -- companyId still comes from the token, so it
    // grants nothing outside the caller's own company.
    if (role === 'founder') {
      next();
      return;
    }

    // Check DB custom override permissions first
    if (!isPlaceholder && companyId) {
      try {
        const { data: dbPerm } = await supabaseAdmin
          .from('role_permissions')
          .select('actions')
          .eq('company_id', companyId)
          .eq('role', role)
          .eq('module', moduleName)
          .maybeSingle();

        if (dbPerm && Array.isArray(dbPerm.actions)) {
          if (dbPerm.actions.includes(actionName)) {
            next();
            return;
          }
          logger.warn(`[RBAC Guard] Denied ${role} action '${actionName}' on module '${moduleName}' for user ${user.id}`);
          res.status(403).json({ error: `Forbidden: Role '${role}' lacks permission '${actionName}' on module '${moduleName}'` });
          return;
        }
      } catch (err) {
        logger.error('[RBAC Middleware DB Error]:', err);
      }
    }

    // Fallback to DEFAULT_ROLE_MATRIX
    const rolePermissions = DEFAULT_ROLE_MATRIX[role] || {};
    const moduleActions = rolePermissions[moduleName] || [];

    if (moduleActions.includes(actionName)) {
      next();
      return;
    }

    logger.warn(`[RBAC Guard] Denied ${role} action '${actionName}' on module '${moduleName}' for user ${user.id}`);
    res.status(403).json({ error: `Forbidden: Role '${role}' lacks permission '${actionName}' on module '${moduleName}'` });
  };
}
