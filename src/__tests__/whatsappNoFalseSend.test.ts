import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Nothing may report a WhatsApp message as sent unless one was sent.
 *
 * WhatsApp sending is not built. supabase/functions/send-whatsapp-message had
 * the Meta Graph API call commented out and returned
 *
 *   { success: true, whatsapp_message_id: "wamid.HBgLOTE5OTk5OTk5OTk5..." }
 *
 * an invented Meta id for a message that never left. Five layers then agreed
 * with it: WhatsAppInboxService.sendMessage wrote a whatsapp_messages row with
 * status 'sent'; useSendMessage wrote its row *before* dispatching and caught
 * the failure into console.warn; WhatsAppSharedInbox ignored a non-ok
 * response and cleared the composer anyway; and the three schedulers marked
 * scheduled_messages 'sent' straight after an invoke that cannot throw.
 *
 * The result was a product in which a telecaller saw a message delivered, the
 * customer received nothing, and no screen or table disagreed. That is worse
 * than the feature being absent, which is why these guards are here.
 *
 * Growth and Pro also sold this: whatsappType 'business_api' and
 * 'api_templates'. src/__tests__/planClaimsAreBuilt.test.ts covers that half.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const SERVICE = 'src/services/whatsappInbox.service.ts';
const HOOK = 'src/hooks/useSendMessage.ts';
const INBOX = 'src/components/whatsapp/WhatsAppSharedInbox.tsx';
const SEND_FN = 'supabase/functions/send-whatsapp-message/index.ts';
const HOOK_FN = 'supabase/functions/receive-whatsapp-webhook/index.ts';
const SCHEDULERS = [
  'supabase/functions/scheduled-worker/index.ts',
  'supabase/functions/send-scheduled-messages/index.ts',
  'supabase/functions/execute-automation-rules/index.ts',
];

