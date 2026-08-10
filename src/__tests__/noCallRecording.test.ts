import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Nothing in this product records, plays, or offers call audio.
 *
 * That is a settled product decision, not a gap waiting to be filled. The
 * mobile app dials through the phone's own SIM with `tel:` and hands off to the
 * system dialler, so it never holds the audio stream; recording would mean
 * routing calls through a cloud provider, which brings a per-minute cost, a
 * telecom licensing question in India, and a third party holding customers'
 * conversations.
 *
 * The claim is published in a lot of places, which is what makes a stray
 * player expensive:
 *
 *   the privacy policy       "We do not record calls and do not store call
 *                            audio."
 *   the app permissions      "it does not record audio"
 *   the site footer          "Zero Audio Storage"
 *   the security page        "we do NOT route, record, or store any call audio"
 *   the pricing FAQ, the FAQ list, the solutions page
 *
 * Three things contradicted it. CallsPage rendered an <audio controls> element
 * headed "Call Recording" whenever selectedCall.recordingUrl was set — nothing
 * has ever written that column, so it never appeared, but it was a working
 * player waiting for someone to fill it in. The Terms told customers they
 * needed consent "for any call recording you attach", implying attaching one
 * was possible. And the capabilities list advertised "Voice notes — record a
 * note by speaking", citing mobile/src/screens/68_VoiceNotesModal.tsx, a file
 * that does not exist and never did.
 */

const ROOT = process.cwd();

const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Every .ts/.tsx under a directory, comments stripped. */
function sources(dir: string): { rel: string; text: string }[] {
  const out: { rel: string; text: string }[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        walk(full);
      } else if (/\.tsx?$/.test(e.name)) {
        out.push({ rel: path.relative(ROOT, full), text: code(path.relative(ROOT, full)) });
      }
    }
  };
  walk(path.join(ROOT, dir));
  return out;
}

describe('no call recording anywhere', () => {
  const web = sources('src');
  const mobile = sources('mobile/src');
  const all = [...web, ...mobile];

  it('finds the files it is meant to check', () => {
    expect(all.length).toBeGreaterThan(80);
  });

  it('ships no audio player', () => {
    // An <audio> element is the give-away: there is nothing else in this
    // product for one to play.
    const offenders = all.filter((f) => /<audio[\s>]/.test(f.text)).map((f) => f.rel);
    expect(offenders, 'an audio element means something intends to play a recording').toEqual([]);
  });

  it('never reads the recording column', () => {
    // calls.recording_url exists and nothing writes it. Reading it is how a
    // player gets built back.
    const offenders = all
      .filter((f) => /recording_url|recordingUrl/.test(f.text))
      .map((f) => f.rel)
      // The hand-maintained type file may still declare the column; declaring
      // it is not the same as using it.
      .filter((rel) => !rel.endsWith(path.join('types', 'supabase.ts')));

    expect(offenders, 'nothing should consume a recording URL').toEqual([]);
  });

  it('asks for no microphone permission', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'mobile/app.json'), 'utf8')).expo;
    const perms: string[] = appJson.android?.permissions ?? [];
    // android.permissions is a whitelist, so this is the whole set.
    expect(perms).not.toContain('RECORD_AUDIO');
    expect(perms.join(' ').toUpperCase()).not.toContain('AUDIO');
  });

  it('advertises no feature that would need audio', () => {
    const capabilities = code('src/website/data/capabilities.ts');
    // Voice notes cited a screen file that does not exist.
    expect(capabilities).not.toMatch(/Voice notes/i);
    expect(capabilities).not.toContain('68_VoiceNotesModal');

    const terms = code('src/config/legal.ts');
    expect(terms, 'the Terms must not imply a recording can be attached').not.toMatch(
      /call recording you attach/i,
    );
  });

  it('still says so in the places customers read', () => {
    // The positive half. Removing the contradictions is only useful if the
    // promise itself is still on the page.
    const policy = fs.readFileSync(path.join(ROOT, 'src/config/legal.ts'), 'utf8');
    expect(policy).toMatch(/do not record calls and do not store call audio/i);

    const permissions = fs.readFileSync(
      path.join(ROOT, 'mobile/src/screens/11_AppPermissionsScreen.tsx'),
      'utf8',
    );
    expect(permissions).toMatch(/does not record audio/i);
  });
});
