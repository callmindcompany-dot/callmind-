/**
 * Checks that Cloudflare R2 is set up correctly, without ever printing a secret.
 *
 * Run it after filling in the four R2_* values in .env:
 *
 *   npm run check:r2
 *
 * It reports pass/fail per step. Paste the OUTPUT when asking for help --
 * never the keys themselves. Anything pasted into a chat log should be
 * treated as exposed, and this one credential opens every customer's documents.
 */

import 'dotenv/config';
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ok = (msg) => console.log(`\x1b[32m PASS \x1b[0m ${msg}`);
const bad = (msg, hint) => {
  console.log(`\x1b[31m FAIL \x1b[0m ${msg}`);
  if (hint) console.log(`        ${hint}`);
};
const warn = (msg, hint) => {
  console.log(`\x1b[33m WARN \x1b[0m ${msg}`);
  if (hint) console.log(`        ${hint}`);
};

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

console.log('\nCloudflare R2 check\n');

// 1. Are the values present at all? Report only length, never content.
const missing = Object.entries({
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  bad(`Missing in .env: ${missing.join(', ')}`, 'Fill these in and run again.');
  process.exit(1);
}
ok(`All four values present (secret is ${R2_SECRET_ACCESS_KEY.length} characters)`);

// A VITE_ prefixed copy would end up in the browser bundle.
const leaked = Object.keys(process.env).filter(
  (k) => k.startsWith('VITE_') && k.includes('R2'),
);
if (leaked.length) {
  bad(
    `These are exposed to the browser: ${leaked.join(', ')}`,
    'Remove the VITE_ prefix. Anything VITE_ is compiled into the client bundle.',
  );
} else {
  ok('No R2 value is exposed to the browser bundle');
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const testKey = `_healthcheck/${Date.now()}.txt`;
let uploaded = false;

try {
  // 2. Can we reach the bucket?
  try {
    await client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    ok(`Connected to bucket "${R2_BUCKET}"`);
  } catch (err) {
    bad(
      `Cannot reach bucket "${R2_BUCKET}" (${err.name})`,
      'Check the bucket name, the account id, and that the API token is scoped to this bucket.',
    );
    process.exit(1);
  }

  // 3. Write.
  const body = 'callmind r2 healthcheck';
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: testKey,
      Body: body,
      ContentType: 'text/plain',
    }),
  );
  uploaded = true;
  ok(`Upload works (${Buffer.byteLength(body)} bytes)`);

  // 4. Signed read. Documents are never public, so this is the only read path.
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: testKey }),
    { expiresIn: 900 },
  );
  const res = await fetch(url);
  if (res.ok && (await res.text()) === body) {
    ok('Signed download URL works (15 minute expiry)');
  } else {
    bad(`Signed URL returned HTTP ${res.status}`);
  }

  // 5. CORS. Missing CORS is the single most common reason browser uploads
  //    fail, and the browser-side error message does not say so.
  try {
    const cors = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
    const rules = cors.CORSRules ?? [];
    const origins = rules.flatMap((r) => r.AllowedOrigins ?? []);
    const methods = rules.flatMap((r) => r.AllowedMethods ?? []);

    if (!methods.includes('PUT')) {
      bad('CORS does not allow PUT', 'Browser uploads will fail. Add PUT to AllowedMethods.');
    } else if (origins.includes('*')) {
      warn('CORS allows any origin (*)', 'Restrict it to your own domains.');
    } else {
      ok(`CORS configured for: ${origins.join(', ')}`);
    }
  } catch (err) {
    bad(
      'No CORS policy on the bucket',
      'Browser uploads will fail. Bucket -> Settings -> CORS policy.',
    );
  }
} catch (err) {
  bad(`Unexpected error: ${err.name} - ${err.message}`);
} finally {
  if (uploaded) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: testKey }));
      ok('Cleaned up the test object');
    } catch {
      warn(`Could not delete the test object ${testKey}`, 'Remove it by hand.');
    }
  }
}

console.log('');
