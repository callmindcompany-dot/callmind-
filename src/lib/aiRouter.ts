import { GeminiKey, AiTaskType } from '../types/aiKeys';
import { inspectUserPrompt } from './aiGuardrail';

// Internal round-robin index counters for each task type
const taskRoundRobinIndices: Record<AiTaskType, number> = {
  draft: 0,
  sentiment: 0,
  bulk: 0,
  chat: 0,
};

// In-memory key failure cooldown map (keyId -> timestamp when cooldown expires)
const keyCooldowns: Map<string, number> = new Map();
const COOLDOWN_DURATION_MS = 60_000; // 1 minute cooldown on failure/rate-limit

/**
 * Reads initial keys from environment variables (VITE_GEMINI_KEY_1..10, GEMINI_KEY_1..10, or VITE_GEMINI_API_KEY)
 */
export function getEnvGeminiKeys(): GeminiKey[] {
  const keys: GeminiKey[] = [];
  const allTasks: AiTaskType[] = ['draft', 'sentiment', 'bulk', 'chat'];

  // Check 1 to 10 slot environment keys
  for (let i = 1; i <= 10; i++) {
    const viteKey = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env[`VITE_GEMINI_KEY_${i}`] as string | undefined)
      : undefined;
    const processKey = typeof process !== 'undefined' && process.env
      ? process.env[`GEMINI_KEY_${i}`] || process.env[`VITE_GEMINI_KEY_${i}`]
      : undefined;

    const keyVal = (viteKey || processKey || '').trim();
    if (keyVal) {
      keys.push({
        id: `env-key-${i}`,
        key: keyVal,
        tasks: [...allTasks],
        isActive: true,
      });
    }
  }

  // Fallback to legacy single key if pool is empty
  if (keys.length === 0) {
    const singleViteKey = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;
    const singleProcessKey = typeof process !== 'undefined' && process.env
      ? process.env.GEMINI_API_KEY
      : undefined;

    const fallbackKey = (singleViteKey || singleProcessKey || '').trim();
    if (fallbackKey) {
      keys.push({
        id: 'env-key-default',
        key: fallbackKey,
        tasks: [...allTasks],
        isActive: true,
      });
    }
  }

  return keys;
}

/**
 * Filter available active keys for a specific task, excluding keys currently in cooldown
 */
export function getAvailableKeysForTask(task: AiTaskType, customKeys?: GeminiKey[]): GeminiKey[] {
  const pool = (customKeys && customKeys.length > 0) ? customKeys : getEnvGeminiKeys();
  const now = Date.now();

  // Filter active keys that support the task and are not cooling down
  const candidateKeys = pool.filter((k) => {
    if (!k.isActive || !k.key) return false;
    // Task matching
    const supportsTask = k.tasks.length === 0 || k.tasks.includes(task);
    if (!supportsTask) return false;

    // Check cooldown
    const cooldownUntil = keyCooldowns.get(k.id);
    if (cooldownUntil && cooldownUntil > now) {
      return false; // Still cooling down
    }
    return true;
  });

  // Fallback: If all specific keys for task are cooling down or inactive, try any active key
  if (candidateKeys.length === 0) {
    return pool.filter(k => k.isActive && k.key);
  }

  return candidateKeys;
}

/**
 * Select next API Key for a task using Round-Robin load balancing
 */
export function getApiKeyForTask(task: AiTaskType, customKeys?: GeminiKey[]): string | null {
  const candidates = getAvailableKeysForTask(task, customKeys);
  if (candidates.length === 0) return null;

  const currentIndex = taskRoundRobinIndices[task] % candidates.length;
  taskRoundRobinIndices[task] = (currentIndex + 1) % candidates.length;

  return candidates[currentIndex].key;
}

/**
 * Failover Execution Engine
 * Tries candidates sequentially. If a key encounters rate-limiting or API error,
 * it marks the key for temporary cooldown and immediately fails over to the next key.
 */
