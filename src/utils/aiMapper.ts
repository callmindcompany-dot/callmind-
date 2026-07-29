/**
 * aiMapper.ts
 * Gemini AI-powered column-mapping cross-checker for SmartImportModal.
 *
 * Priority:
 *   1. POST /api/ai/generate  (backend proxy – works in production)
 *   2. Direct Gemini 1.5 Flash via VITE_GEMINI_API_KEY (optional fallback)
 *   3. Silently returns [] if both unavailable
 */

// ── Public types ──────────────────────────────────────────────────────────────

export interface AICorrection {
  /** Exact CSV header name */
  column: string;
  /** The field key currently assigned */
  current: string;
  /** The field key AI recommends instead */
  suggested: string;
  /** Short human-readable reason (shown in the UI) */
  reason: string;
}

export interface AiMapperInput {
  headers: string[];
  parsedData: Record<string, string>[];
  mapping: Record<string, string>;
  /** Full list of valid CRM field keys + special tokens */
  allFieldKeys: string[];
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Calls the AI to review current column mappings and returns a list of
 * actionable corrections. Always resolves (never throws).
 */
export async function runAiMapper(input: AiMapperInput): Promise<AICorrection[]> {
  const prompt = buildPrompt(input);

  // 1. Try backend proxy with task: 'bulk'
  try {
    const response = await fetch('/api/ai/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        idToken:     'import',
        task:        'bulk',
        featureType: 'leadImport',
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { success: boolean; response: string };
      if (data.success && data.response) {
        const parsed = parseAiResponse(data.response, input.headers, input.allFieldKeys);
        if (parsed.length > 0) return parsed;
      }
    }
  } catch {
    /* fall through to next strategy */
  }

  // 2. Multi-key engine fallback using aiRouter for 'bulk' tasks
  try {
    const { executeAiTask } = await import('../lib/aiRouter');
    const text = await executeAiTask('bulk', async (apiKey) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      type GeminiResponse = {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const data = (await response.json()) as GeminiResponse;
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    });

    if (text) return parseAiResponse(text, input.headers, input.allFieldKeys);
  } catch {
    /* fail silently */
  }

  return [];
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt({ headers, parsedData, mapping, allFieldKeys }: AiMapperInput): string {
  const mappingLines = headers
    .map(h => {
      const samples = [0, 1, 2]
        .map(i => parsedData[i]?.[h])
        .filter(Boolean)
        .join(' | ');
      return `"${h}" → "${mapping[h] || 'customData'}"  samples: [${samples}]`;
    })
    .join('\n');

  return (
    `You are a CRM data mapping expert for an Indian telecalling CRM (CallMind).
Review the CSV-to-CRM column mapping below and find WRONG mappings based on actual data patterns.

Current mappings (CSV header → assigned field  |  sample values):
${mappingLines}

Available CRM field keys: ${allFieldKeys.join(', ')}
Special keys:
  "customData" = store in custom notes (use for unknown / informational columns)
  "__skip__"   = do not import this column

Rules you MUST follow:
1. If a column contains 10-digit Indian numbers (e.g. 9876543210) but is mapped to anything other than "phone" or "altPhone", flag it.
2. If multiple columns are mapped to "phone", suggest keeping the one with more valid 10-digit numbers as "phone" and change others to "altPhone" or "__skip__".
3. If a column has email@domain.com values but is mapped to something else, flag it.
4. If a column clearly contains city/state/region names but is mapped to notes, flag it.
5. Only include corrections you are HIGHLY CONFIDENT about. Do NOT flag correct mappings.
6. Return ONLY valid JSON — no markdown, no extra text.

Required output format:
{ "corrections": [{ "column": "exact CSV header", "current": "currentField", "suggested": "correctField", "reason": "short reason" }] }

If all mappings are correct, return: { "corrections": [] }`
  );
}

// ── Response parser ───────────────────────────────────────────────────────────

function parseAiResponse(
  text: string,
  headers: string[],
  allFieldKeys: string[],
): AICorrection[] {
  const headerSet   = new Set(headers);
  const fieldKeySet = new Set(allFieldKeys);

  const tryParse = (raw: string): AICorrection[] => {
    const obj = JSON.parse(raw) as { corrections?: unknown };
    if (!Array.isArray(obj.corrections)) return [];

    return obj.corrections.filter((c): c is AICorrection => {
      if (typeof c !== 'object' || c === null) return false;
      const correction = c as Partial<AICorrection>;
      return (
        typeof correction.column    === 'string' &&
        typeof correction.current   === 'string' &&
        typeof correction.suggested === 'string' &&
        typeof correction.reason    === 'string' &&
        headerSet.has(correction.column) &&
        fieldKeySet.has(correction.suggested) &&
        correction.suggested !== correction.current
      );
    });
  };

  // Attempt 1: full text (after stripping markdown fences)
  try {
    const cleaned = text.replace(/```(?:json)?\n?/g, '').trim();
    return tryParse(cleaned);
  } catch { /* try next */ }

  // Attempt 2: extract the first JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return tryParse(match[0]); } catch { /* ignore */ }
  }

  return [];
}
