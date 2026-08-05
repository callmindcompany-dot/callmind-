import express from 'express';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../lib/logger';
import { auth, supabaseAdmin } from '../lib/dbAdapter';
import { PRICING_PLANS, includedStorageMb, resolveLimit } from '../config/pricing';
import { AuditService } from '../services/audit.service';

const router = express.Router();

// Roles permitted to view signed GET URLs or delete documents (Admin/Founder only)
const DOCUMENT_ADMIN_ROLES = ['admin', 'founder', 'sub_admin'];

// In-memory store for tracking presigned upload keys to enforce that /confirm only accepts keys presigned by us
const presignedKeys = new Map<string, { companyId: string; expiresAt: number }>();

function registerPresignedKey(key: string, companyId: string) {
  // Expire presigned keys after 10 minutes
  presignedKeys.set(key, { companyId, expiresAt: Date.now() + 10 * 60 * 1000 });
}

function verifyAndConsumePresignedKey(key: string, companyId: string): boolean {
  const entry = presignedKeys.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    presignedKeys.delete(key);
    return false;
  }
  if (entry.companyId !== companyId) return false;
  presignedKeys.delete(key);
  return true;
}

// Clean up expired presigned keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of presignedKeys.entries()) {
    if (value.expiresAt < now) {
      presignedKeys.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Initialize Cloudflare R2 S3 Client
const getR2Client = () => {
  const r2AccountId = process.env.R2_ACCOUNT_ID || 'mock-account';
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || 'mock-key';
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'mock-secret';

  return new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
};

/**
 * Authenticates the caller and confirms they belong to `companyId`.
 */
async function authorizeDocumentActor(req: express.Request, res: express.Response, targetCompanyId: string) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedUser = await auth.verifyIdToken(token);

    // Fetch user profile from Supabase
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role, email')
      .eq('id', decodedUser.uid)
      .maybeSingle();

    if (profileErr || !userProfile) {
      res.status(401).json({ error: 'Unauthorized: User profile not found' });
      return null;
    }

    if (userProfile.company_id !== targetCompanyId) {
      logger.warn('[Document Security] Cross-tenant attempt blocked', {
        actor: decodedUser.uid,
        actorCompany: userProfile.company_id,
        targetCompany: targetCompanyId,
      });
      res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
      return null;
    }

    return userProfile;
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return null;
  }
}

/**
 * Sanitizes filename to prevent header injection or directory traversal.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
}

/**
 * POST /v1/documents/presign
 * Validates company limits, role, file size, and mime type, then returns presigned PUT URL.
 */