describe('no path claims a WhatsApp message was sent', () => {
  it('never invents a message id', () => {
    // The original returned a hardcoded "wamid.HBgLOTE5..." for a message it
    // had not sent. The function may report success now -- it really does
    // dispatch -- but only ever with the provider's own id, or null.
    const fn = code(SEND_FN);
    expect(fn, 'the fabricated wamid is back').not.toMatch(/wamid\./);
    expect(fn).toMatch(/whatsapp_message_id: result\.providerMessageId/);
  });

  it('only reports success after a real dispatch', () => {
    const fn = code(SEND_FN);
    // Success is set after the adapter call, never before it and never on a
    // path that skips it.
    const successAt = fn.indexOf('outcome = "success"');
    const sendAt = Math.min(
      ...['sendSession(', 'sendTemplate('].map((s) => {
        const i = fn.indexOf(s);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      }),
    );
    expect(sendAt).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(successAt, 'success is declared before anything is sent').toBeGreaterThan(sendAt);

    // And an unconfigured company is still refused rather than humoured.
    expect(fn).toMatch(/WHATSAPP_NOT_CONNECTED/);
    expect(fn).toMatch(/501/);
  });

  it('sends through the customer own provider, not a key of ours', () => {
    const fn = code(SEND_FN);
    const adapter = code('supabase/functions/_shared/whatsapp.ts');
    // Credentials come from the company's row, so CallMind holds no WhatsApp
    // account of its own.
    expect(fn).toMatch(/from\("integration_credentials"\)/);
    expect(fn).toMatch(/provider", "whatsapp"/);
    // Every adapter takes the key from the passed config.
    expect(adapter).not.toMatch(/Deno\.env\.get\(["'].*WHATSAPP/);
  });

  it('respects the rule that a cold lead can only be sent a template', () => {
    // Meta forbids free text to someone who has not written first. A plain
    // text box would have failed on nearly every lead, so the default path is
    // a template and free text is only used when a session is asserted.
    const fn = code(SEND_FN);
    expect(fn).toMatch(/session\s*\n?\s*\?\s*await sendSession/);
    expect(fn).toMatch(/:\s*await sendTemplate/);

    const adapter = code('supabase/functions/_shared/whatsapp.ts');
    // And a provider that cannot do free text says so in words.
    expect(adapter).toMatch(/WhatsAppNotSupported/);
    expect(adapter).toMatch(/does not offer free-text session messages/);
  });

  it('the inbound webhook does not acknowledge messages it cannot store', () => {
    const fn = code(HOOK_FN);
    // A 200 tells Meta the message was handled and stops the retry, so an
    // unimplemented handler that returns 200 loses every message silently.
    expect(fn).not.toMatch(/success:\s*true/);
    expect(fn).toMatch(/501/);
    // The GET challenge must fail too, or the owner can finish Meta setup and
    // start losing messages the moment it is connected.
    expect(fn).not.toMatch(/hub\.challenge/);
  });

  it('the service writes no message row and returns failure', () => {
    const svc = code(SERVICE);
    const fn = svc.slice(svc.indexOf('static async sendMessage'));

    expect(fn).toMatch(/success:\s*false/);
    // The insert is the part that made the lie durable.
    expect(fn, 'sendMessage inserts a row again').not.toMatch(/whatsapp_messages/);
    expect(fn).not.toMatch(/status:\s*'sent'/);
  });

  it('the service distinguishes an empty inbox from a failed query', () => {
    const svc = code(SERVICE);
    expect(svc, 'a query failure is being reported as an empty inbox').not.toMatch(
      /if \(error \|\| !data\) return \[\];/,
    );
    expect(svc).toMatch(/if \(error\) throw error;/);
  });

  it('the service invents no demo conversation', () => {
    // "Rajesh Kumar / Interested in Pro subscription pricing" was returned
    // whenever the database was unconfigured, and reads exactly like a real
    // lead to whoever opens the inbox.
    const svc = code(SERVICE);
    expect(svc).not.toMatch(/Rajesh Kumar/);
    expect(svc).not.toMatch(/conv-mock|msg-mock/);
    expect(svc).not.toMatch(/\+9198765/);
  });

  it('the send hook dispatches before it records, and throws when it cannot', () => {
    const hook = code(HOOK);
    const insertAt = hook.indexOf("from('whatsapp_messages')");
    const invokeAt = hook.indexOf('functions.invoke');
    expect(invokeAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(-1);
    // Order is the whole fix: a stored row must mean something was sent.
    expect(invokeAt, 'the row is written before the send is attempted').toBeLessThan(insertAt);

    expect(hook, 'the failure is being swallowed again').not.toMatch(
      /WhatsApp API disconnected/,
    );
    expect(hook).toMatch(/throw new Error/);
  });

  it('the inbox surfaces a failed send instead of clearing the box', () => {
    const inbox = code(INBOX);
    expect(inbox).toMatch(/sendError/);
    expect(inbox).toMatch(/loadError/);
    // The composer text is restored so the operator does not read an empty
    // input as proof the message went.
    expect(inbox).toMatch(/setInputText\(textToSend\)/);
  });

  it('the schedulers check the dispatch before marking anything sent', () => {
    for (const file of SCHEDULERS) {
      const fn = code(file);
      // supabase.functions.invoke resolves with { error } rather than
      // rejecting, so a bare invoke inside a try/catch never fails.
      expect(fn, `${file} still uses a bare invoke`).not.toMatch(
        /await supabase\.functions\.invoke/,
      );
      expect(fn, `${file} does not use the checked helper`).toMatch(/invokeOrThrow/);
      // The reason has to be recorded, not flattened to a constant string.
      expect(fn, `${file} discards the failure reason`).not.toMatch(
        /error_message: 'Internal server error'/,
      );
    }
  });

  it('asks for the provider the customer already pays for, not Meta', () => {
    // The panel collected a Meta Developer App ID, a Phone Number ID, a WABA
    // ID and a System User token -- the raw Cloud API path, which needs
    // Business verification and template review on Facebook Business Manager.
    // A six-telecaller business does not finish that, so those were four boxes
    // nobody could fill.
    const panel = code('src/components/integrations/WhatsAppConfigPanel.tsx');
    for (const meta of ['Meta Developer App ID', 'WABA', 'System User access token']) {
      expect(panel, `"${meta}" is back`).not.toContain(meta);
    }
    for (const bsp of ['WATI', 'Interakt', 'AiSensy']) {
      expect(panel).toContain(bsp);
    }
  });

  it('the panel is actually rendered', () => {
    // It existed and was imported nowhere, so the workspace showed a redirect
    // card pointing at a "Communication control room" that is not a screen in
    // this product. Imported-and-never-rendered is this codebase's most
    // reliable failure, so check the element.
    const page = code('src/components/IntegrationsPage.tsx');
    expect(page).toMatch(/<WhatsAppConfigPanel[\s/>]/);
  });

  it('tells the person configuring it what WhatsApp will not allow', () => {
    // The template rule decides what the feature can do. Discovering it later,
    // when a message to a cold lead fails, is the expensive way to learn it.
    const panel = code('src/components/integrations/WhatsAppConfigPanel.tsx');
    const flat = panel.replace(/\s+/g, ' ');
    expect(flat).toMatch(/template you have had approved/i);
    expect(flat).toMatch(/24 hours/);
  });

  it('claims no encryption it does not perform', () => {
    // The old copy said keys were "securely saved via Supabase encrypted
    // columns". The column is ordinary JSONB.
    const panel = code('src/components/integrations/WhatsAppConfigPanel.tsx');
    expect(panel).not.toMatch(/encrypted columns/i);
    expect(panel.replace(/\s+/g, ' ')).toMatch(/not separately encrypted at column level/i);
  });

  it('the shared helper treats a 200 with success:false as a failure', () => {
    const helper = code('supabase/functions/_shared/dispatch.ts');
    expect(helper).toMatch(/if \(error\)/);
    expect(helper).toMatch(/success === false/);
    expect(helper).toMatch(/throw new Error/);
  });
});
