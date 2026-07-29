import { logger } from '../lib/logger';
import express from 'express';
import { db, auth, FieldValue, Timestamp } from '../lib/dbAdapter';

const router = express.Router();

// API Route for Remote Wipe
router.post('/remote-wipe', async (req, res) => {
  const adminToken = req.headers.authorization?.split('Bearer ')[1];
  if (!adminToken) return res.status(401).json({ error: 'Unauthorized' });
  const { targetUserId } = req.body;

  try {
    const decodedToken = await auth.verifyIdToken(adminToken);
    
    if (decodedToken.email !== process.env.MASTER_FOUNDER_EMAIL) {
      return res.status(403).json({ error: "Unauthorized. Only Master Founder can trigger remote wipe." });
    }

    // F-10 FIX: Validate targetUserId before performing any destructive action
    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      return res.status(400).json({ error: 'Invalid or missing targetUserId' });
    }
    const targetDoc = await db.collection("users").doc(targetUserId).get();
    if (!targetDoc.exists) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    // Prevent accidental self-wipe
    if (targetUserId === decodedToken.uid) {
      return res.status(400).json({ error: 'Cannot remote-wipe your own account' });
    }

    logger.info(`Triggering Remote Wipe for user: ${targetUserId}`);

    await db.collection("users").doc(targetUserId).update({
      force_wipe: true,
      role: "disabled",
      updatedAt: FieldValue.serverTimestamp()
    });

    await auth.revokeRefreshTokens(targetUserId);

    await db.collection("companies").doc("system_admin").collection("audit_logs").add({
      action: "REMOTE_WIPE",
      targetUserId,
      adminId: decodedToken.uid,
      timestamp: FieldValue.serverTimestamp(),
      status: "SUCCESS",
      metadata: { source: "server-api" }
    });

    res.json({ success: true, message: "Remote wipe triggered successfully." });
  } catch (error: any) {
    logger.error("Remote Wipe Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Route for Bulk Reassign
router.post('/bulk-reassign', async (req, res) => {
  const adminToken = req.headers.authorization?.split('Bearer ')[1];
  if (!adminToken) return res.status(401).json({ error: 'Unauthorized' });
  const { sourceUserId, targetUserId, count } = req.body;

  try {
    const decodedToken = await auth.verifyIdToken(adminToken);
    const requesterId = decodedToken.uid;
    const requesterDoc = await db.collection("users").doc(requesterId).get();
    
    const requesterData = requesterDoc.exists ? (requesterDoc.data() || {}) : {};
    const companyId = requesterData.companyId;
    const requesterRole = requesterData.role;

    const isMasterFounder = decodedToken.email === process.env.MASTER_FOUNDER_EMAIL;
    // F-13 FIX: Removed "Agent" — only admin-tier roles may bulk-reassign leads
    const isAllowedAdmin = isMasterFounder || requesterRole === "super_admin" || requesterRole === "founder";
    
    if (!isAllowedAdmin) {
      return res.status(403).json({ error: "Unauthorized role for reassignment actions." });
    }

    if (!isMasterFounder && !companyId) {
      return res.status(400).json({ error: "Invalid company context for requester user." });
    }

    let activeCompanyId = companyId;
    
    if (!activeCompanyId) {
      const sourceDoc = await db.collection("users").doc(sourceUserId).get();
      if (sourceDoc.exists) {
        activeCompanyId = sourceDoc.data()?.companyId;
      }
    }

    if (!activeCompanyId) {
      return res.status(400).json({ error: "Could not establish an active company context for the operation." });
    }

    const sourceUserDoc = await db.collection("users").doc(sourceUserId).get();
    if (!sourceUserDoc.exists || sourceUserDoc.data()?.companyId !== activeCompanyId) {
      return res.status(400).json({ error: "Source user is invalid or belongs to a different company." });
    }

    if (targetUserId !== "ADMIN_POOL") {
      const targetUserDoc = await db.collection("users").doc(targetUserId).get();
      if (!targetUserDoc.exists || targetUserDoc.data()?.companyId !== activeCompanyId) {
        return res.status(400).json({ error: "Target user is invalid or belongs to a different company." });
      }
      if (targetUserDoc.data()?.status === "disabled" || targetUserDoc.data()?.status === "removed") {
        return res.status(400).json({ error: "Target user is deactivated or removed, cannot assign leads." });
      }
    }

    const leadsRef = db.collection("leads");
    let query = leadsRef
      .where("companyId", "==", activeCompanyId)
      .where("assignedTo", "==", sourceUserId);
      
    if (count > 0) {
      query = query.limit(count);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({ success: true, count: 0 });
    }

    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((doc) => {
        const leadData = doc.data() || {};
        const updatePayload: any = { 
          assignedTo: targetUserId === "ADMIN_POOL" ? null : targetUserId,
          updatedAt: FieldValue.serverTimestamp()
        };

        if (!leadData.name) {
          updatePayload.name = "Unknown Name";
        }
        if (!leadData.phone) {
          updatePayload.phone = "No Phone";
        }

        batch.update(doc.ref, updatePayload);
      });
      await batch.commit();
    }

    const logPayload = {
      action: "BULK_REASSIGN",
      userId: decodedToken.uid,
      userName: decodedToken.name || decodedToken.email || requesterData.displayName || "Company Admin",
      companyId: activeCompanyId,
      details: `Reassigned ${snapshot.size} leads from ${sourceUserId} to ${targetUserId}`,
      timestamp: FieldValue.serverTimestamp(),
      retentionUntil: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
      metadata: { source: "server-api" }
    };

    await db.collection("companies").doc(activeCompanyId).collection("audit_logs").add(logPayload);
    await db.collection("companies").doc("system_admin").collection("audit_logs").add(logPayload);

    res.json({ success: true, count: snapshot.size });
  } catch (error: any) {
    logger.error("Bulk Reassign Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

