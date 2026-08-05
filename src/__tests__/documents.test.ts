import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock DB adapter before importing documents router
vi.mock('../lib/dbAdapter', () => {
  return {
    auth: {
      verifyIdToken: vi.fn(),
    },
    supabaseAdmin: {
      from: vi.fn(),
    },
  };
});

// Mock Audit Service
vi.mock('../services/audit.service', () => {
  return {
    AuditService: {
      logEvent: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock S3 Client & Presigner
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class S3Client { constructor() {} },
    PutObjectCommand: class PutObjectCommand { constructor(public input: any) {} },
    GetObjectCommand: class GetObjectCommand { constructor(public input: any) {} },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: vi.fn().mockImplementation(async (_client, command) => {
      return `https://r2.mock.cloudflarestorage.com/test-bucket/signed-url?token=mock_token_123`;
    }),
  };
});

import { auth, supabaseAdmin } from '../lib/dbAdapter';
import documentsRouter from '../routes/documents';

const app = express();
app.use(express.json());
app.use('/v1/documents', documentsRouter);

describe('Documents API Endpoints (/v1/documents)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/documents/presign', () => {
    it('rejects unauthenticated requests without bearer token', async () => {
      const res = await request(app)
        .post('/v1/documents/presign')
        .send({
          company_id: 'comp_1',
          file_name: 'test.pdf',
          size_bytes: 1024,
          mime_type: 'application/pdf',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('rejects file size exceeding plan maxFileSizeMb before any R2 call', async () => {
      (auth.verifyIdToken as any).mockResolvedValue({ uid: 'user_admin_1' });

      // Mock user profile
      const userSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user_admin_1', company_id: 'comp_starter', role: 'admin' },
          error: null,
        }),
      };

      // Mock company profile (Starter plan has 10 MB maxFileSizeMb)
      const companySelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'comp_starter', plan: 'starter', seat_limit: 5, storage_used_bytes: 0, storage_addon_gb: 0, plan_status: 'active' },
          error: null,
        }),
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') return userSelectMock;
        if (table === 'companies') return companySelectMock;
        return {};
      });

      const overSizeBytes = 15 * 1024 * 1024; // 15 MB (Starter max limit is 10 MB)

      const res = await request(app)
        .post('/v1/documents/presign')
        .set('Authorization', 'Bearer valid_token')
        .send({
          company_id: 'comp_starter',
          file_name: 'huge_file.pdf',
          size_bytes: overSizeBytes,
          mime_type: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('File size exceeds maximum allowed limit of 10 MB');
    });

    it('returns a presigned PUT URL for valid Starter tenant upload', async () => {
      (auth.verifyIdToken as any).mockResolvedValue({ uid: 'user_admin_1' });

      const userSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user_admin_1', company_id: 'comp_starter', role: 'admin' },
          error: null,
        }),
      };

      const companySelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'comp_starter', plan: 'starter', seat_limit: 5, storage_used_bytes: 0, storage_addon_gb: 0, plan_status: 'active' },
          error: null,
        }),
      };

      const defaultMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any) => resolve({ data: null, error: null, count: 0 }),
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') return userSelectMock;
        if (table === 'companies') return companySelectMock;
        return defaultMock;
      });

      const validBytes = 2 * 1024 * 1024; // 2 MB

      const res = await request(app)
        .post('/v1/documents/presign')
        .set('Authorization', 'Bearer valid_token')
        .send({
          company_id: 'comp_starter',
          file_name: 'receipt.jpeg',
          size_bytes: validBytes,
          mime_type: 'image/jpeg',
        });

      if (res.status !== 200) {
        console.error('Presign test failed with body:', res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.upload_url).toContain('r2.mock.cloudflarestorage.com');
      expect(res.body.r2_key).toContain('comp_starter/general/');
      expect(res.body.expires_in).toBe(300);
    });
  });

  describe('POST /v1/documents/confirm', () => {
    it('rejects confirm call if r2_key was never presigned', async () => {
      (auth.verifyIdToken as any).mockResolvedValue({ uid: 'user_admin_1' });

      const userSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user_admin_1', company_id: 'comp_starter', role: 'admin' },
          error: null,
        }),
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') return userSelectMock;
        return {};
      });

      const res = await request(app)
        .post('/v1/documents/confirm')
        .set('Authorization', 'Bearer valid_token')
        .send({
          company_id: 'comp_starter',
          file_name: 'forged.pdf',
          size_bytes: 1024,
          mime_type: 'application/pdf',
          r2_key: 'comp_starter/general/unpresigned_fake_key.pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or un-presigned r2_key');
    });
  });

  describe('GET /v1/documents/:id/url', () => {
    it('blocks telecallers from requesting document download URLs (403 Forbidden)', async () => {
      (auth.verifyIdToken as any).mockResolvedValue({ uid: 'user_telecaller_1' });

      const userSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user_telecaller_1', company_id: 'comp_starter', role: 'telecaller' },
          error: null,
        }),
      };

      const docSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'doc_123', company_id: 'comp_starter', r2_key: 'comp_starter/general/file.pdf', file_name: 'file.pdf', category: 'aadhaar' },
          error: null,
        }),
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') return userSelectMock;
        if (table === 'documents') return docSelectMock;
        return {};
      });

      const res = await request(app)
        .get('/v1/documents/doc_123/url')
        .set('Authorization', 'Bearer valid_telecaller_token');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only an admin or founder can generate document download URLs');
      expect(res.body.url).toBeUndefined();
    });

    it('blocks cross-tenant access when Tenant A admin requests Tenant B document URL (403 Forbidden with NO signed URL)', async () => {
      (auth.verifyIdToken as any).mockResolvedValue({ uid: 'user_admin_tenant_a' });

      const userSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user_admin_tenant_a', company_id: 'tenant_a', role: 'admin' },
          error: null,
        }),
      };

      // Document belongs to Tenant B
      const docSelectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'doc_tenant_b', company_id: 'tenant_b', r2_key: 'tenant_b/general/secret.pdf', file_name: 'secret.pdf', category: 'bank_statement' },
          error: null,
        }),
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'users') return userSelectMock;
        if (table === 'documents') return docSelectMock;
        return {};
      });

      const res = await request(app)
        .get('/v1/documents/doc_tenant_b/url')
        .set('Authorization', 'Bearer valid_admin_a_token');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Cross-tenant access prohibited');
      expect(res.body.url).toBeUndefined();
    });
  });
});
