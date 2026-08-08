import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The mobile build configuration.
 *
 * The app had never been built. There was no eas.json, no EAS project id, and
 * no .env — so EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY were
 * both empty strings and the app would have started and connected to nothing.
 * versionCode sat at 108 for a release that never happened.
 *
 * These check the parts that fail late and expensively: a build that gets
 * rejected at submission, or an app that installs and cannot reach anything.
 */

const MOBILE = path.join(process.cwd(), 'mobile');
const appJson = () => JSON.parse(fs.readFileSync(path.join(MOBILE, 'app.json'), 'utf8')).expo;
const easJson = () => JSON.parse(fs.readFileSync(path.join(MOBILE, 'eas.json'), 'utf8'));

describe('mobile build config', () => {
  it('has an eas.json with the three profiles', () => {
    const eas = easJson();
    expect(Object.keys(eas.build)).toEqual(
      expect.arrayContaining(['development', 'preview', 'production']),
    );
    // preview must install on a phone directly; production goes to Play.
    expect(eas.build.preview.android.buildType).toBe('apk');
    expect(eas.build.production.android.buildType).toBe('app-bundle');
  });

  it('lets exactly one thing own the version code', () => {
    const eas = easJson();
    const expo = appJson();

    // production has autoIncrement, so EAS moves the number. A versionCode in
    // app.json as well means the two can disagree, and Play rejects a duplicate.
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(
      expo.android?.versionCode,
      'app.json must not pin versionCode while eas.json autoIncrements it',
    ).toBeUndefined();
  });

  it('has the identity Play needs', () => {
    const expo = appJson();
    expect(expo.android?.package).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.icon).toBeTruthy();
    expect(expo.android?.adaptiveIcon?.foregroundImage).toBeTruthy();
  });

  it('ships every asset the manifest points at', () => {
    const expo = appJson();
    const referenced = [
      expo.icon,
      expo.splash?.image,
      expo.android?.adaptiveIcon?.foregroundImage,
      expo.android?.adaptiveIcon?.backgroundImage,
    ].filter(Boolean) as string[];

    const missing = referenced.filter((rel) => !fs.existsSync(path.join(MOBILE, rel)));
    expect(missing, 'the manifest names files that are not there').toEqual([]);
  });

  it('documents the environment without committing it', () => {
    expect(fs.existsSync(path.join(MOBILE, '.env.example'))).toBe(true);

    // Only meaningful when the file exists. Written as one boolean first, which
    // failed on a checkout with no mobile/.env — the common case — and said
    // "expected false not to be false", which describes nothing.
    if (fs.existsSync(path.join(MOBILE, '.env'))) {
      const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
      expect(gitignore, 'mobile/.env exists and must be gitignored').toMatch(/^\.env/m);
    }

    const example = fs.readFileSync(path.join(MOBILE, '.env.example'), 'utf8');
    expect(example).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(example).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    // EXPO_PUBLIC_ values are embedded in the bundle and readable by anyone who
    // downloads it.
    expect(example.toLowerCase()).not.toContain('service_role');
  });

  it('does not fall back to a placeholder Supabase project', () => {
    const client = fs.readFileSync(path.join(MOBILE, 'src/services/supabase.ts'), 'utf8');
    // A dummy URL here would make a misconfigured build look like it worked.
    expect(client).not.toMatch(/supabase\.co['"`]\s*;/);
    expect(client).toContain('EXPO_PUBLIC_SUPABASE_URL');
  });
});
