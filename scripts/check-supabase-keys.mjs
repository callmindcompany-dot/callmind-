/**
 * Checks that .env holds the right two Supabase keys, without printing either.
 *
 *   node scripts/check-supabase-keys.mjs
 *
 * Both variables held the same anon key for a long time, and nothing said so.
 * supabaseAdmin therefore ran with the privileges of a logged-out visitor, and
 * every privileged path met row-level security and failed quietly: webhook lead
 * ingestion, the payment write-back after a verified Razorpay signature, the
 * admin routes, and the hourly trial-expiry job.
 *
 * Nothing here reveals a key. It reports what each one grants and whether the
 * two are the same string.
 */
import 'dotenv/config';

/** The role a Supabase JWT authenticates as. Null when it is not a JWT. */
function roleOf(key) {
  const parts = (key || '').split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

const anon = process.env.VITE_SUPABASE_ANON_KEY || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

const line = (label, ok, detail) =>
  console.log(`  ${ok ? 'OK  ' : 'BAD '} ${label.padEnd(34)} ${detail}`);

console.log('\nSupabase configuration\n');

line('VITE_SUPABASE_URL', !!url, url ? url.replace(/\/\/([^.]+)\./, '//****.') : 'not set');

const anonRole = roleOf(anon);
line(
  'VITE_SUPABASE_ANON_KEY',
  !!anon,
  !anon ? 'not set' : anonRole ? `role=${anonRole}` : 'set (opaque key)',
);

let problems = 0;

if (!service) {
  line('SUPABASE_SERVICE_ROLE_KEY', false, 'NOT SET');
  problems++;
} else if (service === anon) {
  line('SUPABASE_SERVICE_ROLE_KEY', false, 'same value as the anon key');
  problems++;
} else {
  const role = roleOf(service);
  if (role === null) {
    // sb_secret_... keys are opaque. Their prefix is the only signal.
    const looksSecret = service.startsWith('sb_secret_');
    line('SUPABASE_SERVICE_ROLE_KEY', looksSecret, looksSecret
      ? 'set (sb_secret key — cannot be decoded, prefix looks right)'
      : 'set, but neither a JWT nor an sb_secret_ key');
    if (!looksSecret) problems++;
  } else if (role !== 'service_role') {
    line('SUPABASE_SERVICE_ROLE_KEY', false, `role=${role} — this is the wrong key`);
    problems++;
  } else {
    line('SUPABASE_SERVICE_ROLE_KEY', true, 'role=service_role');
  }
}

// A service key in a VITE_ variable is shipped to every browser that loads the
// app, which hands anyone who opens devtools the whole database.
const leaked = Object.entries(process.env).filter(
  ([k, v]) => k.startsWith('VITE_') && v && service && v === service,
);
if (leaked.length) {
  line('service key exposure', false,
    `also set in ${leaked.map(([k]) => k).join(', ')} — VITE_ vars ship to the browser`);
  problems++;
}

console.log(
  problems === 0
    ? '\nAll good. Restart the server and the privileged paths will work.\n'
    : `\n${problems} problem${problems > 1 ? 's' : ''}. Copy the service_role key from ` +
      'Supabase -> Project Settings -> API (press Reveal), and put it in .env as ' +
      'SUPABASE_SERVICE_ROLE_KEY without a VITE_ prefix.\n',
);

process.exitCode = problems === 0 ? 0 : 1;
