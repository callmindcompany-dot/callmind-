import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every screen file is reachable, and every import is rendered.
 *
 * This is the failure this codebase produces most reliably, so it gets a test
 * rather than another round of manual auditing. When it was written the mobile
 * app had fifty-three screen files and twelve of them did nothing:
 *
 *   Imported in App.tsx and never rendered — 131_ScheduleCallbackSheet,
 *   64_AICallSummaryCard, 42_CallCompletedCard, 90_DeviceVerificationModal,
 *   17_CompanyJoinedSuccess. An import satisfies a reviewer skimming for
 *   "is this wired up?" and satisfies the bundler, and does nothing at all.
 *
 *   Never imported anywhere — 25_DeviceManagementScreen,
 *   26_ActivityTimelineScreen, 27_TrainingLearningScreen, 28_RateAppScreen,
 *   61_AnnouncementDetailScreen.
 *
 *   Duplicated — 61_AnnouncementDetailScreen against
 *   AnnouncementDetailScreen, and 59_InboxScreen against
 *   62_NotificationCenterScreen.
 *
 * The cost is not the dead code. It is that the app looks finished. Counting
 * files says fifty-three screens; counting what a telecaller can reach says
 * forty-one, and the gap is invisible until somebody checks by hand.
 *
 * A screen that is genuinely not ready should not exist yet. Delete it and
 * write it when the thing behind it exists — the ones removed had no table, no
 * rows and no writer between them.
 */

const MOBILE = path.join(process.cwd(), 'mobile');
const SCREENS = path.join(MOBILE, 'src', 'screens');

const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const app = strip(fs.readFileSync(path.join(MOBILE, 'App.tsx'), 'utf8'));
const screenFiles = fs.readdirSync(SCREENS).filter((f) => f.endsWith('.tsx'));

/** Everything under mobile/src, plus App.tsx, with comments removed. */
function allSource(): string {
  const out: string[] = [app];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
        out.push(strip(fs.readFileSync(full, 'utf8')));
      }
    }
  };
  walk(path.join(MOBILE, 'src'));
  return out.join('\n');
}

describe('mobile screens are reachable', () => {
  it('finds the screens it is meant to check', () => {
    // Guards the test itself: a wrong path would make every assertion below
    // pass over an empty list.
    expect(screenFiles.length).toBeGreaterThan(20);
  });

  it('renders everything App.tsx imports from screens', () => {
    const imports = [...app.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/src\/screens\/([^']+)'/g)];
    expect(imports.length, 'no screen imports found — this test needs updating').toBeGreaterThan(10);

    const unrendered: string[] = [];
    for (const [, names, file] of imports) {
      for (const raw of names.split(',')) {
        const name = raw.trim();
        // Types and row shapes are imported to be used in useState, not rendered.
        if (!name || name.startsWith('type ') || /Item$|^Announcement$/.test(name)) continue;
        if (!new RegExp(`<${name}[\\s/>]`).test(app)) unrendered.push(`${name} (${file})`);
      }
    }

    expect(
      unrendered,
      'imported and never rendered — the import makes it look wired up and it is not',
    ).toEqual([]);
  });

  it('imports every screen file that exists', () => {
    const source = allSource();
    const orphans = screenFiles
      .map((f) => f.replace(/\.tsx$/, ''))
      .filter((base) => !source.includes(base));

    expect(orphans, 'screen files nothing imports — delete them or wire them up').toEqual([]);
  });

  it('has no two screens for the same thing', () => {
    // 61_AnnouncementDetailScreen and AnnouncementDetailScreen were both
    // present, differing only in the numeric prefix, and only one was reachable.
    const bare = new Set(screenFiles.map((f) => f.replace(/^\d+_/, '').replace(/\.tsx$/, '')));
    expect(
      bare.size,
      'two screen files share a name once the number prefix is dropped',
    ).toBe(screenFiles.length);
  });
});
