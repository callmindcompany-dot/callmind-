import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Plus, ChevronUp, ChevronDown, Eye, EyeOff, Lock, Smartphone, Info, Clock,
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import {
  usePostCallFormOptions,
  useUpdatePostCallOption,
  useAddPostCallOption,
  suggestValue,
  type PostCallOption,
  type OptionKind,
} from '@/hooks/usePostCallFormOptions';

/**
 * Where an admin shapes the form a telecaller fills after every call.
 *
 * The preview on the right is not decoration. Every option here is written into
 * mobile source today, so the only way to see a change was to publish it and
 * pick up a phone. An admin renaming five chips should be able to read the
 * result while typing.
 */

const SWATCHES = [
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#b45309', name: 'Amber' },
  { hex: '#9333ea', name: 'Purple' },
  { hex: '#e11d48', name: 'Rose' },
  { hex: '#475569', name: 'Slate' },
];

/** The company's own stages, for the interest mapping dropdown. */
function useCompanyStages(companyId: string | null) {
  return useQuery<string[]>({
    queryKey: ['companyStages', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('team_settings')
        .select('leads_statuses')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.leads_statuses;
      return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

function humanOffset(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`;
  const days = Math.round(minutes / 1440);
  return days === 1 ? '1 day' : days === 7 ? '1 week' : `${days} days`;
}

interface GroupProps {
  title: string;
  hint: string;
  kind: OptionKind;
  options: PostCallOption[];
  stages: string[];
  companyId: string | null;
  canEdit: boolean;
}

const OptionGroup = React.memo(({
  title, hint, kind, options, stages, companyId, canEdit,
}: GroupProps) => {
  const update = useUpdatePostCallOption(companyId);
  const add = useAddPostCallOption(companyId);
  const [newLabel, setNewLabel] = useState('');
  const [newOffset, setNewOffset] = useState('60');

  const rows = useMemo(
    () => [...options].sort((a, b) => a.sort_order - b.sort_order),
    [options],
  );

  const patch = (id: string, p: Parameters<typeof update.mutate>[0]['patch']) =>
    update.mutate({ id, patch: p }, {
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Not saved'),
    });

  /** Swap sort_order with the neighbour, so order is a property of the data. */
  const move = (index: number, direction: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    patch(a.id, { sort_order: b.sort_order });
    patch(b.id, { sort_order: a.sort_order });
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const value = suggestValue(label, options.map(o => o.value));
    const offset = kind === 'followup' ? Number(newOffset) : undefined;
    if (kind === 'followup' && (!Number.isFinite(offset) || (offset as number) <= 0)) {
      toast.error('Give the preset a number of minutes.');
      return;
    }
    add.mutate(
      {
        kind, label, value,
        sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 1,
        color: kind === 'followup' ? null : SWATCHES[options.length % SWATCHES.length].hex,
        offset_minutes: kind === 'followup' ? offset : null,
      },
      {
        onSuccess: () => {
          setNewLabel('');
          toast.success(`Added "${label}". Reports will record it as "${value}".`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Not added'),
      },
    );
  };

  return (
    <section className="bg-white border border-gray-100 rounded-3xl p-6 space-y-5">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <p className="text-[11px] font-medium text-slate-400 mt-1 max-w-xl leading-relaxed">{hint}</p>
      </div>

      <div className="space-y-2">
        {rows.map((o, i) => (
          <div
            key={o.id}
            className={`flex flex-wrap items-center gap-2 rounded-2xl border p-3 transition-colors ${
              o.is_active ? 'border-gray-100 bg-white' : 'border-dashed border-gray-200 bg-slate-50/60'
            }`}
          >
            <div className="flex flex-col">
              <button
                type="button" disabled={!canEdit || i === 0} onClick={() => move(i, -1)}
                aria-label="Move up"
                className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"
              ><ChevronUp size={13} /></button>
              <button
                type="button" disabled={!canEdit || i === rows.length - 1} onClick={() => move(i, 1)}
                aria-label="Move down"
                className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"
              ><ChevronDown size={13} /></button>
            </div>

            <input
              value={o.label}
              disabled={!canEdit}
              onChange={(e) => patch(o.id, { label: e.target.value })}
              className="flex-1 min-w-[140px] px-3 py-1.5 bg-slate-50 border border-gray-100 focus:bg-white focus:border-brand-500 rounded-xl text-xs font-bold outline-none text-slate-800 disabled:opacity-60"
            />

            {kind !== 'followup' && (
              <div className="flex items-center gap-1">
                {SWATCHES.map(s => (
                  <button
                    key={s.hex}
                    type="button"
                    disabled={!canEdit}
                    title={s.name}
                    aria-label={`${s.name} for ${o.label}`}
                    onClick={() => patch(o.id, { color: s.hex })}
                    style={{ backgroundColor: s.hex }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      o.color === s.hex ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            )}

            {kind === 'followup' && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-300" />
                <input
                  type="number" min={1}
                  value={o.offset_minutes ?? 0}
                  disabled={!canEdit}
                  onChange={(e) => patch(o.id, { offset_minutes: Number(e.target.value) || 1 })}
                  className="w-20 px-2 py-1.5 bg-slate-50 border border-gray-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-brand-500"
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  min · {humanOffset(o.offset_minutes ?? 0)}
                </span>
              </div>
            )}

            {kind === 'interest' && (
              <select
                value={o.maps_to_stage ?? ''}
                disabled={!canEdit}
                onChange={(e) => patch(o.id, { maps_to_stage: e.target.value || null })}
                className="px-2 py-1.5 bg-slate-50 border border-gray-100 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-brand-500"
              >
                {/* Not choosing is a real answer: leadStageMapping matches the
                    company's own stage names when nothing is set here. */}
                <option value="">Match automatically</option>
                {stages.map(s => <option key={s} value={s}>Move to {s}</option>)}
              </select>
            )}

            {/* The stored value, shown because it is what appears in Reports
                and it is the one thing that can never be changed. */}
            <span
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-300"
              title="Reports record this value. It cannot be changed, so renaming the label above is safe."
            >
              <Lock size={9} /> {o.value}
            </span>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => patch(o.id, { is_active: !o.is_active })}
              title={o.is_active ? 'Hide from the phone' : 'Show on the phone'}
              className={`ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${
                o.is_active
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {o.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
              {o.is_active ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder={kind === 'followup' ? 'New preset, e.g. Monday morning' : 'New option'}
            className="flex-1 min-w-[180px] px-3 py-2 bg-slate-50 border border-gray-100 focus:bg-white focus:border-brand-500 rounded-xl text-xs font-bold outline-none placeholder-slate-300"
          />
          {kind === 'followup' && (
            <input
              type="number" min={1} value={newOffset}
              onChange={(e) => setNewOffset(e.target.value)}
              className="w-24 px-3 py-2 bg-slate-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
              aria-label="Minutes from now"
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={add.isPending || newLabel.trim() === ''}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      )}
    </section>
  );
});
OptionGroup.displayName = 'OptionGroup';

/** The phone, drawn from the same rows the editor is writing. */
const Preview = React.memo(({ options }: { options: PostCallOption[] }) => {
  const active = (kind: OptionKind) =>
    options.filter(o => o.kind === kind && o.is_active).sort((a, b) => a.sort_order - b.sort_order);

  const outcomes = active('outcome');
  const interests = active('interest');
  const followups = active('followup');

  const chip = (label: string, color: string | null, on: boolean) => (
    <span
      key={label}
      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border"
      style={on
        ? { backgroundColor: color ?? '#0f172a', borderColor: color ?? '#0f172a', color: '#fff' }
        : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}
    >
      {label}
    </span>
  );

  return (
    <div className="sticky top-6">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone size={13} className="text-slate-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          What the telecaller sees
        </span>
      </div>

      <div className="mx-auto w-full max-w-[300px] rounded-[36px] border-8 border-slate-900 bg-white shadow-xl overflow-hidden">
        <div className="bg-slate-900 h-6 flex items-center justify-center">
          <div className="w-16 h-1.5 rounded-full bg-slate-700" />
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center py-3 rounded-2xl bg-emerald-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Call ended</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">02:14</p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Outcome</p>
            <div className="flex flex-wrap gap-1.5">
              {outcomes.length === 0
                ? <span className="text-[10px] font-bold text-rose-500">Every outcome is turned off — the form cannot be filled.</span>
                : outcomes.map((o, i) => chip(o.label, o.color, i === 0))}
            </div>
          </div>

          <div className="opacity-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Interest <span className="text-slate-300">· only if connected</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {interests.length === 0
                ? <span className="text-[10px] font-bold text-slate-400">None shown.</span>
                : interests.map((o, i) => chip(o.label, o.color, i === 0))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Call back</p>
            <div className="flex flex-wrap gap-1.5">
              {followups.map(o => chip(o.label, null, false))}
              <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-dashed border-slate-300 text-slate-500">
                Pick date…
              </span>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Note templates</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {options.filter(o => o.kind === 'note_template' && o.is_active).map(o => (
                <span key={o.id} className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  ＋ {o.label}
                </span>
              ))}
            </div>
            <div className="h-10 rounded-xl bg-slate-50 border border-slate-100 p-2 text-[9px] text-slate-400 font-mono">
              Type call notes...
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-center font-medium text-slate-400 leading-relaxed max-w-[300px] mx-auto">
        A real-time drawing of the phone screen from the configured rows.
      </p>
    </div>
  );
});
Preview.displayName = 'Preview';

export const PostCallFormSettings = React.memo(({
  companyId, canEdit,
}: { companyId: string | null; canEdit: boolean }) => {
  const { data: options = [], isLoading, isError, error } = usePostCallFormOptions(companyId);
  const { data: stages = [] } = useCompanyStages(companyId);

  const byKind = (kind: OptionKind) => options.filter(o => o.kind === kind);

  if (isError) {
    return (
      <div className="bg-rose-50/60 border border-rose-100 rounded-3xl p-6 text-center">
        <p className="text-[11px] font-black uppercase tracking-widest text-rose-700">
          The post-call form could not load
        </p>
        <p className="mt-1 text-[11px] font-medium text-rose-600">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-64 rounded-3xl bg-slate-50 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-3xl p-6">
        <h2 className="text-sm font-black uppercase tracking-widest">Post-call form</h2>
        <p className="text-[11px] font-medium text-slate-300 mt-2 max-w-2xl leading-relaxed">
          What a telecaller is asked after every call. Rename anything into any
          language — the reports keep working, because they match a stored value
          that never changes, shown beside each row.
        </p>
      </div>

      {stages.length === 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
            This company has no lead stages set up, so a finished call cannot
            move the lead anywhere. Set them under Lead Workflow first.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-5">
          <OptionGroup
            title="Outcome"
            hint="Did the phone get picked up. One tap, asked on every call — anything other than a connected call ends the form here."
            kind="outcome" options={byKind('outcome')}
            stages={stages} companyId={companyId} canEdit={canEdit}
          />
          <OptionGroup
            title="Interest"
            hint="What they said, asked only when the call connected. Each one can move the lead to one of your own stages; left on automatic, it matches your stage names."
            kind="interest" options={byKind('interest')}
            stages={stages} companyId={companyId} canEdit={canEdit}
          />
          <OptionGroup
            title="Call back presets"
            hint="One-tap follow-up times, in minutes from the end of the call. A specific date and time is always available beside them."
            kind="followup" options={byKind('followup')}
            stages={stages} companyId={companyId} canEdit={canEdit}
          />
          <OptionGroup
            title="Note templates"
            hint="Pre-written note snippets telecallers can tap to insert at their cursor (e.g. 'Quote sent', 'Site visit', 'Budget low')."
            kind="note_template" options={byKind('note_template')}
            stages={stages} companyId={companyId} canEdit={canEdit}
          />

          <div className="flex items-start gap-3 bg-slate-50 border border-gray-100 rounded-2xl p-4">
            <Lock size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Options can be turned off but not deleted. Every call already
              recorded still refers to them, and removing one would change the
              shape of last month's reports without saying so.
            </p>
          </div>
        </div>

        <Preview options={options} />
      </div>
    </div>
  );
});
PostCallFormSettings.displayName = 'PostCallFormSettings';
