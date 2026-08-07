import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The browser must take its bearer token from the Supabase session.
 *
 * Five components were calling `user.getIdToken()` -- a Firebase method that
 * does not exist on a Supabase user. Written defensively as
 * `typeof user.getIdToken === 'function' ? ... : null`, it never threw; it just
 * produced null, so the Authorization header went out empty and every
 * /api/admin call returned 401. Remote wipe and bulk lead reassignment had
 * therefore never worked, and one call site did not check the response, so
 * removing a member silently left their leads behind.
 *
 * A defensive fallback around a method that is always absent is worse than the
 * crash would have been: it turns a wiring mistake into a permanent, quiet no-op.
 */

const SRC_DIR = path.join(process.cwd(), 'src');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes('__tests__')) acc.push(full);
  }
  return acc;
}

/** Firebase auth surfaces that have no Supabase equivalent on the client. */
const FIREBASE_CLIENT_APIS = [
  'getIdToken',
  'currentUser',
  'onAuthStateChanged',
  'signInWithEmailAndPassword',
  'createUserWithEmailAndPassword',
];

describe('client auth token', () => {
  const files = sourceFiles(SRC_DIR);

  it('never reaches for a Firebase auth method', () => {
    const offenders: string[] = [];

    for (const file of files) {
      // The server-side Firestore-shaped shim in src/lib/dbAdapter.ts and the
      // routes built on it are deliberately Firebase-shaped; this is about what
      // the browser calls on its own user object.
      if (file.includes(path.join('src', 'lib', 'dbAdapter'))) continue;
      if (file.includes(path.join('src', 'routes'))) continue;

      const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

      for (const api of FIREBASE_CLIENT_APIS) {
        if (new RegExp(`\\buser\\??\\.${api}\\b`).test(src)) {
          offenders.push(`${path.relative(process.cwd(), file)} -> user.${api}`);
        }
      }
    }

    expect(
      [...new Set(offenders)],
      'the Supabase user object has no such method, so this silently yields undefined',
    ).toEqual([]);
  });

  it('sends a bearer token that came from the Supabase session', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('Authorization')) continue;
      if (!/Bearer \$\{/.test(src)) continue;
      // The API docs playground renders a sample header from a key the reader
      // types in. It is display text, not a request this app sends.
      if (file.includes('ApiPlaygroundModal')) continue;
      // Somewhere in the file it must actually read a session.
      if (!/auth\.getSession\(\)/.test(src)) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }

    expect(
      offenders,
      'a file that sends an Authorization: Bearer header must obtain the token from supabase.auth.getSession()',
    ).toEqual([]);
  });
});
