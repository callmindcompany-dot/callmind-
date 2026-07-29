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
    const plan = userData.plan_status || "Team Essential";
    const aiUsage = userData.aiCallsCount || 0;
    
    const MASTER_FOUNDER = masterFounderEmail;
    const TESTER_EMAILS = FOUNDER_OWNERS;
    
    const isGodMode = userEmail === MASTER_FOUNDER || 
                      TESTER_EMAILS.includes(userEmail || "") ||
                      userData.role === "super_admin" ||
                      userData.role === "founder" ||
                      userData.role === "tester";
    const isWhatsAppDraft = targetTask === 'draft';

    // 2. Fetch Plan Config
    const configDoc = await db.collection("app_config").doc("features").get();
    const configData = configDoc.data();
    const planConfig = configData?.plans?.[plan];

    if (!planConfig && !isGodMode) {
      return res.status(400).json({ error: "Invalid plan configuration." });
    }

    // 2b. Global Kill-Switch Check
    if (!isGodMode) {
      if (!configData?.AI_ENABLED) {
        return res.status(503).json({ error: "AI features are currently disabled by administrator." });
      }
    }

    // 3. Check Limits
    if (!isGodMode && !isWhatsAppDraft) {
      if (userData.trial_start_date) {
        const startDate = (userData.trial_start_date as unknown as MockTimestamp).toDate();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() > startDate.getTime() + threeDaysInMs) {
          return res.status(403).json({ error: "Trial Expired" });
        }
      }

      if (planConfig.ai_limit !== -1 && aiUsage >= planConfig.ai_limit) {
        return res.status(403).json({ 
          error: "AI Limit Reached", 
          limit: planConfig.ai_limit,
          usage: aiUsage 
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
      usage: aiUsage + 1
    });

  } catch (error: any) {
    logger.error("AI Generation Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
