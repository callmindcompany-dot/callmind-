import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sourceChipClass } from '../components/leads/LeadTable';

/**
 * A lead should say where it came from, and a source should say what it earned.
 *
 * leads.source has always held a string and the table has always printed it.
 * What was missing is what sits behind it: which run brought the lead in, and
 * whether a source's leads ever turn into anything.
 *
 * The second is the one a customer renews on. Leads per source -- which the
 * health screen already had -- sorts sources by how loud they are, and the
 * loudest is often the one earning least. That is invisible until value sits
 * next to volume.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/**
 * SQL with its `--` comments removed.
 *
 * The migration explains at length why it does not compute a conversion rate,
 * so a naive search for that word finds the explanation and fails on the very
 * file that is doing the right thing. Assert against the statements.
 */
const sql = (rel: string) => read(rel).replace(/^\s*--.*$/gm, '');

const MIGRATION = 'supabase/migrations/20260819000400_lead_provenance.sql';
const PANEL = 'src/components/integrations/SourcePerformancePanel.tsx';
const POLLERS = ['indiamart', 'justdial', 'tradeindia', 'facebook'] as const;

describe('lead provenance', () => {
  it('records which run created the lead', () => {
    expect(read(MIGRATION)).toMatch(/ADD COLUMN IF NOT EXISTS integration_run_id UUID/);
    for (const p of POLLERS) {
      expect(code(`supabase/functions/${p}-poll/index.ts`), `${p} does not stamp the run`)
        .toContain('integration_run_id: run.id');
    }
  });

  it('writes lead detail to a column that exists', () => {
    // All four pollers selected and inserted leads.metadata. There is no such
    // column -- leads has custom_data and custom_fields -- so the insert raised
    // 42703, which is one of several independent reasons no lead has ever
    // arrived through an integration.
    for (const p of POLLERS) {
      const fn = read(`supabase/functions/${p}-poll/index.ts`);
      expect(fn, `${p} still writes leads.metadata`).not.toMatch(/^\s+metadata: \{/m);
      expect(fn, `${p} still selects leads.metadata`).not.toContain('"phone, metadata"');
      expect(fn).toContain('custom_data');
    }
  });
});

describe('source performance', () => {
  it('reports volume and value as separate numbers', () => {
    const sql = read(MIGRATION);
    for (const col of ['leads', 'contacted', 'valued', 'total_value']) {
      expect(sql, `the report has no ${col}`).toContain(col);
    }
  });

  it('does not invent a conversion rate', () => {
    // Statuses are per company in team_settings.leads_statuses and leads.status
    // has no CHECK constraint, so any "won" mapping would be a guess -- and a
    // percentage is believed in a way two raw counts are not.
    const panel = code(PANEL);
    expect(sql(MIGRATION)).not.toMatch(/conversion/i);
    expect(panel).not.toMatch(/conversion rate/i);
    expect(panel).not.toMatch(/%\s*converted/i);
    // And it says why, where the reader can see it. Whitespace-tolerant
    // because JSX wraps the sentence across lines.
    expect(panel.replace(/\s+/g, ' ')).toMatch(/does not guess which of your pipeline stages/i);
  });

  it('scopes to the tenant through RLS rather than its own filter', () => {
    const sql = read(MIGRATION);
    const fn = sql.slice(sql.indexOf('lead_source_performance'));
    // SECURITY DEFINER here would mean re-implementing the tenant filter, which
    // is how a cross-tenant leak gets written.
    expect(fn).toMatch(/SECURITY INVOKER/);
    expect(fn).not.toMatch(/SECURITY DEFINER/);
  });

  it('distinguishes an empty report from a failed one', () => {
    const hook = code('src/hooks/useSourcePerformance.ts');
    expect(hook).toMatch(/if \(error\) throw error;/);
    const panel = code(PANEL);
    expect(panel).toMatch(/isError/);
    expect(panel).toMatch(/unknown, not zero/i);
  });

  it('converts the numeric columns PostgREST returns as strings', () => {
    // total_value is numeric and arrives as a string; summing or comparing it
    // as one is silently wrong.
    expect(code('src/hooks/useSourcePerformance.ts')).toMatch(/Number\(r\.total_value/);
  });
});

describe('the inbound webhook', () => {
  it('checks the secret where the UI saves it', () => {
    // The server read lead_sources.credentials.webhookSecret. Nothing writes to
    // lead_sources -- zero rows, no UI path -- so the fail-closed branch fired
    // on every request and the advertised webhook URL rejected everything with
    // 403 "Webhook not configured for this company".
    const route = code('src/routes/leads.ts');
    const inbound = route.slice(route.indexOf("'/webhooks/incoming/:companyId'"));
    const handler = inbound.slice(0, inbound.indexOf('router.post', 1));

    expect(handler, 'still checking the table nothing writes to').not.toMatch(
      /from\('lead_sources'\)/,
    );
    expect(handler).toMatch(/from\('integration_credentials'\)/);
    expect(handler).toMatch(/provider', 'webhook'/);
    // Still fails closed.
    expect(handler).toMatch(/if \(!storedSecret/);
  });

  it('separates a lookup failure from a missing secret', () => {
    // 403 tells the sender to stop trying. A database blip is not that.
    const route = code('src/routes/leads.ts');
    expect(route).toMatch(/503/);
  });

  it('tests the webhook rather than faking a lead', () => {
    const hook = code('src/hooks/useWebhookConfig.ts');
    // It inserted straight into `leads` with an invented "₹2.5 Cr+" budget and
    // reported success without ever calling the endpoint.
    expect(hook, 'the test writes a lead directly again').not.toMatch(/from\('leads'\)\s*\.insert/);
    expect(hook).not.toMatch(/2\.5 Cr/);
    expect(hook).not.toMatch(/Mock payload/i);
    // It must actually post to the URL it shows the customer.
    expect(hook).toMatch(/fetch\(webhookUrl/);
    expect(hook).toMatch(/'x-webhook-secret'/);
    // And report the server's own reason, since "not configured" and "invalid
    // secret" have different fixes.
    expect(hook).toMatch(/body\.error/);
  });

  it('derives the webhook URL instead of hardcoding a hostname', () => {
    const hook = code('src/hooks/useWebhookConfig.ts');
    expect(hook, 'the guessed production hostname is back').not.toMatch(/api\.callmind\.app/);
    expect(hook).toMatch(/window\.location\.origin/);
  });
});

describe('sourceChipClass', () => {
  it('gives each known vendor its own colour', () => {
    const indiamart = sourceChipClass('IndiaMart');
    const justdial = sourceChipClass('Justdial');
    const facebook = sourceChipClass('Facebook Ads');
    expect(new Set([indiamart, justdial, facebook]).size).toBe(3);
  });

  it('matches however the ingest function spelled it', () => {
    expect(sourceChipClass('IndiaMART')).toBe(sourceChipClass('indiamart'));
    expect(sourceChipClass('Meta Lead Ads')).toBe(sourceChipClass('Facebook Ads'));
  });

  it('leaves anything it does not recognise neutral', () => {
    // A customer can type their own source on a manual lead. Giving it a
    // vendor colour would imply it came from somewhere it did not.
    const unknown = sourceChipClass('Walk-in');
    expect(unknown).toMatch(/gray/);
    expect(sourceChipClass(null)).toBe(unknown);
    expect(sourceChipClass(undefined)).toBe(unknown);
  });
});