router.post('/presign', async (req, res) => {
  const { company_id, lead_id, category, file_name, size_bytes, mime_type } = req.body;

  if (!company_id || !file_name || !size_bytes || !mime_type) {
    return res.status(400).json({ error: 'Missing required fields: company_id, file_name, size_bytes, mime_type' });
  }

  const actor = await authorizeDocumentActor(req, res, company_id);
  if (!actor) return; // Response already sent

  // Fetch company details
  const { data: company, error: companyErr } = await supabaseAdmin
    .from('companies')
    .select('id, plan, seat_limit, storage_used_bytes, storage_addon_gb, plan_status')
    .eq('id', company_id)
    .single();

  if (companyErr || !company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  if (['expired', 'cancelled'].includes(company.plan_status)) {
    return res.status(403).json({ error: 'Your free trial has ended. Upgrade to continue adding data.' });
  }

  const planId = company.plan || 'trial';
  const plan = PRICING_PLANS[planId] || PRICING_PLANS.trial;

  // 1. Mime Type Allowlist Validation
  const standardAllowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const isAllowedMime = standardAllowedMimes.includes(mime_type) || (plan.videoUpload && videoMimes.includes(mime_type));

  if (!isAllowedMime) {
    return res.status(400).json({ error: `File format '${mime_type}' is not supported on your plan.` });
  }

  // 2. Max File Size Validation
  const maxBytes = plan.maxFileSizeMb * 1024 * 1024;
  if (size_bytes > maxBytes) {
    return res.status(400).json({ error: `File size exceeds maximum allowed limit of ${plan.maxFileSizeMb} MB.` });
  }

  // 3. Storage Quota Validation
  const allowedMb = includedStorageMb(planId, company.seat_limit || 1) + ((company.storage_addon_gb || 0) * 1024);
  const allowedBytes = allowedMb * 1024 * 1024;
  const currentUsed = Number(company.storage_used_bytes || 0);

  if (currentUsed + Number(size_bytes) > allowedBytes) {
    return res.status(400).json({ error: `Storage quota exceeded (${Math.round(currentUsed / 1048576)} MB of ${allowedMb} MB used). Upgrade plan or add storage.` });
  }

  // 4. Files Per Lead Validation
  if (lead_id && plan.filesPerLead !== 'unlimited') {
    const { count: leadFileCount, error: countErr } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('lead_id', lead_id)
      .is('deleted_at', null);

    if (!countErr && (leadFileCount || 0) >= (plan.filesPerLead as number)) {
      return res.status(400).json({ error: `Lead document limit reached (${plan.filesPerLead} files allowed per lead).` });
    }
  }

  // Generate Unguessable Key: <company_id>/<lead_id>/<uuid>-<sanitised-filename>
  const cleanLeadId = lead_id ? sanitizeFilename(lead_id) : 'general';
  const cleanFileName = sanitizeFilename(file_name);
  const r2Key = `${company_id}/${cleanLeadId}/${crypto.randomUUID()}-${cleanFileName}`;

  try {
    const bucket = process.env.R2_BUCKET || '';
    const r2 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      ContentType: mime_type,
      ContentLength: size_bytes,
    });

    const presignedPutUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 minutes

    registerPresignedKey(r2Key, company_id);

    return res.json({
      success: true,
      upload_url: presignedPutUrl,
      r2_key: r2Key,
      expires_in: 300,
    });
  } catch (err: any) {
    logger.error('[Documents API] Failed generating presigned PUT URL', { error: err.message });
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * POST /v1/documents/confirm
 * Called after R2 upload completes. Inserts document metadata row into Supabase Postgres.
 */
router.post('/confirm', async (req, res) => {
  const { company_id, lead_id, requirement_id, category, file_name, size_bytes, mime_type, r2_key } = req.body;

  if (!company_id || !file_name || !size_bytes || !mime_type || !r2_key) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const actor = await authorizeDocumentActor(req, res, company_id);
  if (!actor) return;

  // Enforce that the r2_key was previously presigned for this company
  if (!verifyAndConsumePresignedKey(r2_key, company_id)) {
    return res.status(400).json({ error: 'Invalid or un-presigned r2_key. Upload must originate from /presign.' });
  }

  try {
    const docData = {
      company_id,
      lead_id: lead_id || null,
      requirement_id: requirement_id || null,
      category: category || 'general',
      file_name,
      size_bytes,
      mime_type,
      r2_key,
      status: 'pending_review',
      uploaded_by: actor.id,
      uploaded_at: new Date().toISOString(),
    };

    const { data: insertedDoc, error: insertErr } = await supabaseAdmin
      .from('documents')
      .insert([docData])
      .select()
      .single();

    if (insertErr) {
      logger.error('[Documents API] Metadata insert failed', { error: insertErr });
      return res.status(400).json({ error: insertErr.message || 'Failed to record document metadata' });
    }

    // Log Audit Event
    await AuditService.logEvent({
      action: 'DOCUMENT_UPLOADED',
      targetId: insertedDoc.id,
      targetType: 'document',
      details: {
        companyId: company_id,
        leadId: lead_id,
        fileName: file_name,
        sizeBytes: size_bytes,
        r2Key: r2_key,
      },
    });

    return res.json({
      success: true,
      document: insertedDoc,
    });
  } catch (err: any) {
    logger.error('[Documents API] Confirm endpoint error', { error: err.message });
    return res.status(500).json({ error: 'Failed to confirm document upload' });
  }
});

/**
 * GET /v1/documents/:id/url
 * Returns a 15-minute presigned GET URL. Admin/Founder only.
 */
router.get('/:id/url', async (req, res) => {
  const docId = req.params.id;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedUser = await auth.verifyIdToken(token);

    // Fetch user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role')
      .eq('id', decodedUser.uid)
      .maybeSingle();

    if (!userProfile) {
      return res.status(401).json({ error: 'Unauthorized: Profile not found' });
    }

    // Fetch document metadata
    const { data: doc, error: docErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (docErr || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Tenant Isolation Check: Confirm document company_id matches caller company_id
    if (doc.company_id !== userProfile.company_id) {
      logger.warn('[Document Security] Cross-tenant document URL request blocked', {
        actor: decodedUser.uid,
        actorCompany: userProfile.company_id,
        targetDocCompany: doc.company_id,
      });
      return res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
    }

    // Role Enforcement: Admin / Founder only
    if (!DOCUMENT_ADMIN_ROLES.includes(userProfile.role)) {
      return res.status(403).json({ error: 'Forbidden: Only an admin or founder can generate document download URLs' });
    }

    // Record DPDP compliance access log in document_access_log
    await supabaseAdmin
      .from('document_access_log')
      .insert([{
        company_id: doc.company_id,
        document_id: doc.id,
        actor: userProfile.id,
        action: 'download',
        ip_address: req.ip || req.socket.remoteAddress || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
      }]);

    // Log Audit Event
    await AuditService.logEvent({
      action: 'DOCUMENT_VIEWED',
      targetId: doc.id,
      targetType: 'document',
      details: {
        fileName: doc.file_name,
        category: doc.category,
      },
    });

    // Generate Presigned GET URL (15 minutes)
    const bucket = process.env.R2_BUCKET || '';
    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: doc.r2_key,
    });

    const signedGetUrl = await getSignedUrl(r2, command, { expiresIn: 900 }); // 15 minutes

    return res.json({
      success: true,
      url: signedGetUrl,
      expires_in: 900,
    });
  } catch (err: any) {
    logger.error('[Documents API] Error generating GET URL', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /v1/documents/:id
 * Soft deletes document metadata row. Admin/Founder only.
 */
router.delete('/:id', async (req, res) => {
  const docId = req.params.id;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedUser = await auth.verifyIdToken(token);

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role')
      .eq('id', decodedUser.uid)
      .maybeSingle();

    if (!userProfile) {
      return res.status(401).json({ error: 'Unauthorized: Profile not found' });
    }

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (docErr || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Cross-tenant check
    if (doc.company_id !== userProfile.company_id) {
      return res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
    }

    // Role check: Admin only
    if (!DOCUMENT_ADMIN_ROLES.includes(userProfile.role)) {
      return res.status(403).json({ error: 'Forbidden: Only an admin or founder can delete documents' });
    }

    // Soft delete
    const { error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', docId);

    if (updateErr) {
      return res.status(400).json({ error: updateErr.message });
    }

    // Audit Log
    await AuditService.logEvent({
      action: 'DOCUMENT_DELETED',
      targetId: doc.id,
      targetType: 'document',
      details: {
        fileName: doc.file_name,
        sizeBytes: doc.size_bytes,
      },
    });

    return res.json({
      success: true,
      message: 'Document soft deleted successfully',
    });
  } catch (err: any) {
    logger.error('[Documents API] Delete document error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
