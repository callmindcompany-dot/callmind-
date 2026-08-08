import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Gates that read a column nobody created.
 *
 * `profile.featureFlags` did not exist. No migration creates it, so AuthContext
 * resolved it to `{}` and every flag read from it was permanently undefined.
 * Three screens gated themselves on that:
 *
 *   SchedulerPage       `isFounder || featureFlags.scheduler` — collapsed to
 *                       isFounder, so the follow-up queue was visible to the
 *                       company owner and locked to every telecaller, above a
 *                       message telling them to ask an admin to enable it from
 *                       a control that does not exist.
 *   SequencesPage       `featureFlags.aiEnabled` — the AI parts of the workflow
 *                       builder always showed as unavailable.
 *   AIInsightsHub       `featureFlags.AI_ENABLED` — the kill switch always read
 *                       "off" and flipping it changed nothing.
 *
 * Sidebar computed `featureFlags[item.flag]` and then never read the result,
 * locking Sequences and Scheduler to god-mode accounts regardless.
 *
 * The real switch is companies.ai_enabled, which src/routes/ai.ts enforces.
 */

const SRC = path.join(process.cwd(), 'src');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const code = (file: string) =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('feature flags', () => {
  const files = sourceFiles(SRC);

  it('finds the files it is meant to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('nothing reads profile.featureFlags', () => {
    const offenders = files
      .filter((f) => /\bfeatureFlags\b/.test(code(f)))
      .map((f) => path.relative(process.cwd(), f));

    expect(
      offenders,
      'featureFlags comes from a column no migration creates, so any gate on it is permanently closed',
    ).toEqual([]);
  });

  it('the AI switch reads the column that the server enforces', () => {
    // companies.ai_enabled, created by 20260817000000_company_ai_toggle.sql and
    // checked in src/routes/ai.ts. A UI switch on anything else is decoration.
    for (const file of ['components/AIInsightsHub.tsx', 'components/SequencesPage.tsx']) {
      expect(code(path.join(SRC, file)), `${file} should read ai_enabled`).toContain('ai_enabled');
    }
    expect(code(path.join(SRC, 'routes', 'ai.ts'))).toContain('ai_enabled');
  });

  it('does not gate the scheduler on the founder role', () => {
    // isFounder is the tenant role the company creator gets. Gating on it hid
    // the follow-up queue from the people who make the calls.
    const scheduler = code(path.join(SRC, 'components', 'SchedulerPage.tsx'));
    expect(scheduler).not.toMatch(/isFounder\s*\|\|/);
  });
});
