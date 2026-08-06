import { logger } from '../lib/logger';
import express from 'express';
import { db, auth, FieldValue, Timestamp, MockTimestamp } from '../lib/dbAdapter';
import { supabaseAdmin } from '../lib/dbAdapter';
import { AuditService } from '../services/audit.service';

const router = express.Router();

// Helper to compile trial events stats
const getTrialStats = async (companyId: string) => {
  const eventsRef = db.collection("companies").doc(companyId).collection("trial_events");
  const snapshot = await eventsRef.get();
  
  const stats = {
    totalLeadsImported: 0,
    totalAIDrafts: 0,
    totalCallsLogged: 0,
    totalTeammatesInvited: 0,
    checklistCompleted: 0,
    upgradeModalShown: 0,
    upgradeClicked: 0,
    extensionRequested: 0
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    switch (data.eventType) {
      case 'lead_imported':
        stats.totalLeadsImported += (data.eventData?.leadsCount || 0);
        break;
      case 'ai_draft_sent':
        stats.totalAIDrafts += 1;
        break;
      case 'call_logged':
        stats.totalCallsLogged += 1;
        break;
      case 'teammate_invited':
        stats.totalTeammatesInvited += 1;
        break;
      case 'day0_checklist_complete':
        stats.checklistCompleted += 1;
        break;
      case 'upgrade_modal_shown':
        stats.upgradeModalShown += 1;
        break;
      case 'upgrade_clicked':
        stats.upgradeClicked += 1;
        break;
      case 'extension_requested':
        stats.extensionRequested += 1;
        break;
    }
  });

  return stats;
};

