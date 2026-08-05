import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePermission } from '../middleware/rbac.middleware';

vi.mock('../lib/dbAdapter', () => ({
  isPlaceholder: false,
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('Configurable RBAC Permissions (Step 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows founder role unconditionally across all modules and actions', async () => {
    const middleware = requirePermission('billing', 'delete');
    const req: any = { user: { role: 'founder', company_id: 'comp-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks telecaller role from performing export or delete actions with 403 Forbidden', async () => {
    const { supabaseAdmin } = await import('../lib/dbAdapter');
    (supabaseAdmin.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    });

    const middleware = requirePermission('leads', 'export');
    const req: any = { user: { role: 'telecaller', company_id: 'comp-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows telecaller role to view and update leads based on default matrix', async () => {
    const { supabaseAdmin } = await import('../lib/dbAdapter');
    (supabaseAdmin.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    });

    const middleware = requirePermission('leads', 'view');
    const req: any = { user: { role: 'telecaller', company_id: 'comp-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
