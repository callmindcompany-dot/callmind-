import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * The company's own lead stages, as configured on the web.
 *
 * Cached, because this is read on the path a telecaller takes between calls and
 * a slow or absent network must never hold up a form. The cache is also the
 * safety net for the rule in leadStageMapping.ts: with no stage list at all the
 * mapping declines to write anything, so a lead would stop moving entirely
 * whenever the phone was offline.
 */

const CACHE_KEY = 'callmind.leadStages.v1';
const TTL_MS = 6 * 60 * 60 * 1000;   // six hours; stages change rarely

interface Cached {
  stages: string[];
  defaultStage: string | null;
  fetchedAt: number;
}

let memory: Cached | null = null;

async function readCache(companyId: string): Promise<Cached | null> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}.${companyId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed.stages)) return null;
    memory = parsed;
    return parsed;
  } catch {
    // A corrupt cache must not break a call log. Treated as absent.
    return null;
  }
}

async function writeCache(companyId: string, value: Cached): Promise<void> {
  memory = value;
  try {
    await AsyncStorage.setItem(`${CACHE_KEY}.${companyId}`, JSON.stringify(value));
  } catch {
    // Storage full or unavailable; the in-memory copy still serves this session.
  }
}

/** Only strings survive; leads_statuses is jsonb and holds whatever was written. */
function cleanStages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    .map(s => s.trim());
}

/**
 * Fetch the stages, preferring fresh and falling back to stale.
 *
 * A stale list is a much better answer than none: the stages a company had six
 * hours ago are almost certainly still its stages, whereas an empty list makes
 * the mapping decline and the lead stops moving.
 */
export async function getLeadStages(
  companyId: string,
): Promise<{ stages: string[]; defaultStage: string | null; stale: boolean }> {
  const cached = await readCache(companyId);
  const fresh = cached && Date.now() - cached.fetchedAt < TTL_MS;
  if (cached && fresh) {
    return { stages: cached.stages, defaultStage: cached.defaultStage, stale: false };
  }

  try {
    const { data, error } = await supabase
      .from('team_settings')
      .select('leads_statuses, default_stage')
      .eq('company_id', companyId)
      .maybeSingle();

    // maybeSingle, not single: a company that has never opened team settings
    // has no row, and single() reports that as an error.
    if (error) throw error;

    const stages = cleanStages(data?.leads_statuses);
    if (stages.length > 0) {
      const value: Cached = {
        stages,
        defaultStage: typeof data?.default_stage === 'string' ? data.default_stage : null,
        fetchedAt: Date.now(),
      };
      await writeCache(companyId, value);
      return { stages: value.stages, defaultStage: value.defaultStage, stale: false };
    }
  } catch (err) {
    console.warn('[workspaceStages] could not refresh stages, using cache', err);
  }

  if (cached) {
    return { stages: cached.stages, defaultStage: cached.defaultStage, stale: true };
  }
  return { stages: [], defaultStage: null, stale: false };
}

/** Called after a company edits its stages on the web. */
export function invalidateLeadStages(): void {
  memory = null;
}
