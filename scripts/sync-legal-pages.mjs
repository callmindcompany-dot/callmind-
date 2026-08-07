/**
 * Pushes src/config/legal.ts into the legal_pages table.
 *
 *   node scripts/sync-legal-pages.mjs           # show what would change
 *   node scripts/sync-legal-pages.mjs --write   # apply it
 *
 * legal_pages is not where the documents are authored — src/config/legal.ts is.
 * The table exists because useLegalCompliance compares its `version` against
 * user_acceptances to decide whether someone must accept a document again.
 *
 * The rows currently in it were seeded by a migration and describe a product
 * this is not: "14-Layer Security (SQLCipher)", "no cross-tenant bleeding" as a
 * guarantee, and audio handling that does not match the code. They are live and
 * being shown to customers. This replaces them.
 *
 * Refuses to write while ENTITY still has placeholders, because a published
 * policy that names nobody is worse than the one it replaces.
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';

// The config is TypeScript; rather than add a build step for one script, read
// the compiled values through tsx. Run with: npx tsx scripts/sync-legal-pages.mjs
const { LEGAL_DOCUMENTS, LEGAL_SLUGS, ENTITY, ENTITY_IS_COMPLETE, renderLegalText } =
  await import('../src/config/legal.ts');

const write = process.argv.includes('--write');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env; there is no fallback.');
  process.exit(1);
}

if (write && !ENTITY_IS_COMPLETE) {
  console.error(
    'Refusing to write: ENTITY in src/config/legal.ts still has placeholders.\n' +
      `  proprietor: ${ENTITY.proprietor}\n` +
      `  address:    ${ENTITY.address}\n\n` +
      'Fill those in, have the text reviewed, then run again.',
  );
  process.exit(1);
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const existing = await c.query(
  `SELECT slug, language, status, version, title, length(content) AS len
     FROM public.legal_pages ORDER BY slug`,
);
console.log('currently live:');
console.table(existing.rows);

console.log(write ? '\napplying:' : '\nwould write (pass --write to apply):');
const planned = LEGAL_SLUGS.map((slug) => {
  const doc = LEGAL_DOCUMENTS[slug];
  return {
    slug,
    version: doc.version,
    title: doc.title,
    len: renderLegalText(doc).length,
  };
});
console.table(planned);

if (!write) {
  await c.end();
  process.exit(0);
}

for (const slug of LEGAL_SLUGS) {
  const doc = LEGAL_DOCUMENTS[slug];
  // The live table's unique constraint is (slug, language, status).
  await c.query(
    `INSERT INTO public.legal_pages (slug, title, content, version, language, status, published_at, updated_at)
     VALUES ($1, $2, $3, $4, 'English', 'published', NOW(), NOW())
     ON CONFLICT (slug, language, status) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           version = EXCLUDED.version,
           updated_at = NOW()`,
    [slug, doc.title, renderLegalText(doc), doc.version],
  );
  console.log(`  ${slug} -> v${doc.version}`);
}

console.log(
  '\nDone. Raising a version asks every user to accept again, which is what ' +
    'useLegalCompliance is for.',
);
await c.end();
