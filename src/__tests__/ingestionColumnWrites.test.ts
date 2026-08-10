import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The columns the ingestion path writes.
 *
 * `src/lib/dbAdapter.ts` is a Firestore-shaped facade over supabase-js:
 * `db.collection('leads').add({ ... })` snake-cases every key and hands it to
 * Postgres. Nothing type-checks the string passed to `.collection()`, and
 * nothing type-checks the keys of the object, so a field name that no column
 * matches compiles cleanly and fails at runtime with 42703.
 *
 * That is how the whole inbound path — Meta Ads, IndiaMART, plain webhooks —
 * ran without ever storing a lead. The insert named `isNew` and `holdUntil`;
 * `leads` has neither. The trail insert that followed named four columns
 * `import_logs` does not have. The night-hold release named `holdUntil` too, and
 * its catch demoted the resulting error to a debug line.
 *
 * These are string checks, not schema checks — the suite has no database. The
 * schema half is `scripts/lead-ingestion-proof.mjs`, which writes the current
 * shapes against the real thing and asserts the old ones still fail. This file
 * catches the names coming back.
 */

const ROOT = process.cwd();
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const adapter = strip(fs.readFileSync(path.join(ROOT, 'src/lib/dbAdapter.ts'), 'utf8'));
const leadsRoute = strip(fs.readFileSync(path.join(ROOT, 'src/routes/leads.ts'), 'utf8'));

describe('inbound ingestion writes only columns that exist', () => {
  it('finds the files it is meant to check', () => {
    expect(adapter).toContain('processInboundLead');
    expect(leadsRoute).toContain('Night Hold');
  });

  it('does not write is_new or hold_until to leads', () => {
    // is_unseen already carries what is_new meant, and hold_outbound_trigger is
    // the whole night-hold state.
    for (const field of ['isNew', 'holdUntil']) {
      expect(adapter, `dbAdapter must not write ${field}`).not.toMatch(
        new RegExp(`\\b${field}\\b\\s*[,:]`),
      );
      expect(leadsRoute, `leads.ts must not write ${field}`).not.toMatch(
        new RegExp(`\\b${field}\\b\\s*[,:]`),
      );
    }
  });

  it('does not use import_logs as an ingestion trail', () => {
    // import_logs is (company_id, filename, row_count, status) with filename
    // NOT NULL — it records CSV file imports, not webhook deliveries.
    expect(adapter).not.toMatch(/collection\(["']import_logs["']\)/);
    expect(leadsRoute).not.toMatch(/collection\(["']import_logs["']\)/);
  });

  it('writes the trail to lead_activity_log instead', () => {
    expect(adapter).toContain("from('lead_activity_log')");
    expect(leadsRoute).toContain("from('lead_activity_log')");
  });

  it('reads the assignment setting by its real column name', () => {
    // team_settings.assignment_mode, surfaced as assignmentMode by the adapter's
    // snake-to-camel mapping. It read assignmentRule, which has no column, so
    // every company fell back to 'Manual' and round-robin never ran on inbound.
    expect(adapter).toContain('teamSettings.assignmentMode');
    expect(adapter, 'assignmentRule is not a column').not.toContain('assignmentRule');
  });

  it('does not read the seven team_settings fields that have no column', () => {
    for (const field of [
      'activeAgentIds', 'smartDeduplication', 'dedupeWindowDays',
      'holdNightLeads', 'nightHours', 'categoryAgentMap', 'welcomeTemplate',
    ]) {
      expect(
        adapter,
        `teamSettings.${field} has no column and always reads undefined`,
      ).not.toContain(`teamSettings.${field}`);
    }
  });

  it('does not claim to have sent a WhatsApp message it never sent', () => {
    // The branch logged "[WhatsApp Welcome Template Dispatch] Template sent"
    // and contained no send call — and could not be entered anyway.
    expect(adapter).not.toContain('Template sent');
  });

  it('reports a missing column instead of demoting it to debug', () => {
    // The night-hold release swallowed "does not exist" with the note
    // "Leads hold schema pending", which is why a write against a column that
    // had never been created ran quietly for as long as it did.
    expect(leadsRoute).not.toContain('Leads hold schema pending');
    expect(leadsRoute).not.toMatch(/logger\.debug\([^)]*Night Hold/);
  });
});
