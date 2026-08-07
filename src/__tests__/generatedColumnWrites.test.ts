import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Postgres rejects an INSERT or UPDATE that names a GENERATED ALWAYS column,
 * with 428C9. There is no partial failure and no warning: the whole statement
 * errors.
 *
 * `audit_logs.timestamp` became one of those in 20260718_audit_logs_columns.sql
 * -- it mirrors created_at so the readers that order by `timestamp` keep
 * working without every call site changing at once. Twelve writers were still
 * setting it explicitly, so applying that migration would have broken every
 * audit event in the product at the moment it landed.
 *
 * This finds the generated columns by reading the migrations, then checks that
 * nothing in src/ writes to one.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
const SRC_DIR = path.join(process.cwd(), 'src');

/** table -> generated column names, taken from the migrations themselves. */
function generatedColumns(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();

  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))) {
    const sql = fs
      .readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      .replace(/--[^\n]*/g, '');

    // ALTER TABLE x ADD COLUMN "y" <type> GENERATED ALWAYS AS (...) STORED
    const alterRe =
      /ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?[^;]*?GENERATED ALWAYS AS/gis;
    for (const m of sql.matchAll(alterRe)) {
      if (!found.has(m[1])) found.set(m[1], new Set());
      found.get(m[1])!.add(m[2]);
    }

    // Inside a CREATE TABLE body.
    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\);/gi;
    for (const m of sql.matchAll(createRe)) {
      for (const line of m[2].split('\n')) {
        const col = line.match(/^\s*"?(\w+)"?\s+.*GENERATED ALWAYS AS/i);
        if (col) {
          if (!found.has(m[1])) found.set(m[1], new Set());
          found.get(m[1])!.add(col[1]);
        }
      }
    }
  }
  return found;
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full);
  }
  return acc;
}

describe('generated columns', () => {
  const generated = generatedColumns();

  it('finds the generated columns declared in the migrations', () => {
    // If this ever comes back empty the rest of the suite is vacuous, so assert
    // the discovery step itself rather than trusting it.
    expect(generated.get('audit_logs')?.has('timestamp')).toBe(true);
  });

  it('is never written to from application code', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC_DIR)) {
      const src = fs.readFileSync(file, 'utf8');

      for (const [table, columns] of generated) {
        // Look only at statements aimed at this table, so a `timestamp:` on an
        // unrelated object does not register.
        const callRe = new RegExp(`from\\(['"\`]${table}['"\`]\\)([\\s\\S]{0,900})`, 'g');
        for (const call of src.matchAll(callRe)) {
          const body = call[1];
          const writeIdx = Math.min(
            ...['.insert(', '.update(', '.upsert('].map((m) => {
              const i = body.indexOf(m);
              return i === -1 ? Number.MAX_SAFE_INTEGER : i;
            }),
          );
          if (writeIdx === Number.MAX_SAFE_INTEGER) continue;

          // The object literal being written, roughly: up to the closing brace.
          const payload = body.slice(writeIdx, body.indexOf('})', writeIdx) + 1);
          for (const column of columns) {
            if (new RegExp(`\\b${column}\\s*:`).test(payload)) {
              offenders.push(`${path.relative(process.cwd(), file)} -> ${table}.${column}`);
            }
          }
        }
      }
    }

    expect(
      [...new Set(offenders)],
      'writing to a GENERATED ALWAYS column raises 428C9 and fails the whole statement',
    ).toEqual([]);
  });
});
