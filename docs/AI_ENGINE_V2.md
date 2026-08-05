# CALLMIND CRM — AI ENGINE ARCHITECTURE V2 (`AI_ENGINE_V2.md`)

> **Status:** Built
> **Implemented in:** `src/routes/ai.ts`, `src/lib/aiRouter.ts`, `src/hooks/useAIFaqs.ts`, `src/__tests__/aiRouter.test.ts`
> **Last verified:** 2026-08-01

**Author:** Chief AI Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Google Gemini Integration via Express AI Router (`aiRouter.ts`)


---

## ━━ 1. AI SUBSYSTEM ARCHITECTURE ━━

```
[Client / Mobile App] ──► [6-Layer Guardrail (`aiGuardrail.ts`)]
                                      │
                                      ▼
                      [Round-Robin Key Pool (`aiRouter.ts`)]
                      ├── Key 1: Gemini 1.5 Flash
                      ├── Key 2: Gemini 1.5 Pro
                      └── Key 3: Fallback Key
                                      │
                                      ▼
                      [Cost & Usage Tracking (`aiUsage.ts`)]
```

---

## ━━ 2. AI CAPABILITIES INVENTORY ━━

1. **AI Lead Scoring (`aiLeadScorer`):** Calculates conversion probability (0–100%) and tags leads as `HOT`, `WARM`, or `COLD`.
2. **AI Call Summarizer (`aiSummarizer`):** Transforms telecaller voice dictations/notes into structured 2-sentence CRM summaries.
3. **AI CSV Mapper (`aiMapper`):** Automatically maps non-standard CSV headers (`Mob No`, `Cust Name`) to standard database fields.
4. **AI Objection Handler (`aiObjectionHandler`):** Generates real-time sales battlecards for pricing and competitor objections.
5. **AI Smart Reply Generator (`aiReplyGenerator`):** Generates 3 contextual response options (Formal, Friendly, Urgent) for WhatsApp/Email.
6. **AI Sales Forecast (`aiForecastEngine`):** Projects end-of-month collected revenue in INR (₹) using weighted pipeline data.
7. **AI Churn Risk Detector (`aiChurnPredictor`):** Flags inactive tenant accounts at risk of dropping subscriptions within 30 days.

---

**CTO Approval:** AI Engine V2 specifications locked for production implementation.
