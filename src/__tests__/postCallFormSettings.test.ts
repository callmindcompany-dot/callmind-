import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { suggestValue } from '@/hooks/usePostCallFormOptions';

describe('suggestValue', () => {
  it('turns a label into a stable ASCII value', () => {
    expect(suggestValue('Left a voicemail', [])).toBe('Left A Voicemail');
    expect(suggestValue('call back', [])).toBe('Call Back');
  });

  it('gives a Devanagari label a value somebody can still type', () => {
    // The value ends up in calls.outcome and in every chart legend and SQL
    // query afterwards. A label typed in Marathi must not become a stored
    // value that nobody can search for.
    const v = suggestValue('बोलणं झालं', []);
    expect(v).toBe('Option');
    expect(v).toMatch(/^[\x20-\x7E]+$/);
  });

  it('mixes scripts without producing an empty value', () => {
    expect(suggestValue('Hot लीड', [])).toBe('Hot');
  });

  it('never collides with a value already in use', () => {
    // Two options sharing a stored value would make one chart slice with two
    // labels and no way to say which the caller meant.
    expect(suggestValue('Voicemail', ['Voicemail'])).toBe('Voicemail 2');
    expect(suggestValue('Voicemail', ['Voicemail', 'Voicemail 2'])).toBe('Voicemail 3');
    expect(suggestValue('बोलणं', ['Option'])).toBe('Option 2');
  });

  it('strips punctuation that would need escaping later', () => {
    expect(suggestValue("Didn't answer — 2nd try", [])).toBe('Didn T Answer 2nd Try');
  });
});

describe('the settings screen tells the truth about what it can change', () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
  const strip = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '')
     .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
     .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const ui = strip(read('src/components/settings/PostCallFormSettings.tsx'));
  const hook = strip(read('src/hooks/usePostCallFormOptions.ts'));

  it('never offers to edit the stored value', () => {
    // Postgres refuses it, so an input bound to `value` would be a control
    // that always fails — and the failure would arrive as a toast after the
    // admin had already typed a new name.
    expect(ui).not.toMatch(/patch\([^)]*\{\s*value:/);
    expect(hook).not.toMatch(/'value'/);
  });

  it('never offers to delete an option', () => {
    expect(ui).not.toMatch(/\.delete\(/);
    expect(hook).not.toMatch(/\.delete\(/);
  });

  it('checks the row count, because RLS refuses without an error', () => {
    // supabase-js resolves a write blocked by RLS with no error and no rows.
    // Without this the screen reports a save that never happened, which is
    // exactly what a telecaller opening the page would see.
    const guards = [...hook.matchAll(/data\.length === 0/g)].length;
    const writes = [...hook.matchAll(/\.(update|insert)\(/g)].length;
    expect(writes).toBeGreaterThanOrEqual(2);
    expect(guards).toBe(writes);
  });

  it('shows the stored value beside each row', () => {
    // The admin has to be able to see why renaming is safe, and which string
    // their reports are actually keyed on.
    expect(ui).toContain('{o.value}');
  });

  it('lets an interest map to nothing at all', () => {
    // "Match automatically" is a real answer: decideStage matches the
    // company's own stage names when no mapping is set. Forcing a choice would
    // make every company pick something on day one.
    expect(ui).toContain('Match automatically');
  });

  it('warns when the company has no stages to map to', () => {
    expect(ui).toMatch(/no lead stages/i);
  });
});

describe('the hand-maintained types match the database', () => {
  const types = fs.readFileSync(
    path.join(process.cwd(), 'src', 'types', 'supabase.ts'), 'utf8');

  it('no longer declares team_settings columns the table does not have', () => {
    // Checked against information_schema on the live database. These six were
    // declared and do not exist; TypeScript approved inserts Postgres would
    // have rejected.
    const block = types.slice(
      types.indexOf('team_settings: {'),
      types.indexOf('post_call_form_options: {'),
    );
    for (const phantom of ['team_name', 'field_labels', 'custom_fields', 'gemini_keys']) {
      expect(block, phantom).not.toContain(`${phantom}:`);
    }
  });

  it('declares the team_settings columns that do exist', () => {
    const block = types.slice(
      types.indexOf('team_settings: {'),
      types.indexOf('post_call_form_options: {'),
    );
    for (const real of ['leads_statuses', 'default_stage', 'assignment_mode', 'field_aliases']) {
      expect(block, real).toContain(`${real}:`);
    }
  });

  it('does not offer value or kind on an update', () => {
    const block = types.slice(types.indexOf('post_call_form_options: {'));
    expect(block).toMatch(/Update: Partial<Omit<[\s\S]*?'value' \| 'kind'/);
  });
});