// GET trial status
router.get('/trial/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userData = userDoc.data() || {};

    // Parse helper for DB dates (handles MockTimestamp, Date and ISO strings safely)
    const parseDbDate = (val: any): Date | null => {
      if (!val) return null;
      if (typeof val.toDate === 'function') return val.toDate();
      if (val instanceof Date) return val;
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const createdAtDate = parseDbDate(userData.createdAt || userData.created_at) || new Date();
    const trialStartDate = parseDbDate(userData.trialStartDate || userData.trial_start_date) || createdAtDate;
    const trialEndDate = parseDbDate(userData.trialEndDate || userData.trial_end_date) || new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const diff = trialEndDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    const trialStatus = daysRemaining > 0 ? "active" : "expired";
    const accountStatus = userData.planStatus || userData.plan_status || "trial";

    const companyId = userData.companyId;
    let callsLogged = 0;
    let trialStats = null;

    if (companyId) {
      const callsSnapshot = await db.collection("calls").where("companyId", "==", companyId).count().get();
      callsLogged = callsSnapshot.data().count;

      trialStats = await getTrialStats(companyId);
    }

    const dataRetentionDate = parseDbDate(userData.dataRetentionDate || userData.data_retention_date);

    res.json({
      trialStatus,
      daysRemaining,
      accountStatus,
      dataRetentionDate: dataRetentionDate ? dataRetentionDate.toISOString() : null,
      day0ChecklistCompleted: userData.day0ChecklistCompleted || false,
      trialStats,
      limits: {
        maxLeads: userData.trial_limits?.maxLeads || 500,
        maxAIDrafts: userData.trial_limits?.maxAIDrafts || 30,
        maxTeamSeats: userData.trial_limits?.maxTeamSeats || 3
      },
      usage: {
        leadsImported: trialStats?.totalLeadsImported || 0,
        aiDraftsUsed: trialStats?.totalAIDrafts || 0,
        teamSize: userData.teamSize || 1,
        callsLogged
      }
    });
  } catch (error: any) {
    logger.error("Trial Status Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST trial start
router.post('/trial/start', async (req, res) => {
  const { idToken } = req.body;
  const token = idToken || req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const now = Date.now();
    
    const trialData = {
      trialStartDate: FieldValue.serverTimestamp(),
      trialEndDate: Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000),
      trialStatus: "active",
      trialExtensionCount: 0,
      accountStatus: "trial",
      dataRetentionDate: Timestamp.fromMillis(now + 37 * 24 * 60 * 60 * 1000),
      trial_limits: {
        maxLeads: 500,
        maxAIDrafts: 30,
        maxTeamSeats: 3,
        maxAutomationRules: 5,
        leadsImported: 0,
        aiDraftsUsed: 0
      },
      updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(userId).update(trialData);

    res.json({ 
      success: true, 
      trialEndDate: new Date(now + 7 * 24 * 60 * 60 * 1000),
      limits: { leads: 500, aiDrafts: 30 } 
    });
  } catch (error: any) {
    logger.error("Trial Start Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST trial extend
router.post('/trial/extend', async (req, res) => {
  const { idToken } = req.body;
  const token = idToken || req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userData = userDoc.data() || {};
    
    if (userData.trialStatus !== "active") {
      return res.status(400).json({ error: "Trial must be active to extend." });
    }

    if ((userData.trialExtensionCount || 0) >= 1) {
      return res.status(400).json({ error: "Extension already used" });
    }

    const currentEndDate = (userData.trialEndDate as unknown as MockTimestamp)?.toDate() || new Date();
    const newEndDate = new Date(currentEndDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    await userRef.update({
      trialEndDate: Timestamp.fromDate(newEndDate),
      trialStatus: "extended",
      trialExtensionCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      newEndDate, 
      message: "Trial extended by 3 days" 
    });
  } catch (error: any) {
    logger.error("Trial Extend Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST upgrade intent
router.post('/trial/upgrade-intent', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    const { plan, seats, billing } = req.body;

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userData = userDoc.data() || {};
    const companyId = userData.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "No company associated with this user." });
    }

    const intent = {
      userId,
      userEmail: decodedToken.email,
      plan,
      seats,
      billing,
      status: 'pending',
      timestamp: FieldValue.serverTimestamp()
    };

    await db.collection("companies").doc(companyId).collection("upgrade_intents").add(intent);

    res.json({ success: true, message: "Upgrade intent registered. Our team will contact you soon." });
  } catch (error: any) {
    logger.error("Upgrade Intent Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/sync-app-metadata
// Called after onboarding to inject company_id + role into the Supabase JWT app_metadata.
// Resolves company_id and role server-side from public.users to prevent privilege escalation.
router.post('/auth/sync-app-metadata', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Fetch user profile server-side from public.users
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !userProfile) {
      logger.warn(`[sync-app-metadata] User profile not found for uid=${userId}`);
      return res.status(404).json({ error: 'User profile not found' });
    }

    const companyId = userProfile.company_id;
    const role = userProfile.role || 'telecaller';

    if (!companyId) {
      logger.warn(`[sync-app-metadata] Attempted sync for user ${userId} without assigned company_id`);
      await AuditService.logEvent({
        action: 'SYNC_APP_METADATA_FAILED',
        targetId: userId,
        targetType: 'user',
        details: { outcome: 'CONFLICT_MISSING_COMPANY', userId, role }
      });
      return res.status(409).json({ error: 'User has no assigned company_id' });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { company_id: companyId, role }
    });

    if (updateErr) {
      logger.error('[sync-app-metadata] Failed to update app_metadata:', updateErr);
      await AuditService.logEvent({
        action: 'SYNC_APP_METADATA_FAILED',
        targetId: userId,
        targetType: 'user',
        details: { outcome: 'SUPABASE_UPDATE_ERROR', error: updateErr.message, userId, companyId, role }
      });
      return res.status(500).json({ error: 'Failed to sync app_metadata' });
    }

    await AuditService.logEvent({
      action: 'SYNC_APP_METADATA_SUCCESS',
      targetId: userId,
      targetType: 'user',
      details: { outcome: 'SUCCESS', userId, companyId, role }
    });

    logger.info(`[sync-app-metadata] Synced company_id=${companyId} role=${role} for user ${userId}`);
    res.json({ success: true, companyId, role });
  } catch (error: any) {
    logger.error('[sync-app-metadata] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET cookie-based impersonate login exchanger (Fix 6 secure cookie reader)
router.get('/auth/impersonate-login', (req, res) => {
  // Parse cookies from request header
  const cookiesHeader = req.headers.cookie || '';
  const parsedCookies: Record<string, string> = {};
  cookiesHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts[0]) {
      parsedCookies[parts[0]] = parts.slice(1).join('=');
    }
  });

  const impersonateToken = parsedCookies['impersonate_token'];
  if (!impersonateToken) {
    return res.status(400).send('Impersonation token not found or expired.');
  }

  // Clear cookie and redirect to magic link target
  res.setHeader('Set-Cookie', 'impersonate_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  
  const decoded = decodeURIComponent(impersonateToken);
  try {
    const allowed = new URL(process.env.APP_URL || 'http://localhost:3000');
    const target = new URL(decoded, allowed.origin);
    if (target.host !== allowed.host) {
      return res.status(400).send('Invalid redirect target');
    }
    res.redirect(decoded);
  } catch (error) {
    return res.status(400).send('Invalid redirect target');
  }
});

export default router;

