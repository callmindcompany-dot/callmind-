/**
 * Sending WhatsApp through whichever provider the customer already pays for.
 *
 * THE RULE THAT SHAPES ALL OF THIS
 *
 * WhatsApp does not let a business send free text to someone who has not
 * messaged it recently. This is Meta's rule, not a quirk of any provider:
 *
 *   business-initiated   -> a pre-approved template, with parameters
 *   inside 24 hours of the customer's last message -> free text ("session")
 *
 * So a telecaller cannot type whatever they like at a cold lead. They pick an
 * approved template and fill its blanks. A free-text box would have failed on
 * every lead who had not written first -- which is most of them.
 *
 * WHY AN ADAPTER RATHER THAN META DIRECTLY
 *
 * Meta's own Cloud API needs Business verification, a Facebook Business
 * Manager and template review handled by the customer. An Indian SME running
 * six telecallers will not complete that. They already pay AiSensy, Interakt,
 * WATI or Gallabox, who have done it for them -- so CallMind sends through the
 * account the customer already has, and holds no WhatsApp credentials of its
 * own.
 *
 * WHAT IS VERIFIED AND WHAT IS NOT
 *
 * The request shapes below were taken from each provider's published docs in
 * August 2026, not from memory. None of them has been run against a live
 * account, because there is no test account for any of them yet. Nothing here
 * synthesises a message id or a success: every adapter returns the provider's
 * own response, and a non-2xx is an error. Until somebody sends a real message
 * and sees it arrive, `whatsappType` stays "manual" in src/config/pricing.ts
 * and no plan advertises this.
 */

export type BspProvider = "wati" | "interakt" | "aisensy";

export interface BspConfig {
  provider: BspProvider;
  apiKey: string;
  /**
   * WATI gives each tenant its own host, e.g.
   * https://live-mt-server.wati.io/<tenant-id>. It is copied from their
   * dashboard rather than guessed, because guessing it would produce a
   * confident 404 for every customer.
   */
  endpoint?: string;
  /** AiSensy sends against a campaign it requires you to create first. */
  campaignName?: string;
}

export interface SendResult {
  /** The provider's own id. Never one we made up. */
  providerMessageId: string | null;
  /** The raw body, so a failure can be diagnosed from the run record. */
  raw: unknown;
}

export class WhatsAppNotSupported extends Error {}
export class WhatsAppNotConfigured extends Error {}

/** Digits only, with the country code. Providers disagree about the leading +. */
const digits = (phone: string) => phone.replace(/\D/g, "");

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 1000);
  }
}

function assertConfigured(cfg: BspConfig, needsEndpoint = false) {
  if (!cfg?.provider) throw new WhatsAppNotConfigured("No WhatsApp provider selected.");
  if (!cfg.apiKey) throw new WhatsAppNotConfigured(`No API key saved for ${cfg.provider}.`);
  if (needsEndpoint && !cfg.endpoint) {
    throw new WhatsAppNotConfigured(
      `${cfg.provider} needs the API endpoint from your dashboard (for example https://live-mt-server.wati.io/<tenant-id>).`,
    );
  }
}

/**
 * Send an approved template. This is the one that works on a cold lead.
 *
 * `params` are positional, matching the {{1}}, {{2}} blanks in the template.
 */
export async function sendTemplate(
  cfg: BspConfig,
  to: string,
  templateName: string,
  params: string[] = [],
): Promise<SendResult> {
  const number = digits(to);

  switch (cfg.provider) {
    case "wati": {
      assertConfigured(cfg, true);
      // POST {endpoint}/api/v2/sendTemplateMessage?whatsappNumber=<number>
      // Authorization: Bearer <token>
      const url = `${cfg.endpoint!.replace(/\/$/, "")}/api/v2/sendTemplateMessage?whatsappNumber=${encodeURIComponent(number)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: `callmind_${templateName}`,
          // WATI names its parameters; the blanks are 1-based.
          parameters: params.map((value, i) => ({ name: String(i + 1), value })),
        }),
      });
      const raw = await readBody(res);
      if (!res.ok) throw new Error(`WATI refused (${res.status}): ${JSON.stringify(raw).slice(0, 400)}`);
      // WATI answers 200 with result:false when it declines, so the status
      // alone is not enough to call it sent.
      if ((raw as { result?: boolean })?.result === false) {
        throw new Error(`WATI declined: ${JSON.stringify(raw).slice(0, 400)}`);
      }
      const receiver = (raw as { receivers?: Array<{ localMessageId?: string }> })?.receivers?.[0];
      return { providerMessageId: receiver?.localMessageId ?? null, raw };
    }

    case "interakt": {
      assertConfigured(cfg);
      // Basic auth with the secret key from Settings > Developer Setting.
      const res = await fetch("https://api.interakt.ai/v1/public/message/", {
        method: "POST",
        headers: {
          Authorization: `Basic ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countryCode: "+91",
          phoneNumber: number.replace(/^91/, ""),
          type: "Template",
          template: {
            name: templateName,
            languageCode: "en",
            bodyValues: params,
          },
        }),
      });
      const raw = await readBody(res);
      if (!res.ok) throw new Error(`Interakt refused (${res.status}): ${JSON.stringify(raw).slice(0, 400)}`);
      return { providerMessageId: (raw as { id?: string })?.id ?? null, raw };
    }

    case "aisensy": {
      assertConfigured(cfg);
      if (!cfg.campaignName) {
        throw new WhatsAppNotConfigured(
          "AiSensy needs a campaign name. Create an API campaign for this template in AiSensy and set it to Live.",
        );
      }
      const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: cfg.apiKey,
          campaignName: cfg.campaignName,
          destination: number,
          userName: "CallMind",
          source: "CallMind CRM",
          templateParams: params,
        }),
      });
      const raw = await readBody(res);
      if (!res.ok) throw new Error(`AiSensy refused (${res.status}): ${JSON.stringify(raw).slice(0, 400)}`);
      // AiSensy's documented success is a 200 with no message id, so there is
      // nothing to return here. Returning a made-up one is what the old
      // send-whatsapp-message did.
      return { providerMessageId: null, raw };
    }

    default:
      throw new WhatsAppNotConfigured(`Unknown WhatsApp provider: ${cfg.provider}`);
  }
}

/**
 * Free text, allowed only inside 24 hours of the lead's own last message.
 *
 * Of the three, only WATI publishes an endpoint for this. The others are told
 * so plainly rather than being made to fail with something vague -- a customer
 * on AiSensy needs to know the limit is their provider's, not a bug.
 */
export async function sendSession(cfg: BspConfig, to: string, text: string): Promise<SendResult> {
  if (cfg.provider !== "wati") {
    throw new WhatsAppNotSupported(
      `${cfg.provider} does not offer free-text session messages through its API. Use an approved template, or switch provider.`,
    );
  }
  assertConfigured(cfg, true);

  const number = digits(to);
  const url =
    `${cfg.endpoint!.replace(/\/$/, "")}/api/v1/sendSessionMessage/${encodeURIComponent(number)}` +
    `?messageText=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  const raw = await readBody(res);
  if (!res.ok) throw new Error(`WATI refused (${res.status}): ${JSON.stringify(raw).slice(0, 400)}`);
  if ((raw as { result?: boolean })?.result === false) {
    throw new Error(`WATI declined: ${JSON.stringify(raw).slice(0, 400)}`);
  }
  return { providerMessageId: null, raw };
}
