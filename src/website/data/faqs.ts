import { FREE_TRIAL_CONFIG, PRICING_PLANS } from '../../config/pricing';

/**
 * Single source of truth for the public FAQ.
 *
 * Answers must describe what the product actually does — see
 * src/website/data/capabilities.ts for the code references behind each claim.
 * Numbers that exist in config (trial length, included seats, plan limits) are
 * interpolated rather than typed out, because the previous hand-written copy
 * had drifted: it promised "up to 2 telecaller seats" while
 * FREE_TRIAL_CONFIG.includedTelecallers has been 3.
 */

export interface Faq {
  question: string;
  answer: string;
  category: FaqCategory;
}

export type FaqCategory = 'product' | 'calling' | 'leads' | 'security' | 'billing';

export const FAQ_CATEGORIES: Record<FaqCategory, string> = {
  product: 'Getting Started',
  calling: 'Calling & Mobile App',
  leads: 'Leads & Integrations',
  security: 'Security & Privacy',
  billing: 'Pricing & Billing',
};

export const FAQS: Faq[] = [
  // ── Getting started ────────────────────────────────────────────────────────
  {
    category: 'product',
    question: 'What exactly is CallMind?',
    answer:
      'CallMind is a sales & telecalling CRM for Indian businesses. Inbound leads flow automatically from your ad campaigns, website forms, online marketplaces, and Excel/CSV spreadsheets, get distributed to telecallers instantly, and are dialed with 1 tap from mobile SIMs. All call logs, notes, and deal pipelines sync in real-time to your central dashboard.',
  },
  {
    category: 'product',
    question: `Is there a free trial, and do I need a credit card?`,
    answer: `Yes. You get a ${FREE_TRIAL_CONFIG.trialDays}-day free trial that includes ${FREE_TRIAL_CONFIG.includedTelecallers} telecallers, lead integrations and the pipeline board. No credit card or upfront payment is required to start.`,
  },
  {
    category: 'product',
    question: 'How long does setup take?',
    answer:
      'Most teams are calling the same day. You connect one lead source, invite telecallers by having them scan a QR code from your dashboard, and approve their join requests. There is no hardware to buy and no telephony provisioning.',
  },
  {
    category: 'product',
    question: 'Do my telecallers need training to use it?',
    answer:
      'The telecaller app is built around one main action — call the next lead — and includes in-app training material. Telecallers can also choose the language they are most comfortable working in, so you are not limited to hiring English speakers.',
  },

  // ── Calling & mobile ───────────────────────────────────────────────────────
  {
    category: 'calling',
    question: 'How does 1-tap SIM dialing actually work?',
    answer:
      'The telecaller taps “call” in the CallMind Android app and the phone places a normal call through its own SIM 1 or SIM 2 using the native dialer. Because it is an ordinary mobile call, there is no VoIP setup, no internet-quality dependency on the voice leg, and no per-minute platform charge. The duration, timestamp and outcome sync to your CRM afterwards.',
  },
  {
    category: 'calling',
    question: 'Does it work when the mobile network is weak?',
    answer:
      'Yes. Calls and the notes logged after them are stored on the device when data drops and sync automatically once the connection returns. Field teams on patchy mobile data do not lose a day of activity.',
  },
  {
    category: 'calling',
    question: 'Do we need a VoIP or cloud telephony account?',
    answer:
      'No. CallMind uses the SIM already in your telecaller’s phone, so you keep whatever mobile plan you already pay for. There is no cloud telephony account to buy and no per-minute charge from us.',
  },
  {
    category: 'calling',
    question: 'Is the mobile app available for iPhone?',
    answer:
      'The telecaller app is Android-first, which is what the large majority of Indian calling floors run. The admin dashboard is a web app and works in any modern browser, including on iPhone and iPad.',
  },

  // ── Leads & integrations ───────────────────────────────────────────────────
  {
    category: 'leads',
    question: 'Which lead sources can CallMind capture from?',
    answer:
      'IndiaMART, JustDial, TradeIndia and Meta (Facebook and Instagram) Lead Ads are built in, along with website forms and a generic webhook for any other source. You can also import from Excel, CSV and Google Sheets.',
  },
  {
    category: 'leads',
    question: 'How fast does a new lead reach a telecaller?',
    answer:
      'Inbound leads are ingested as they arrive and assigned automatically, so a telecaller sees the lead on their phone rather than waiting for someone to forward a spreadsheet.',
  },
  {
    category: 'leads',
    question: 'What happens if the same lead comes in twice?',
    answer:
      'Incoming leads are checked against your existing database and duplicates are flagged before two telecallers end up calling the same person.',
  },
  {
    category: 'leads',
    question: 'My spreadsheet columns are messy. Will import still work?',
    answer:
      'Upload the file and CallMind maps the columns for you — working out which one is the name, phone, city and so on — then shows you the mapping so you can correct it before importing.',
  },
  {
    category: 'leads',
    question: 'Can I track fields specific to my business?',
    answer:
      'Yes. You can add your own custom fields, and they appear on lead forms, on imports and in the telecaller app.',
  },

  // ── Security & privacy ─────────────────────────────────────────────────────
  {
    category: 'security',
    question: 'Are call recordings stored on your servers?',
    answer:
      'No. Calls run over the mobile carrier network, not through us. CallMind records call metadata — duration, timestamp, outcome and the notes your telecaller writes — and never records or stores call audio.',
  },
  {
    category: 'security',
    question: 'Can one company see another company’s data?',
    answer:
      'Reads and writes are scoped to your workspace by PostgreSQL Row Level Security policies that match rows against your company, enforced inside the database rather than in application code.',
  },
  {
    category: 'security',
    question: 'What is the difference in access between admins and telecallers?',
    answer:
      'Admins and founders use the web dashboard to manage pipelines, team targets, integrations and billing. Telecallers use the mobile app and see the leads assigned to them; they cannot export your lead database or reach billing settings.',
  },
  {
    category: 'security',
    question: 'Can I export or delete all of my data?',
    answer:
      'Yes, both. You can request a full export of your workspace whenever you want it, and you can permanently delete it — aligned with India’s DPDP Act. Neither requires a support ticket.',
  },
  {
    category: 'security',
    question: 'What if a telecaller loses their phone?',
    answer:
      'You can see which devices are signed in and remove one that is lost, shared, or belongs to someone who has left. The app can also be locked behind the phone’s fingerprint or face unlock.',
  },

  // ── Pricing & billing ──────────────────────────────────────────────────────
  {
    category: 'billing',
    question: 'How is CallMind priced?',
    answer: `Pricing is per telecaller per month, starting at ₹${PRICING_PLANS.starter.annualPrice} on annual billing. Plans differ by seat range and by which automation, AI and API features are included — the pricing page has the full comparison.`,
  },
  {
    category: 'billing',
    question: 'Do I get a GST invoice?',
    answer:
      'Yes. Every subscription payment produces a tax invoice with the CGST and SGST breakdown, so your accountant can claim input credit. You can enter your GSTIN in settings.',
  },
  {
    category: 'billing',
    question: 'Can I change plans or add telecallers later?',
    answer:
      'Yes. You can upgrade as the team grows and your seat limit changes with the plan. Prices shown exclude 18% GST.',
  },
  {
    category: 'billing',
    question: 'What happens when the free trial ends?',
    answer:
      'Your data stays in your workspace. You choose a plan to continue calling, and if you decide not to continue you can still export everything you put in.',
  },
];

/** FAQs grouped by category, in the order the categories are declared. */
export const faqsByCategory = (Object.keys(FAQ_CATEGORIES) as FaqCategory[]).map((category) => ({
  category,
  label: FAQ_CATEGORIES[category],
  items: FAQS.filter((f) => f.category === category),
}));
