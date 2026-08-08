import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Placeholder values that reached real records.
 *
 * '+91 98765 43210' appeared ten times across the mobile app and once on the
 * web. Most were harmless display fallbacks, but one was not: the post-call
 * handler wrote it into calls.phone whenever the lead had no number, producing
 * a call record to a number nobody had dialled. schedulerService did the same
 * on the web with '+91 99999 99999'.
 *
 * The pattern is always the same shape — `x?.field || '<something plausible>'`
 * — and it is invisible in review because the plausible thing looks like data.
 *
 * This checks the specific literals that have already caused it, plus the two
 * invented figures the live monitor used to show.
 */

const ROOTS = [
  path.join(process.cwd(), 'src'),
  path.join(process.cwd(), 'mobile', 'src'),
];
const EXTRA_FILES = [path.join(process.cwd(), 'mobile', 'App.tsx')];

/** Literals that have shipped as if they were data. */
const FORBIDDEN = [
  '98765 43210',
  '9876543210',
  '99999 99999',
  '9999999999',
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Comments describe the removed value; only code counts. */
function code(file: string): string {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('placeholder data', () => {
  const files = [...ROOTS.flatMap((r) => sourceFiles(r)), ...EXTRA_FILES];

  it('finds the files it is meant to check', () => {
    // Without this the suite passes by scanning nothing.
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no invented phone numbers left in code', () => {
    const offenders: string[] = [];

    // Two places use a number as an illustration rather than as a value:
    // aiMapper's prompt teaches the model what an Indian mobile looks like, and
    // the API docs show a sample request body. Both are meant to be read by a
    // person or a model, never written to a record.
    const ILLUSTRATIVE = [
      // Teaches the model what an Indian mobile looks like.
      path.join('src', 'utils', 'aiMapper.ts'),
      // Sample request body in the API documentation.
      path.join('src', 'website', 'data', 'DocsData.ts'),
      // Shows the reader how to type a phone search.
      path.join('src', 'components', 'search', 'GlobalSearchModal.tsx'),
      // A row in the downloadable CSV template.
      path.join('src', 'components', 'SmartImportModal.tsx'),
      // Only reached when isPlaceholder is true — Supabase is not configured,
      // so there is no real data to show and the screen would otherwise be
      // blank in local development.
      path.join('src', 'services', 'whatsappInbox.service.ts'),
    ];

    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      if (ILLUSTRATIVE.some((i) => rel.endsWith(i))) continue;

      const src = code(file);
      for (const literal of FORBIDDEN) {
        if (!src.includes(literal)) continue;
        // A placeholder= prop on an input is a hint to the user, not data.
        const asPlaceholderProp = new RegExp(`placeholder[^\\n]{0,40}${literal.replace(/ /g, '\\s')}`);
        if (asPlaceholderProp.test(src)) continue;
        offenders.push(`${rel} -> ${literal}`);
      }
    }

    expect(
      offenders,
      'these read as data. One of them was written into calls.phone.',
    ).toEqual([]);
  });

  it('does not restore the live monitor figures', () => {
    // Every agent on every screen showed avgTalkTime "2m 15s", checkIn
    // "09:00 AM", breakTime "25m" and a fixed 24-hour activity curve.
    const monitor = code(path.join(process.cwd(), 'src', 'hooks', 'useAgentMonitor.ts'));
    for (const literal of ["'2m 15s'", "'09:00 AM'", "'25m'", "'2h 15m'", "'09:15 AM'", "'05:45 PM'"]) {
      expect(monitor, `${literal} is back in useAgentMonitor`).not.toContain(literal);
    }
  });
});
