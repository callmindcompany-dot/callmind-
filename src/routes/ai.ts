import { logger } from '../lib/logger';
import express from 'express';
import { db, auth, FieldValue, MockTimestamp, supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { masterFounderEmail, FOUNDER_OWNERS } from '../constants';
import { executeAiTask, validateCrmPrompt } from '../lib/aiRouter';
import { AiTaskType } from '../types/aiKeys';

const router = express.Router();

// API Route for AI Generation (Server-Side Guardrail & Multi-Key Pool Routing)
router.post('/generate', async (req, res) => {
  const { prompt, idToken, featureType, task } = req.body;

  // Determine target task group ('draft' | 'sentiment' | 'bulk' | 'chat')
  let targetTask: AiTaskType = 'draft';
  if (task && ['draft', 'sentiment', 'bulk', 'chat'].includes(task)) {
    targetTask = task as AiTaskType;
  } else if (featureType === 'waDrafts' || featureType === 'draft') {
    targetTask = 'draft';
  } else if (featureType === 'sentiment') {
    targetTask = 'sentiment';
  } else if (featureType === 'bulk') {
    targetTask = 'bulk';
  } else if (featureType === 'chat') {
    targetTask = 'chat';
  }

  // Strict CRM Guardrail Validation
  const validation = validateCrmPrompt(prompt, targetTask);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.rejectionReason || 'Invalid prompt' });
  }

  const safePrompt = validation.safePrompt;

  try {
    // Auth Validation via Supabase / Firebase Shim
    let userId: string;
    let userEmail: string | undefined;

    if (!isPlaceholder) {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(idToken);
      if (authError || !authUser) {
        return res.status(401).json({ error: 'Unauthorized — invalid token' });
      }
      userId = authUser.id;
      userEmail = authUser.email;
    } else {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
      userEmail = decodedToken.email;
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userData = userDoc.data() || {};
    const companyId: string | undefined = userData.company_id || userData.companyId;

    // God mode is the CallMind staff allow-list, and nothing else.
    //
    // `role === "founder"` used to grant it. That role belongs to whoever signs
    // up and creates a company (src/AuthContext.tsx), so every customer has
    // one -- meaning the person most likely to use AI heavily was the one
    // exempted from the credit limit, and their Gemini usage came out of our
    // margin rather than their plan. Same mistake, in a cheaper place, as the
    // one that let a customer impersonate another tenant.
    //
    // `tester` is left in deliberately: it is only ever set for internal
    // accounts (USER_PERSPECTIVE_TESTERS), not by signup.
    const normalisedEmail = (userEmail || "").toLowerCase();
    const staffEmails = [masterFounderEmail, ...FOUNDER_OWNERS].map((e) => e.toLowerCase());

    const isGodMode = staffEmails.includes(normalisedEmail) || userData.role === "tester";
    const isWhatsAppDraft = targetTask === 'draft';

    // 2. Global kill-switch
    if (!isGodMode && process.env.AI_ENABLED === 'false') {
      return res.status(503).json({ error: "AI features are currently disabled by administrator." });
    }

    // 3. Meter the request against the company's plan.
    //
    // This used to read an `app_config/features` document that no migration
    // ever created, and keyed it on `plan_status` -- a status, not a plan --
    // defaulting to the string "Team Essential", which matched nothing. The
    // limit therefore never applied. consume_ai_credit resolves the real plan
    // from plan_limits and increments ai_usage atomically in one roundtrip,
    // so two concurrent requests cannot both slip past the cap.
    //
    // WhatsApp drafts are metered too; they were previously exempt entirely.
    if (!isGodMode) {
      if (!companyId) {
        return res.status(400).json({ error: "No company is associated with this account." });
      }

      const { data: credit, error: creditError } = await supabaseAdmin.rpc('consume_ai_credit', {
        p_company_id: companyId,
        p_kind: isWhatsAppDraft ? 'draft' : 'total',
      });

      if (creditError) {
        logger.error('[AI] Could not check the AI usage allowance', creditError);
        return res.status(503).json({ error: "Could not verify your AI allowance. Please try again." });
      }

      if (!credit?.allowed) {
        return res.status(403).json({
          error: credit?.reason === 'unknown_company'
            ? "No plan is active for this company."
            : "You have used all the AI credits included in your plan this month.",
          metric: credit?.metric,
          limit: credit?.limit,
          usage: credit?.used,
        });
      }
    }

    // 4. Call AI API using Multi-Key Pool & Load Balancer with Failover
    logger.info(`AI Request for task '${targetTask}' from ${userId} (length: ${prompt.length})`);
    let aiResponse = "";

    try {
      aiResponse = await executeAiTask(targetTask, async (apiKey, keyId) => {
        logger.info(`Routing task '${targetTask}' to key '${keyId}'`);
        const { GoogleGenAI } = await import('@google/genai');
        const client = new GoogleGenAI({ apiKey });
        
        const fallbackModels = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash"];
        let textOutput = "";
        let lastModelErr: any = null;

        for (const modelName of fallbackModels) {
          try {
            const geminiResult = await client.models.generateContent({
              model: modelName,
              contents: safePrompt,
              generationConfig: { maxOutputTokens: 512 }
            } as any);
            if (geminiResult && geminiResult.text) {
              textOutput = geminiResult.text;
              break;
            }
          } catch (mErr) {
            lastModelErr = mErr;
            logger.warn(`[Gemini Model Fallback] Model '${modelName}' unavailable, trying fallback model...`);
          }
        }

        if (!textOutput) {
          throw lastModelErr || new Error("All Gemini fallback models failed.");
        }
        return textOutput;
      });
    } catch (apiErr: any) {
      logger.error(`[Gemini AI Pool] All keys failed for task '${targetTask}'. Falling back to simulation:`, apiErr);
      let mockResponse = `[MOCK] [AI Analysis for: ${prompt.substring(0, 50)}...] 
      Based on the lead context, we recommend a high-priority follow-up. 
      Sentiment: Positive. 
      Action: Schedule call for tomorrow 10 AM.`;

      if (isWhatsAppDraft) {
        mockResponse = `[MOCK] Hi! CallMind se follow-up kar raha hoon. Aapne flat ke liye inquiry ki thi, kya hum aaj baat kar sakte hain? Let me know!`;
      }
      aiResponse = mockResponse + "\n\n(Note: Fallback response due to temporary live connection issue)";
    }

    // 5. Increment Usage
    if (!isWhatsAppDraft) {
      await userRef.update({
        aiCallsCount: FieldValue.increment(1),
        lastAiCallAt: FieldValue.serverTimestamp()
      });
    }

    const { sanitizeAiOutput } = await import('../lib/aiGuardrail');
    res.json({
      success: true,
      response: sanitizeAiOutput(aiResponse),
    });

  } catch (error: any) {
    logger.error("AI Generation Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
