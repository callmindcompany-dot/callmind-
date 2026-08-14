import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The rest of the Integrations page, swept for the same faults as the parts
 * already rebuilt.
 *
 * Three real ones were found here, all of the same family: a screen telling
 * somebody that something happened, or did not happen, without having checked.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('waitlist signup', () => {
  const PANEL = 'src/components/integrations/WaitlistPanel.tsx';

  it('checks the write instead of assuming it landed', () => {
    // supabase-js resolves with { data, error } rather than throwing, so the
    // surrounding try/catch never fired for a database error and a failed
    // insert still showed "Priority spot reserved!".
    const panel = code(PANEL);
    expect(panel).toMatch(/const \{ data, error \} = await supabase/);
    expect(panel).toMatch(/if \(error\) throw error;/);
    // A write refused by RLS returns no error and no rows.
    expect(panel).toMatch(/data\.length === 0/);
    expect(panel).toMatch(/\.select\('id'\)/);
  });

  it('promises only what happens', () => {
    // There is no priority and no queue. The signup is an audit_logs row.
    const panel = code(PANEL);
    expect(panel).not.toMatch(/Priority spot reserved/i);
    expect(panel).not.toMatch(/We'll notify you/i);
  });
});

describe('import history', () => {
  const TABLE = 'src/components/integrations/ImportLogsTable.tsx';

  it('separates a failed query from an empty one', () => {
    // useImportLogsQuery throws correctly; the table ignored it, so a failure
    // rendered as "No spreadsheet imports matched your filters" -- which is a
    // claim about the data, not about the request.
    const table = code(TABLE);
    expect(table).toMatch(/isError/);
    expect(table.replace(/\s+/g, ' ')).toMatch(/not the same as having no\s*imports/i);
  });
});

describe('webhook panel', () => {
  const PANEL = 'src/components/integrations/WebhookConfigPanel.tsx';

  it('documents the header the server actually requires', () => {
    // It documented "X-CallMind-Signature", which belongs to a different and
    // unused receiver. src/routes/leads.ts reads x-webhook-secret, so a
    // developer following this panel got 401 with no way to work out why.
    const panel = code(PANEL);
    expect(panel).toContain('x-webhook-secret');
    expect(panel, 'the wrong header is back').not.toContain('X-CallMind-Signature');

    const route = read('src/routes/leads.ts');
    expect(route, 'the server no longer reads this header').toContain("headers['x-webhook-secret']");
  });

  it('shows the real URL rather than a made-up path', () => {
    const panel = code(PANEL);
    expect(panel, 'the invented path is back').not.toMatch(/POST \/api\/webhooks\/incoming/);
    expect(panel).toMatch(/POST \$\{webhookUrl/);
  });

  it('does not call a real send a simulation', () => {
    // The button inserted a row straight into `leads` once; it posts to the
    // real endpoint now and a genuine lead appears.
    const panel = code(PANEL);
    expect(panel).not.toMatch(/Mock Packet/i);
    expect(panel.replace(/\s+/g, ' ')).toMatch(/creates a genuine lead/i);
  });
});
