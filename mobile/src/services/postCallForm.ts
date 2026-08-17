import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { CallIntent } from './leadStageMapping';

/**
 * The post-call form, as the company configured it.
 *
 * Cached hard, because this is read between calls and a telecaller in a
 * basement must never be blocked from logging one. The order of preference is
 * fresh, then stale, then the built-in defaults — and the defaults are exactly
 * what the app used to hardcode, so a company that has never opened the
 * settings screen sees no change at all.
 *
 * The one thing that must survive every fallback is `value`: it is what lands
 * in calls.outcome and what every report matches on. Labels can differ between
 * a cached config and a fresh one without consequence; values cannot, and the
 * database refuses to change them.
 */

const CACHE_KEY = 'callmind.postCallForm.v1';
const TTL_MS = 6 * 60 * 60 * 1000;

export type OptionKind = 'outcome' | 'interest' | 'followup' | 'note_template';

export interface FormOption {
  kind: OptionKind;
  value: string;
  label: string;
  color: string | null;
  sortOrder: number;
  mapsToStage: string | null;
  offsetMinutes: number | null;
}

export interface PostCallForm {
  outcomes: FormOption[];
  interests: FormOption[];
  followups: FormOption[];
  noteTemplates: FormOption[];
  /** Which stage each intent should move the lead to, where the admin chose. */
  stageByIntent: Partial<Record<CallIntent, string>>;
  /** True when this came from cache or defaults rather than the network. */
  stale: boolean;
}

/**
 * What the app shipped with. Values match the strings already in calls.outcome,
 * so falling back here never breaks a report.
 */
const DEFAULTS: Omit<PostCallForm, 'stale'> = {
  outcomes: [
    { kind: 'outcome', value: 'Connected',      label: 'Connected',      color: '#0d9488', sortOrder: 1, mapsToStage: null, offsetMinutes: null },
    { kind: 'outcome', value: 'No Answer',      label: 'No Answer',      color: '#b45309', sortOrder: 2, mapsToStage: null, offsetMinutes: null },
    { kind: 'outcome', value: 'Busy',           label: 'Busy',           color: '#9333ea', sortOrder: 3, mapsToStage: null, offsetMinutes: null },
    { kind: 'outcome', value: 'Invalid Number', label: 'Invalid Number', color: '#e11d48', sortOrder: 4, mapsToStage: null, offsetMinutes: null },
    { kind: 'outcome', value: 'Wrong Number',   label: 'Wrong Number',   color: '#2563eb', sortOrder: 5, mapsToStage: null, offsetMinutes: null },
  ],
  interests: [
    { kind: 'interest', value: 'Interested',      label: 'Interested',      color: '#0d9488', sortOrder: 1, mapsToStage: null, offsetMinutes: null },
    { kind: 'interest', value: 'Call Back Later', label: 'Call Back Later', color: '#b45309', sortOrder: 2, mapsToStage: null, offsetMinutes: null },
    { kind: 'interest', value: 'Not Interested',  label: 'Not Interested',  color: '#e11d48', sortOrder: 3, mapsToStage: null, offsetMinutes: null },
  ],
  followups: [
    { kind: 'followup', value: 'in_2_hours',  label: 'In 2 hours',    color: null, sortOrder: 1, mapsToStage: null, offsetMinutes: 120 },
    { kind: 'followup', value: 'tomorrow_10', label: 'Tomorrow 10am', color: null, sortOrder: 2, mapsToStage: null, offsetMinutes: 1440 },
    { kind: 'followup', value: 'in_3_days',   label: 'In 3 days',     color: null, sortOrder: 3, mapsToStage: null, offsetMinutes: 4320 },
    { kind: 'followup', value: 'next_week',   label: 'Next week',     color: null, sortOrder: 4, mapsToStage: null, offsetMinutes: 10080 },
  ],
  noteTemplates: [
    { kind: 'note_template', value: 'Quote sent',               label: 'Quote sent',               color: null, sortOrder: 1, mapsToStage: null, offsetMinutes: null },
    { kind: 'note_template', value: 'Site visit requested',     label: 'Site visit requested',     color: null, sortOrder: 2, mapsToStage: null, offsetMinutes: null },
    { kind: 'note_template', value: 'Budget low / Negotiation', label: 'Budget low / Negotiation', color: null, sortOrder: 3, mapsToStage: null, offsetMinutes: null },
    { kind: 'note_template', value: 'Decision maker busy',      label: 'Decision maker busy',      color: null, sortOrder: 4, mapsToStage: null, offsetMinutes: null },
  ],
  stageByIntent: {},
};