export async function executeAiTask<T>(
  task: AiTaskType,
  runner: (apiKey: string, keyId: string) => Promise<T>,
  customKeys?: GeminiKey[]
): Promise<T> {
  const candidates = getAvailableKeysForTask(task, customKeys);

  if (candidates.length === 0) {
    throw new Error(`No active Gemini API keys available for task group '${task}'. Please add an active key in Settings.`);
  }

  let lastError: any = null;

  // Try each candidate in round-robin sequence
  const startIdx = taskRoundRobinIndices[task] % candidates.length;

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const candidateIdx = (startIdx + attempt) % candidates.length;
    const selectedKey = candidates[candidateIdx];

    try {
      // Update round robin pointer
      taskRoundRobinIndices[task] = (candidateIdx + 1) % candidates.length;
      
      const result = await runner(selectedKey.key, selectedKey.id);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Router] Key '${selectedKey.id}' failed for task '${task}'. Triggering failover...`, err?.message || err);
      // Mark key in cooldown
      keyCooldowns.set(selectedKey.id, Date.now() + COOLDOWN_DURATION_MS);
    }
  }

  throw lastError || new Error(`All available Gemini keys failed for task '${task}'.`);
}

/**
 * Strict CRM Chatbot Guardrails & CallMind Web App Guide Engine
 */
export function validateCrmPrompt(prompt: string, task: AiTaskType): {
  isValid: boolean;
  safePrompt: string;
  rejectionReason?: string;
} {
  const check = inspectUserPrompt(prompt);

  if (!check.isSafe) {
    return {
      isValid: false,
      safePrompt: '',
      rejectionReason: check.rejectionMessage || 'Security guardrail violation'
    };
  }

  const sanitized = check.sanitizedPrompt;

  const callmindUserGuideSystemContext = `You are CallMind Assistant, the official AI guide for the CallMind Web App telecalling & CRM platform.
Your primary role is to guide users (telecallers, sales reps, managers, admins) step-by-step on how to use every option, feature, button, and tab in the CallMind Web App.

CRITICAL SECURITY & SECRET PROTECTION RULES:
1. NEVER expose, reveal, or leak any API Keys (Gemini keys, Twilio SID/Auth tokens), Database credentials, JWT tokens, environment variables, or private Founder secrets.
2. If asked about API keys, passwords, or secrets, politely refuse and state: "API Keys and credentials are securely managed by the Founder in backend settings and cannot be displayed."
3. Keep responses strictly limited to CallMind Web App usage (Leads management, Telecalling, Pipeline Kanban, Attendance, Custom Fields, WhatsApp Drafts, Reminders, Reports, Settings).
4. Always structure instructions in clear numbered steps (1️⃣ Step 1, 2️⃣ Step 2, 3️⃣ Step 3) using helpful Hinglish/English.
5. ALWAYS keep all responses VERY SHORT (maximum 2-3 short bullet lines), concise, direct, and written strictly in English script (Hinglish/English). Do not write long paragraphs.

CALLMIND WEB APP MODULES GUIDE REFERENCE:
- Leads Page: View lead tables, search/filter, virtualized list, add custom fields, inline edit lead status (New, Contacted, Interested, Call Back, Converted, Rejected).
- Pipeline Board: Drag-and-drop lead cards between pipeline columns, trigger direct WhatsApp/Call, time filters (Today/This Week).
- Communication Page: Auto-generate WhatsApp follow-up drafts, send emails, log conversation history.
- Calls Page: Initiate phone calls via tel: link, log call durations, view AI call summaries.
- Attendance Page: Telecaller shift punch-in / punch-out, track location and device info logs.
- Reports Page: Export lead CSV spreadsheets, conversion metrics, performance timelines.
- Settings: Managed by Founder (Twilio credentials, Gemini API key pool for task-assigned load balancing, team seats, Data wipe, GDPR export).

User Question: `;

  return {
    isValid: true,
    safePrompt: callmindUserGuideSystemContext + sanitized
  };
}
