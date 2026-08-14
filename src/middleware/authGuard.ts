import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: string;
  company_id?: string;
  app_metadata?: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Local development without Supabase configured gets a stub founder so the
    // app is usable offline. This must never be reachable in production: if
    // SUPABASE_URL were ever missing or malformed there, every guarded route
    // would hand out founder access to anyone with no token at all.
    if (isPlaceholder && process.env.NODE_ENV !== 'production') {
      (req as any).user = {
        id: 'mock-user-id',
        email: 'admin@callmind.app',
        role: 'founder',
        company_id: 'mock-company-id',
      };
      next();
      return;
    }

    if (isPlaceholder) {
      logger.error('[authGuard] Supabase is not configured in production — refusing to authenticate');
      res.status(503).json({ error: 'Authentication is unavailable' });
      return;
    }
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Read tenancy from app_metadata, never user_metadata.
    //
    // Two reasons. First, user_metadata is writable by the client, so trusting
    // it for company_id or role hands every user the ability to reassign
    // themselves to another tenant -- the same escalation that was just closed
    // in /api/auth/sync-app-metadata.
    //
    // Second, app_metadata is where the values actually are:
    // sync-app-metadata writes them there, and get_my_company_id() in
    // 20260718_secure_rls.sql reads auth.jwt()->'app_metadata'. Reading
    // user_metadata meant company_id came back undefined and every route using
    // this guard answered "Missing companyId".
    const appMeta = (data.user.app_metadata ?? {}) as Record<string, unknown>;

    (req as any).user = {
      id: data.user.id,
      email: data.user.email,
      role: (appMeta.role as string) || 'telecaller',
      company_id: appMeta.company_id as string | undefined,
      app_metadata: appMeta,
    };
    next();
  } catch (err: any) {
    logger.error('[authGuard Error]:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