export function defaultForm(): PostCallForm {
  return { ...DEFAULTS, stale: true };
}

/** The interest values the app understands, mapped to their intent. */
const INTENT_BY_INTEREST: Record<string, CallIntent> = {
  'Interested': 'interested',
  'Call Back Later': 'callback',
  'Not Interested': 'not_interested',
};

interface Row {
  kind: OptionKind;
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  maps_to_stage: string | null;
  offset_minutes: number | null;
}

function shape(rows: Row[]): Omit<PostCallForm, 'stale'> {
  const pick = (kind: OptionKind): FormOption[] => rows
    .filter(r => r.kind === kind && r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(r => ({
      kind: r.kind,
      value: r.value,
      label: r.label,
      color: r.color,
      sortOrder: r.sort_order,
      mapsToStage: r.maps_to_stage,
      offsetMinutes: r.offset_minutes,
    }));

  const stageByIntent: Partial<Record<CallIntent, string>> = {};
  for (const r of rows) {
    if (r.kind !== 'interest' || !r.maps_to_stage) continue;
    const intent = INTENT_BY_INTEREST[r.value];
    if (intent) stageByIntent[intent] = r.maps_to_stage;
  }

  return {
    outcomes: pick('outcome'),
    interests: pick('interest'),
    followups: pick('followup'),
    noteTemplates: pick('note_template'),
    stageByIntent,
  };
}

let memory: { form: Omit<PostCallForm, 'stale'>; fetchedAt: number } | null = null;

export async function getPostCallForm(companyId: string): Promise<PostCallForm> {
  if (memory && Date.now() - memory.fetchedAt < TTL_MS) {
    return { ...memory.form, stale: false };
  }

  let cached = memory;
  if (!cached) {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_KEY}.${companyId}`);
      if (raw) cached = JSON.parse(raw);
    } catch {
      // A corrupt cache must not stop a call being logged.
    }
  }

  try {
    const { data, error } = await supabase
      .from('post_call_form_options')
      .select('kind, value, label, color, sort_order, is_active, maps_to_stage, offset_minutes')
      .eq('company_id', companyId);
    if (error) throw error;

    const rows = (data ?? []) as Row[];
    // An empty result is not a valid form -- it would render a screen with no
    // buttons. A company whose rows have not been seeded yet falls through to
    // the cache or the defaults instead.
    if (rows.length > 0) {
      const form = shape(rows);
      if (form.outcomes.length > 0) {
        memory = { form, fetchedAt: Date.now() };
        try {
          await AsyncStorage.setItem(`${CACHE_KEY}.${companyId}`, JSON.stringify(memory));
        } catch { /* storage full; the in-memory copy still serves this session */ }
        return { ...form, stale: false };
      }
    }
  } catch (err) {
    console.warn('[postCallForm] could not refresh, falling back', err);
  }

  if (cached?.form?.outcomes?.length) {
    return { ...cached.form, stale: true };
  }
  return defaultForm();
}

/** Called after an admin edits the form, so the next call picks it up. */
export function invalidatePostCallForm(): void {
  memory = null;
}

/** A preset's absolute time, from its offset. */
export function followUpAt(option: FormOption, now: Date = new Date()): string {
  const minutes = option.offsetMinutes ?? 0;
  const at = new Date(now.getTime() + minutes * 60_000);

  // Presets measured in whole days are meant as "tomorrow morning", not "this
  // time tomorrow" -- a call at 7pm should not schedule a 7pm callback.
  if (minutes >= 1440 && minutes % 1440 === 0) {
    at.setHours(10, 0, 0, 0);
  }
  return at.toISOString();
}
