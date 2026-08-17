import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

/**
 * The company's post-call form, as rows an admin can edit.
 *
 * `value` is what lands in calls.outcome and calls.interest; `label` is what
 * the telecaller reads. The two are separate on purpose and the database
 * refuses to change a value after insert — three SQL objects match
 * calls.outcome literally, so a rename that changed the stored string would
 * take connect rate to zero in every report without raising anything.
 */

export type OptionKind = 'outcome' | 'interest' | 'followup' | 'note_template';

export interface PostCallOption {
  id: string;
  company_id: string;
  kind: OptionKind;
  /** Immutable. Shown to admins as read-only, and only to explain reports. */
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  /** Only for kind='interest': which of the company's own stages to move to. */
  maps_to_stage: string | null;
  /** Only for kind='followup': minutes from now. */
  offset_minutes: number | null;
}

export function usePostCallFormOptions(companyId: string | null) {
  return useQuery<PostCallOption[]>({
    queryKey: ['postCallFormOptions', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Seed on first read. A company created before this table existed has no
      // rows, and an empty settings screen looks broken rather than new —
      // the function is idempotent and returns how many it added.
      const { error: seedError } = await supabase.rpc('ensure_post_call_form_defaults', {
        p_company_id: companyId,
      });
      if (seedError) throw seedError;

      const { data, error } = await supabase
        .from('post_call_form_options')
        .select('*')
        .eq('company_id', companyId)
        .order('kind')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as PostCallOption[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

/** The editable fields. `value` and `kind` are absent because they cannot change. */
export type OptionPatch = Partial<
  Pick<PostCallOption, 'label' | 'color' | 'sort_order' | 'is_active' | 'maps_to_stage' | 'offset_minutes'>
>;

export function useUpdatePostCallOption(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: OptionPatch }) => {
      const { data, error } = await supabase
        .from('post_call_form_options')
        .update(patch)
        .eq('id', id)
        .select('id');
      if (error) throw error;

      // A write refused by RLS returns no error and no rows. Without this
      // check the screen would report a save that never happened — which is
      // exactly what a telecaller opening this page would see.
      if (!data || data.length === 0) {
        throw new Error('That change was not saved. Only an admin can edit the post-call form.');
      }
      return data[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['postCallFormOptions', companyId] }),
  });
}

export function useAddPostCallOption(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (option: {
      kind: OptionKind;
      value: string;
      label: string;
      color?: string | null;
      sort_order: number;
      offset_minutes?: number | null;
    }) => {
      if (!companyId) throw new Error('No company');
      const { data, error } = await supabase
        .from('post_call_form_options')
        .insert({ ...option, company_id: companyId })
        .select('id, value');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('That option was not added. Only an admin can edit the post-call form.');
      }
      return data[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['postCallFormOptions', companyId] }),
  });
}

/**
 * A stored value for a new option, derived from its label.
 *
 * The value is permanent and ends up in reports, so it is ASCII, stable, and
 * readable in a chart legend. A label typed in Devanagari would otherwise
 * become a stored value nobody can type into a SQL query later.
 */
export function suggestValue(label: string, existing: string[]): string {
  const base = label
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')      // drop anything not plain ASCII
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  // A label with no ASCII in it at all still needs a value.
  const seed = base || 'Option';
  if (!existing.includes(seed)) return seed;

  let n = 2;
  while (existing.includes(`${seed} ${n}`)) n++;
  return `${seed} ${n}`;
}
