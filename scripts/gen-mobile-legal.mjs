/**
 * Copies src/config/legal.ts into the mobile app.
 *
 *   node scripts/gen-mobile-legal.mjs
 *
 * The mobile app is a separate npm package with no path alias back into the web
 * source, so it cannot import the config directly. Rather than let a second copy
 * be edited by hand — which is exactly how five different versions of these
 * documents came to exist — the copy is generated, marked as generated, and
 * checked by src/__tests__/legalSync.test.ts.
 *
 * Edit src/config/legal.ts. Never edit the mobile copy.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'src', 'config', 'legal.ts');
const TARGET = path.join(process.cwd(), 'mobile', 'src', 'config', 'legal.ts');

const banner = `// GENERATED FILE — DO NOT EDIT.
//
// Copied from src/config/legal.ts by scripts/gen-mobile-legal.mjs.
// Change the source and re-run the script; src/__tests__/legalSync.test.ts
// fails the build if this drifts.

`;

const source = fs.readFileSync(SOURCE, 'utf8');
fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, banner + source);

console.log(`wrote ${path.relative(process.cwd(), TARGET)} (${source.length} bytes)`);
