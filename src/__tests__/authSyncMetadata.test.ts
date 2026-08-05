import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dbAdapter
vi.mock('../lib/dbAdapter', () => {
  return {
    db: {},
    auth: {
      verifyIdToken: vi.fn(),
    },
    supabaseAdmin: {
      from: vi.fn(),
      auth: {
        admin: {
          updateUserById: vi.fn(),
        },
      },
    },
  };
});

// Mock AuditService
vi.mock('../services/audit.service', () => {
  return {
    AuditService: {
      logEvent: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { auth, supabaseAdmin } from '../lib/dbAdapter';
import { AuditService } from '../services/audit.service';
import authRouter from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api', authRouter);

describe('POST /api/auth/sync-app-metadata privilege escalation defense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests (missing bearer token)', async () => {
    const res = await request(app)
      .post('/api/auth/sync-app-metadata')
      .send({ companyId: 'comp_fake', role: 'founder' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('prevents privilege escalation by ignoring request body and using DB profile claims', async () => {
    // User A belongs to company_A with role 'telecaller'
    const userA_uid = 'user_A_123';
    (auth.verifyIdToken as any).mockResolvedValue({ uid: userA_uid });

    // DB query returns User A's real company_A and telecaller role
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: userA_uid, company_id: 'company_A', role: 'telecaller', email: 'usera@companyA.com' },
            error: null,
          }),
        }),
      }),
    });

    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });

    // Attacker tries to inject company_B and role "founder" in the request body
    const res = await request(app)
      .post('/api/auth/sync-app-metadata')
      .set('Authorization', 'Bearer valid_token_user_A')
      .send({ companyId: 'company_B_victim', role: 'founder' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify updateUserById was called ONLY with user A's real DB values (company_A, telecaller)
    // and COMPLETELY IGNORED the body's company_B_victim and founder
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(userA_uid, {
      app_metadata: { company_id: 'company_A', role: 'telecaller' },
    });

    expect(res.body.companyId).toBe('company_A');
    expect(res.body.role).toBe('telecaller');

    // Verify audit log was recorded
    expect(AuditService.logEvent).toHaveBeenCalledWith({
      action: 'SYNC_APP_METADATA_SUCCESS',
      targetId: userA_uid,
      targetType: 'user',
      details: { outcome: 'SUCCESS', userId: userA_uid, companyId: 'company_A', role: 'telecaller' },
    });
  });

  it('returns 409 Conflict if user has no assigned company_id in DB profile', async () => {
    const user_uid = 'user_unassigned';
    (auth.verifyIdToken as any).mockResolvedValue({ uid: user_uid });

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: user_uid, company_id: null, role: 'telecaller' },
            error: null,
          }),
        }),
      }),
    });

    const res = await request(app)
      .post('/api/auth/sync-app-metadata')
      .set('Authorization', 'Bearer valid_token')
      .send({ companyId: 'company_fake', role: 'founder' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('User has no assigned company_id');
    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();

    expect(AuditService.logEvent).toHaveBeenCalledWith({
      action: 'SYNC_APP_METADATA_FAILED',
      targetId: user_uid,
      targetType: 'user',
      details: { outcome: 'CONFLICT_MISSING_COMPANY', userId: user_uid, role: 'telecaller' },
    });
  });
});
