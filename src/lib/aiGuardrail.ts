// Anti-Spam Rate Limiter Constants (Max 5 msgs per 60 seconds)
export const MAX_CHAT_MESSAGES_PER_MINUTE = 5;
export const CHAT_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes lock
// The address customers are actually pointed at. Was a personal gmail, which
// the chatbot handed out to users while the footer and tests used the domain
// address — confirmed by the owner that support@callmind.app is the monitored
// inbox.
export const SUPPORT_EMAIL = 'support@callmind.app';

// User Session Message Timestamps map for rate limiting
const userMessageTimestampsMap: Map<string, number[]> = new Map();

/**
 * Checks if a user is spamming chat messages (> 5 msgs / 60 seconds).
 * Returns { isSpamming: boolean, lockedUntil?: number }
 */
export function checkChatRateLimit(userKey: string): { isSpamming: boolean; lockedUntil?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (userMessageTimestampsMap.get(userKey) || []).filter(t => now - t < windowMs);

  if (timestamps.length >= MAX_CHAT_MESSAGES_PER_MINUTE) {
    const lockedUntil = now + CHAT_LOCK_DURATION_MS;
    return { isSpamming: true, lockedUntil };
  }

  timestamps.push(now);
  userMessageTimestampsMap.set(userKey, timestamps);
  return { isSpamming: false };
}

// Secret keywords and patterns that must NEVER be exposed or leaked to users
const SECRET_LEAK_PATTERNS = [
  /api[_\s-]?key/i,
  /gemini[_\s-]?key/i,
  /twilio[_\s-]?token|account[_\s-]?sid/i,
  /supabase[_\s-]?(url|key|anon|service)/i,
  /database[_\s-]?(password|url|connection|schema)/i,
  /environment[_\s-]?(var|variable|env)/i,
  /secret/i,
  /jwt[_\s-]?token/i,
  /auth[_\s-]?token/i,
  /master[_\s-]?founder/i,
  /bearer\s+token/i,
  /v1\/routing/i,
  /show\s+(me\s+)?(the\s+)?key/i,
  /print\s+env/i,
  /reveal\s+(system\s+prompt|instructions|secret)/i
];

// Off-topic non-CallMind Web App query patterns
const OFF_TOPIC_PATTERNS = [
  /write\s+(a\s+)?(poem|story|recipe|joke|riddle)/i,
  /solve\s+(this\s+)?(math|equation|calculus|physics)/i,
  /who\s+won|capital\s+of|weather\s+in|news\s+about/i,
  /write\s+a\s+(python|javascript|java|c\+\+|html|css|sql)\s+(script|code|program|function)/i,
  /how\s+to\s+cook|recipe\s+for/i,
  /chatgpt|claude|openai|anthropic/i
];

// Jailbreak and Prompt Injection patterns
const JAILBREAK_PATTERNS = [
  /ignore\s+.*instructions/i,
  /you\s+are\s+now|new\s+persona|act\s+as|pretend\s+to\s+be/i,
  /developer\s+mode|jailbreak|DAN/i,
  /disregard\s+rules/i,
  /system\s+override/i
];

export interface GuardrailResult {
  isSafe: boolean;
  sanitizedPrompt: string;
  rejectionMessage?: string;
}

/**
 * Validates and sanitizes user input against secret leakage, off-topic requests, and prompt injections.
 */
export function inspectUserPrompt(prompt: string): GuardrailResult {
  if (!prompt || typeof prompt !== 'string') {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: 'अवैध संदेश प्राप्त झाला आहे. कृपया पुन्हा प्रयत्न करा.'
    };
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: 'संदेश रिकामा असू शकत नाही.'
    };
  }

  if (trimmed.length > 2500) {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: 'संदेश खूप मोठा आहे (जास्तीत जास्त २५०० अक्षरे).'
    };
  }

  // 1. Check Anti-Jailbreak / Prompt Injection
  if (JAILBREAK_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: '🛡️ सुरक्षा इशारा: अनधिकृत सिस्टीम ओवरराईड प्रयत्न डिटेक्ट झाला आहे. मी केवळ CallMind वेब ॲप वापराबद्दल मार्गदर्शन करतो.'
    };
  }

  // 2. Check Secret Leakage Attempts
  if (SECRET_LEAK_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: '🔒 सुरक्षा इशारा: मी CallMind AI असिस्टंट आहे. सुरक्षा नियमांनुसार API Keys, Passwords किंवा सिस्टीम सिक्रेट्स शेअर केले जाऊ शकत नाहीत. मी तुम्हाला CallMind वेब ॲप वापरण्यास मदत करू शकतो.'
    };
  }

  // 3. Check Off-Topic Non-CallMind App Queries
  if (OFF_TOPIC_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return {
      isSafe: false,
      sanitizedPrompt: '',
      rejectionMessage: '💡 मी CallMind AI असिस्टंट आहे. माझे काम फक्त CallMind वेब ॲपच्या वापराविषयी (उदा. कॉल सेव्ह करणे, लीड अपडेट करणे, फॉलो-अप्स) मार्गदर्शन करणे आहे. मी ॲपच्या बाहेरील विषयांवर उत्तरे देऊ शकत नाही.'
    };
  }

  // Sanitize input (strip dangerous script tags / raw SQL injections)
  let cleanPrompt = trimmed.replace(/<[^>]*>?/gm, '');
  cleanPrompt = cleanPrompt.replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b/gi, '');
  cleanPrompt = cleanPrompt.replace(/[<>{}[\]]/g, '').trim();

  return {
    isSafe: true,
    sanitizedPrompt: cleanPrompt
  };
}

/**
 * Ensures AI responses never contain leaked API keys or secret strings
 */
export function sanitizeAiOutput(output: string): string {
  if (!output) return '';
  // Mask any accidental API key formats (AIzaSy..., sk-..., etc.)
  let safe = output.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '••••••••••••••••••••••••••••••••••••');
  safe = safe.replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, '••••••••••••••••••••');
  return safe;
}
