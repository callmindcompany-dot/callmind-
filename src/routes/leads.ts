import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../lib/logger';
import { db, auth, FieldValue, processInboundLead, supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';

const router = express.Router();

// Public Inbound Webhook Rate Limiter (Tenant-scoped to prevent DoS)
const inboundWebhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per company tenant
  keyGenerator: (req: any) => {
    const companyId = req.params.companyId;
    if (companyId && companyId.trim()) {
      return `webhook_tenant_${companyId.trim()}`;
    }
    return `webhook_ip_${req.socket?.remoteAddress || req.ip || 'unknown'}`;
  },
  message: { error: 'Rate limit exceeded for inbound webhooks. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// A. Universal Inbound Webhook Endpoint
router.post('/webhooks/incoming/:companyId', inboundWebhookLimiter, async (req, res) => {
  const { companyId } = req.params;
  const source = (req.query.source as string) || 'Webhook';

  // F-05 FIX: Validate webhook secret before accepting leads
  const webhookSecret = req.headers['x-webhook-secret'] as string;
  if (!webhookSecret) {
    return res.status(401).json({ error: 'Missing x-webhook-secret header' });
  }

  try {
    // Verify the secret against stored credentials for this company
    if (!isPlaceholder) {
      const { data: sourceConfig } = await supabaseAdmin
        .from('lead_sources')
        .select('credentials')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const storedSecret = sourceConfig?.credentials?.webhookSecret;
      // F-14 FIX: Fail closed — if no source config or no secret configured, reject
      if (!storedSecret) {
        return res.status(403).json({ error: 'Webhook not configured for this company or secret not set' });
      }
      if (storedSecret !== webhookSecret) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }
    }

    const result = await processInboundLead(companyId, source, req.body);
    res.json({ success: true, ...result });
  } catch (e: any) {
    logger.error(`[Webhook Error]:`, e);
    res.status(400).json({ error: 'Internal server error' });
  }
});

// C. Manual Force Route Inbound Lead Override
router.post('/routing/force/:companyId/:leadId', async (req, res) => {
  const { companyId, leadId } = req.params;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedUser = await auth.verifyIdToken(token);
    const userSnap = await db.collection("users").doc(decodedUser.uid).get();
    if (!userSnap.exists || userSnap.data()?.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
    }

    const leadRef = db.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists || leadSnap.data()?.companyId !== companyId) {
      return res.status(404).json({ error: "Lead not found for this company" });
    }

    const teamSettingsSnap = await db.collection("team_settings").doc(companyId).get();
    const teamSettings = teamSettingsSnap.exists ? teamSettingsSnap.data() : {};

    const usersSnap = await db.collection("users").where("companyId", "==", companyId).get();
    let routedAgents = usersSnap.docs
      .map(d => ({ uid: d.ref.id, ...d.data() }))
      .filter((u: any) => u.role !== 'admin' && u.role !== 'founder');

    const activeIds = teamSettings.activeAgentIds || [];
    if (activeIds.length > 0) {
      routedAgents = routedAgents.filter((a: any) => activeIds.includes(a.uid));
    }

    let assignedAgentId = null;
    let assignedAgentName = 'unassigned';

    if (routedAgents.length > 0) {
      let nextIndex = 0;
      if (!isPlaceholder) {
        const { data: indexVal, error: rpcErr } = await supabaseAdmin.rpc('increment_routing_index', {
          p_company_id: companyId,
          p_source: 'force',
          p_agent_count: routedAgents.length
        });
        if (!rpcErr && typeof indexVal === 'number') {
          nextIndex = indexVal;
        } else {
          logger.error('[Routing Force Error] RPC atomic increment failed, falling back to local calculation:', rpcErr);
          const routeRef = db.collection("routing_state").doc(`${companyId}_force`);
          const routeDoc = await routeRef.get();
          const lastIndex = routeDoc.exists ? (routeDoc.data().lastAssignedIndex || 0) : 0;
          nextIndex = (lastIndex + 1) % routedAgents.length;
          await routeRef.set({
            lastAssignedIndex: nextIndex,
            companyId,
            source: 'force',
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } else {
        const routeRef = db.collection("routing_state").doc(`${companyId}_force`);
        const routeDoc = await routeRef.get();
        const lastIndex = routeDoc.exists ? (routeDoc.data().lastAssignedIndex || 0) : 0;
        nextIndex = (lastIndex + 1) % routedAgents.length;
        await routeRef.set({
          lastAssignedIndex: nextIndex,
          companyId,
          source: 'force',
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      assignedAgentId = routedAgents[nextIndex].uid;
      assignedAgentName = routedAgents[nextIndex].name || routedAgents[nextIndex].email;
    }

    await leadRef.update({
      assignedTo: assignedAgentId,
      holdOutboundTrigger: false,
      isUnseen: true,
      updatedAt: FieldValue.serverTimestamp()
    });

    const importLogQuery = await db.collection("import_logs")
      .where("companyId", "==", companyId)
      .where("leadId", "==", leadId)
      .get();

    if (!importLogQuery.empty) {
      await importLogQuery.docs[0].ref.update({
        status: 'success',
        assignedTo: assignedAgentId,
        routingReason: `Manual Force Route -> Assigned to ${assignedAgentName} (Round Robin)`
      });
    }

    res.json({ success: true, assignedTo: assignedAgentId, assignedToName: assignedAgentName });
  } catch (e: any) {
    logger.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// B. Facebook Handshake Verification Endpoint
router.get('/webhooks/facebook/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe') {
      // F-06 FIX: Validate verify_token against stored Facebook config; fail-closed if not set
      if (!isPlaceholder) {
        const { data: fbConfig } = await supabaseAdmin
          .from('lead_sources')
          .select('credentials')
          .eq('company_id', companyId)
          .eq('source_type', 'facebook')
          .maybeSingle();

        const storedToken = fbConfig?.credentials?.verifyToken;
        if (!storedToken || storedToken !== token) {
          logger.warn(`[Meta Webhook] Token mismatch or missing for company ${companyId}`);
          return res.status(403).end();
        }
      }

      logger.info(`[Meta Webhook Handshake] Verified for company: ${companyId}`);
      return res.status(200).send(challenge);
    }
  }
  res.status(403).end();
});

// C. Facebook Lead Ingestion Endpoint
router.post('/webhooks/facebook/:companyId', async (req, res) => {
  const { companyId } = req.params;
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    if (change?.value) {
      const payload = change.value;
      const result = await processInboundLead(companyId, 'Facebook', {
        full_name: payload.full_name || `FB Lead ${payload.leadgen_id}`,
        phone_number: payload.phone_number || payload.phone || '',
        email: payload.email || '',
        city: payload.city || ''
      });
      return res.json({ success: true, ...result });
    }
    res.json({ success: true, message: "No actionable Meta leadgen object found." });
  } catch (e: any) {
    logger.error(`[Meta Webhook Error]:`, e);
    res.status(400).json({ error: 'Internal server error' });
  }
});

// Background crons initialization function (called once on server startup)
export function startLeadsBackgroundCrons() {
  const POLL_INTERVAL_MS = 15000;

  // 1. IndiaMART Poller Cron
  setInterval(async () => {
    try {
      logger.info("[Background Engine] Running IndiaMART Polling cron...");
      const activeImSources = await db.collection("lead_sources")
        .where("sourceType", "==", "indiamart")
        .get();

      for (const docSnap of activeImSources.docs) {
        const sourceData = docSnap.data();
        if (!sourceData.isActive) continue;

        // F-15 FIX: Mock lead payload — dev/test only, never runs in production
        if (process.env.NODE_ENV === 'production') {
          logger.info('[IndiaMart Poller] Real API integration pending. Skipping mock in production.');
          continue;
        }
        const mockIndiaMartPayload = {
          SENDER_NAME: `IM Lead ${Math.floor(Math.random() * 1000) + 1}`,
          SENDER_MOBILE: `+91992237${Math.floor(Math.random() * 900000) + 100000}`,
          SENDER_EMAIL: 'im_lead@mapi-indiamart.org',
          QUERY_MESSAGE: 'Interested in B2B packaging services.',
          SENDER_CITY: 'Pune'
        };

        const result = await processInboundLead(sourceData.companyId, 'IndiaMart', mockIndiaMartPayload);
        logger.info(`[IndiaMart Poller] Automated lead imported:`, result);

        await db.collection("lead_sources").doc(docSnap.ref.id).update({
          lastSyncedAt: FieldValue.serverTimestamp()
        });
      }
    } catch (err: any) {
      logger.error("[IndiaMART Cron Error]:", err.message);
    }
  }, POLL_INTERVAL_MS);

  // 2. Google Sheets Poller Cron
  setInterval(async () => {
    try {
      logger.info("[Background Engine] Running Google Sheets Polling cron...");
      const activeGsSources = await db.collection("lead_sources")
        .where("sourceType", "==", "googlesheets")
        .get();

      for (const docSnap of activeGsSources.docs) {
        const sourceData = docSnap.data();
        if (!sourceData.isActive) continue;

        // F-15 FIX: Mock sheet row — dev/test only, never runs in production
        if (process.env.NODE_ENV === 'production') {
          logger.info('[Google Sheets Poller] Real API integration pending. Skipping mock in production.');
          continue;
        }
        const mockSheetRow = {
          name: `Sheet Prospect ${Math.floor(Math.random() * 1000) + 1}`,
          phone: `+91988162${Math.floor(Math.random() * 900000) + 100000}`,
          email: 'sheet_lead@google-drive.com',
          comment: 'Luxury apartment interest from campaigns.',
          city: 'Mumbai'
        };

        const result = await processInboundLead(sourceData.companyId, 'GoogleSheets', mockSheetRow);
        logger.info(`[Google Sheets Poller] Automated lead imported:`, result);

        await db.collection("lead_sources").doc(docSnap.ref.id).update({
          lastSyncedAt: FieldValue.serverTimestamp()
        });
      }
    } catch (err: any) {
      logger.error("[Google Sheets Cron Error]:", err.message);
    }
  }, POLL_INTERVAL_MS);

  // 3. Night Hold Release Cron
  setInterval(async () => {
    try {
      const currentHour = new Date().getHours();
      if (currentHour >= 8 && currentHour < 22) {
        const heldLeads = await db.collection("leads")
          .where("holdOutboundTrigger", "==", true)
          .get();

        if (!heldLeads.empty) {
          logger.info(`[Night Hold Queue Release] Found ${heldLeads.size} leads to release. Triggering welcome sequences...`);
          for (const leadDoc of heldLeads.docs) {
            await db.collection("leads").doc(leadDoc.ref.id).update({
              holdOutboundTrigger: false,
              holdUntil: 'Released'
            });
          }
        }
      }
    } catch (err: any) {
      logger.error("[Night Hold Release Error]:", err.message);
    }
  }, POLL_INTERVAL_MS);
}

export default router;

