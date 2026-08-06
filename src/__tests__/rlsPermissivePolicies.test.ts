import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Postgres ORs permissive policies together, so a single `USING (true)` beside
 * a correct company-scoped policy makes the scoped one decide nothing. That is
 * how announcements ended up readable by every tenant while the migration that
 * scoped them looked correct.
 *
 * This walks the migration set in order, tracks which permissive policies are
 * still live at the end, and fails if one survives on a table that carries a
 * company_id.
 *
 * Tables with no company_id are platform-wide content (legal_pages,
 * plan_limits, video_tutorials); a global SELECT on those is intended. A
 * permissive *write* on them is not, so those are caught too.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

interface Policy {
  table: string;
  name: string;
  file: string;
  writes: boolean;
  roles: string | null;
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

function readMigrations(): { file: string; sql: string }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      sql: stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')),
    }));
}

/** Columns a real migration creates, so we can tell tenant tables from platform ones. */
function tableColumns(migrations: { sql: string }[]): Map<string, Set<string>> {
  const cols = new Map<string, Set<string>>();
  const add = (t: string, c: string) => {
    if (!cols.has(t)) cols.set(t, new Set());
    cols.get(t)!.add(c.toLowerCase());
  };

  for (const { sql } of migrations) {
    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\);/gi;
    for (const m of sql.matchAll(createRe)) {
      for (const line of m[2].split('\n')) {
        const col = line.match(/^\s*"?(\w+)"?\s+[A-Za-z]/);
        if (col && !['UNIQUE', 'PRIMARY', 'CONSTRAINT', 'CHECK', 'FOREIGN'].includes(col[1].toUpperCase())) {
          add(m[1], col[1]);
        }
      }
    }
    const alterRe = /ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN(?: IF NOT EXISTS)?\s+"?(\w+)"?/gi;
    for (const m of sql.matchAll(alterRe)) add(m[1], m[2]);
  }
  return cols;
}

/** Permissive policies still in force after every migration has run, in order. */
function survivingPermissivePolicies(migrations: { file: string; sql: string }[]): Policy[] {
  const live = new Map<string, Policy>();

  for (const { file, sql } of migrations) {
    const dropRe = /DROP\s+POLICY\s+IF\s+EXISTS\s+("[^"]+"|\w+)\s+ON\s+(?:public\.)?(\w+)/gi;
    for (const m of sql.matchAll(dropRe)) {
      live.delete(`${m[2]}::${m[1].replace(/"/g, '')}`);
    }

    const createRe = /CREATE\s+POLICY\s+("[^"]+"|\w+)\s+ON\s+(?:public\.)?(\w+)([\s\S]*?);/gi;
    for (const m of sql.matchAll(createRe)) {
      const [, rawName, table, body] = m;
      const name = rawName.replace(/"/g, '');
      const key = `${table}::${name}`;
      if (!/USING\s*\(\s*true\s*\)/i.test(body)) {
        live.delete(key);
        continue;
      }
      live.set(key, {
        table,
        name,
        file,
        writes: /WITH CHECK\s*\(\s*true\s*\)/i.test(body),
        roles: body.match(/\bTO\s+([\w,\s]+?)(?=\s+USING|\s+FOR|\s*$)/i)?.[1]?.trim() ?? null,
      });
    }
  }
  return [...live.values()];
}

describe('RLS permissive policies', () => {
  const migrations = readMigrations();
  const cols = tableColumns(migrations);
  const surviving = survivingPermissivePolicies(migrations);

  // Only service_role is allowed to hold a blanket policy: it bypasses RLS
  // regardless, so scoping one to it changes nothing and keeps intent readable.
  const clientFacing = surviving.filter((p) => p.roles !== 'service_role');

  it('leaves no wide-open policy on a table that has a company_id', () => {
    const leaks = clientFacing.filter((p) => cols.get(p.table)?.has('company_id'));
    expect(
      leaks.map((p) => `${p.table}."${p.name}" (${p.file})`),
      'a USING (true) policy on a tenant table cancels the company-scoped policy beside it, ' +
        'because Postgres ORs permissive policies together',
    ).toEqual([]);
  });

  it('leaves no wide-open write on platform-wide content', () => {
    const writable = clientFacing.filter((p) => p.writes);
    expect(
      writable.map((p) => `${p.table}."${p.name}" (${p.file})`),
      'WITH CHECK (true) lets any authenticated customer edit this table for everyone',
    ).toEqual([]);
  });
});
