/**
 * The legal documents, in one place.
 *
 * There were five copies before this: three web pages, one mobile screen, and
 * rows seeded into the `legal_pages` table. They disagreed with each other and
 * several of them described a product this is not. The same problem prices had
 * before src/config/pricing.ts, with worse consequences — a customer is shown
 * these and asked to accept them.
 *
 * ---------------------------------------------------------------------------
 * READ BEFORE PUBLISHING
 * ---------------------------------------------------------------------------
 * This text was drafted against what the system verifiably does — the
 * migrations, the routes, the mobile permissions — not from a template. Every
 * factual claim below can be traced to code, and where a claim could not be
 * traced it was left out rather than softened.
 *
 * It has not been reviewed by a lawyer. India's Digital Personal Data
 * Protection Act 2023 imposes obligations (consent notices, grievance officer,
 * breach reporting, data principal rights) that a developer reading the source
 * cannot confirm you have met. Have a practitioner review this before it goes
 * live, and fill in ENTITY below.
 *
 * Claims deliberately NOT made, because they are not true today:
 *   - SQLCipher, "14-layer security", or any named certification (ISO, SOC 2)
 *   - Stripe as a payment processor — only Razorpay is integrated
 *   - anything about call recordings beyond what is below. calls.recording_url
 *     exists as a column and is read by the UI, but nothing in the codebase
 *     ever writes it and no row in the live table has one. The product does
 *     not record audio, and the site is right to say so.
 *   - reading call logs or contacts — the app requests neither permission
 *   - "24/7 support"
 */

/**
 * Fill this in once. It appears in all three documents and in both apps.
 *
 * The business is not yet a registered company, so this is written as a sole
 * proprietorship: the proprietor is personally the data fiduciary and the
 * counterparty to the terms. If you incorporate later, change PROPRIETOR to the
 * company name, add the CIN, and have the documents re-reviewed — the liability
 * position genuinely differs.
 */
export const ENTITY = {
  /** The product customers use. */
  brand: 'CallMind',
  /** The business behind it. CallMind is a product of Voolabs. */
  business: 'Voolabs Technologies',
  /**
   * The business is not a registered company, so it is a sole proprietorship:
   * legally the counterparty is the individual, trading as Voolabs
   * Technologies. Both names have to appear — "Voolabs Technologies" alone
   * identifies nobody a customer could bring a claim against.
   *
   * TODO: the proprietor's full legal name, exactly as on PAN.
   */
  proprietor: 'Vrushabh Santosh Shinde',
  /**
   * TODO: add the PIN code. A legal notice has to be deliverable, and an
   * address without one may not be.
   */
  address: 'At Post Koparde, Taluka Khandala, District Satara, Maharashtra, India',
  /** GSTIN once registered. Left empty until then; the line is omitted. */
  gstin: '',
  /**
   * The courts with jurisdiction.
   *
   * This said Pune, which the mobile app repeated while naming a company
   * incorporated nowhere. For a sole proprietorship jurisdiction normally
   * follows the principal place of business, which is Satara — so Pune was
   * both unexplained and probably wrong. Worth confirming with the lawyer:
   * naming the wrong forum does not void the clause, but it invites an
   * argument you would rather not have.
   */
  jurisdiction: 'Satara, Maharashtra',
  /** Product support — where customers write about CallMind. */
  supportEmail: 'callmind.company@gmail.com',
  /** The business itself, for anything about Voolabs rather than the product. */
  businessEmail: 'voolabsofficial@gmail.com',
  /**
   * DPDP Act 2023 requires a contact that answers data-principal requests.
   * It must be a mailbox someone actually reads.
   */
  grievanceEmail: 'callmind.company@gmail.com',
  website: 'https://callmind.app',
} as const;

/** How the operator is named in the documents: the person, and what they trade as. */
export const OPERATOR_NAME = `${ENTITY.proprietor}, trading as ${ENTITY.business}`;

/** True once the placeholders above have been filled in. */
export const ENTITY_IS_COMPLETE =
  !ENTITY.proprietor.includes('{{') && !ENTITY.address.includes('{{');

/**
 * Set to true only after a lawyer has read these documents.
 *
 * Deliberately separate from ENTITY_IS_COMPLETE. Filling in a name and address
 * makes the documents *complete*; it does not make them *correct*. Collapsing
 * the two would mean that typing an address silently published text nobody
 * qualified had looked at — and this text makes representations about data
 * handling under the DPDP Act 2023, which is not a thing to get wrong by
 * accident.
 *
 * Whoever flips this should be able to say who reviewed it and when.
 */
export const REVIEWED_BY_LAWYER = false;

/** Both conditions. What the banner and the database sync actually check. */
export const READY_TO_PUBLISH = ENTITY_IS_COMPLETE && REVIEWED_BY_LAWYER;

export type LegalSlug = 'privacy' | 'terms' | 'refund';

export interface LegalSection {
  id: string;
  title: string;
  /** Paragraphs. Plain text — no markup, so both React and React Native render it. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
}

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  /** Shown in listings and meta descriptions. */
  summary: string;
  /**
   * Bump when the substance changes, not for typos. useLegalCompliance compares
   * this against user_acceptances, so raising it asks every user to accept
   * again — which is the point, and also why it should not move casually.
   */
  version: string;
  /** ISO date. Displayed as "Last updated". */
  effectiveDate: string;
  sections: LegalSection[];
}

const CONTACT_SECTION = (subject: string): LegalSection => ({
  id: 'contact',
  title: 'Contact us',
  body: [
    `Questions about ${subject} go to ${ENTITY.supportEmail}. We aim to respond within three working days; we do not offer round-the-clock support and do not claim to.`,
    `${ENTITY.brand} is a product of ${ENTITY.business}, operated by ${OPERATOR_NAME}, ${ENTITY.address}.`,
  ],
});

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

const PRIVACY: LegalDocument = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary:
    'What CallMind collects, where it is stored, who can reach it, and how long it is kept.',
  version: '3.0',
  effectiveDate: '2026-08-07',
  sections: [
    {
      id: 'who-we-are',
      title: 'Who this covers',
      body: [
        `${ENTITY.brand} is a customer relationship manager for telecalling teams, provided by ${OPERATOR_NAME}. Under the Digital Personal Data Protection Act 2023 that is the data fiduciary for the account data described below.`,
        'Two kinds of people appear in the product, and they are not treated the same.',
        'Your team members — the people who sign in — are our users. We hold their account details directly.',
        'Your leads and customers — the people your team calls — are your data. You decide what to collect about them and why. We store and process it on your instruction, and we do not use it for anything of our own.',
      ],
    },
    {
      id: 'what-we-collect',
      title: 'What we collect',
      body: ['From the people who sign in:'],
      bullets: [
        'Name, email address, phone number, and the role assigned to them in their company',
        'Which company they belong to, and how they joined it (invite code or QR)',
        'Sign-in records, and an audit log of actions taken inside the product',
        'Precise device location — latitude, longitude, accuracy and the resolved address — but only at the moment a team member marks attendance from the mobile app. It is not collected in the background and not tracked between punches. If location permission is refused, attendance cannot be marked; nothing else in the app is affected.',
      ],
    },
    {
      id: 'lead-data',
      title: 'Data about your leads',
      body: [
        'Whatever your team enters or imports: names, phone numbers, email addresses, addresses, notes, call outcomes and any custom fields you define.',
      'Call records created in the product — who called, when, the outcome, and the notes written afterwards. We do not record calls and do not store call audio. Calls are placed through the dialler on the phone itself, so the conversation never reaches us.',
        'Documents your team uploads against a lead.',
        'Leads received from integrations you connect yourself — IndiaMART, Facebook Lead Ads, Google Sheets, or your own website forms.',
      ],
    },
    {
      id: 'no-permissions',
      title: 'What the mobile app does not access',
      body: [
        'The app does not read your call log. It does not read your contacts. It does not record audio. None of those permissions are requested, so none can be granted by mistake.',
        'The permissions it does request are notifications, biometric unlock, vibration, network access, and location for attendance as described above.',
      ],
    },
    {
      id: 'why',
      title: 'Why we process it',
      body: [
        'To provide the product you have paid for: showing your team their leads, recording calls made, scheduling follow-ups, and reporting on the result.',
        'To keep tenants apart. Every table carrying company data is subject to database-level row security keyed to your company, so one customer cannot read another\'s rows even if they reach the database directly.',
        'To bill you, and to keep the records the tax authorities require.',
        'To investigate abuse and to comply with a lawful order.',
      ],
    },
    {
      id: 'sharing',
      title: 'Who else sees it',
      body: [
        'We do not sell your data, and we do not use it to train anything. Data reaches the following providers only because the product runs on them:',
      ],
      bullets: [
        'Supabase — hosts the Postgres database and handles authentication. Data resides in the region chosen for the project.',
        'Cloudflare R2 — stores uploaded documents.',
        'Google (Gemini) — receives the specific text you send to an AI feature, at the moment you use it. If you never use an AI feature, nothing reaches it.',
        'Razorpay — processes payments. Card details go to Razorpay and never to us; we hold only the payment reference and the amount.',
        'An integration you connect yourself — IndiaMART, Facebook or Google Sheets — receives and sends what that integration requires. Disconnecting it stops the exchange.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      body: [
        'Leads, calls and documents are kept for as long as your subscription is active, and are deleted when you ask us to delete them.',
        'Some operational logs are cleared on a schedule regardless: audit logs after 15 days, webhook and automation logs after 30 days, and the activity stream after 60 days. Your company can shorten these in Settings.',
        'Deleting a lead moves it to a recycle bin first. It is removed permanently after the retention window your plan allows.',
        'When a subscription ends we keep your data for 30 days so you can export it or come back, then delete it. Billing records are kept for the period Indian tax law requires.',
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      body: [
        'Under the Digital Personal Data Protection Act 2023 you may ask us for a copy of your personal data, ask us to correct it, ask us to delete it, and withdraw consent you have given. Write to ' + ENTITY.grievanceEmail + '.',
        'If the request concerns one of your leads rather than one of your team members, it usually has to come to you rather than to us — you decided to collect that data. We will help you answer it.',
        'If you are not satisfied with our response you may complain to the Data Protection Board of India.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      body: [
        'Traffic is encrypted in transit. The database is encrypted at rest by our hosting provider.',
        'Access is separated by company at the database level rather than only in the application, so a bug in the interface does not expose another tenant\'s rows.',
        'We do not claim any certification we do not hold, and we do not describe our security in terms that cannot be checked. If you need a specific assurance for your own compliance, ask and we will tell you plainly whether we have it.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      body: [
        'This is a product for businesses. It is not intended for anyone under 18, and we do not knowingly create accounts for them.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: [
        'When we change this policy in a way that matters, we raise its version and ask you to accept the new one when you next sign in. The date at the top always reflects the current version.',
      ],
    },
    CONTACT_SECTION('privacy or your data'),
  ],
};

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

const TERMS: LegalDocument = {
  slug: 'terms',
  title: 'Terms of Service',
  summary:
    'The agreement between your business and CallMind: what you may do with it, what we owe you, and what happens when either side stops.',
  version: '2.0',
  effectiveDate: '2026-08-07',
  sections: [
    {
      id: 'agreement',
      title: 'The agreement',
      body: [
        `These terms are between your business and ${OPERATOR_NAME}, who provide ${ENTITY.brand}. Creating an account accepts them on behalf of your business, so accept them only if you are authorised to.`,
      ],
    },
    {
      id: 'accounts',
      title: 'Accounts and seats',
      body: [
        'Your subscription includes a number of seats. A seat belongs to one person; sharing a login between people is not permitted and defeats the audit trail you are paying for.',
        'The person who creates the company account administers it. They can invite, approve, disable and remove members. Removing a member frees their seat.',
        'You are responsible for what happens under your account, including what your team does with it.',
      ],
    },
    {
      id: 'acceptable-use',
      title: 'How you may use it',
      body: [
        'You are responsible for the legality of the calls and messages you make through this product. That includes India\'s TRAI regulations on commercial communication and the DND registry, and the equivalent rules wherever you are calling.',
        'You must have a lawful basis for the lead data you upload, and consent where consent is required — including for any call recording you attach.',
        'You may not use the product to send unsolicited bulk communication, to harass, to defraud, or to impersonate anyone.',
      ],
      bullets: [
        'Do not attempt to reach another company\'s data',
        'Do not attempt to circumvent plan limits or the billing system',
        'Do not resell access without a written agreement with us',
      ],
    },
    {
      id: 'your-data',
      title: 'Your data stays yours',
      body: [
        'You own what you put in. We claim no ownership of your leads, calls, documents or notes.',
        'We will not use your data to train models, sell it, or share it with another customer.',
        'You can export your data at any time while your subscription is active.',
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      body: [
        'We aim to keep the service running and to give notice before planned maintenance, but we do not offer a guaranteed uptime figure and you should not plan around one. If you need a contractual service level, talk to us before you rely on it.',
        'The product depends on services we do not control — hosting, payment processing, and any integration you connect. An outage in one of those can stop part of the product working.',
      ],
    },
    {
      id: 'ai',
      title: 'AI features',
      body: [
        'Some features send text to a third-party model to draft a message, summarise a call, or suggest a score. What comes back is a suggestion. It can be wrong, and it is not advice.',
        'Check anything generated before you send it to a customer. You remain responsible for what you send.',
        'AI usage is metered against your plan. When the allowance is used up, the feature stops until the next cycle or an upgrade.',
      ],
    },
    {
      id: 'payment',
      title: 'Payment',
      body: [
        `Prices are shown on ${ENTITY.website} and in the billing screen, in Indian rupees, exclusive of GST unless stated.`,
        'Payments are processed by Razorpay. We do not see or store your card details.',
        'A subscription runs for the term you buy and access ends when it expires. Failure to pay suspends access; it does not by itself delete your data.',
      ],
    },
    {
      id: 'suspension',
      title: 'Suspension and termination',
      body: [
        'You may stop using the product at any time, and may ask us to delete your data.',
        'We may suspend an account for non-payment, or for use that breaks these terms or the law. Where the circumstances allow it, we will tell you first and give you a chance to put it right.',
        'On termination you have 30 days to export your data before it is deleted.',
      ],
    },
    {
      id: 'liability',
      title: 'Liability',
      body: [
        'The product is provided as it is. We do not promise it will produce any particular sales result.',
        'To the extent the law allows, our total liability for any claim is limited to the amount you paid us in the twelve months before it arose, and we are not liable for indirect or consequential loss, including lost profit or lost business.',
        'Nothing here limits liability that cannot be limited by law.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law',
      body: [
        `These terms are governed by the laws of India. The courts at ${ENTITY.jurisdiction} have exclusive jurisdiction.`,
        'Before going to court, both sides agree to try to settle the matter by writing to each other first.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      body: [
        'We may change these terms. When a change is material we raise the version and ask you to accept it when you next sign in. Continuing to use the product after that means you accept the new version.',
      ],
    },
    CONTACT_SECTION('these terms'),
  ],
};

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

const REFUND: LegalDocument = {
  slug: 'refund',
  title: 'Refund & Cancellation Policy',
  summary:
    'When we refund, when we do not, and how the free trial works.',
  version: '2.0',
  effectiveDate: '2026-08-07',
  sections: [
    {
      id: 'trial',
      title: 'Try it before you pay',
      body: [
        'Every new account gets a free trial with no card required. The length and what it includes are shown on the pricing page, which is the authority — this document deliberately does not repeat the numbers, so the two cannot disagree.',
        'The trial is how you decide whether the product suits you. Use it.',
      ],
    },
    {
      id: 'no-refund',
      title: 'Paid subscriptions are not refundable',
      body: [
        'Because a full-featured trial is available before any payment, we do not refund a subscription once it has started, including for part of a term you did not use.',
        'This is the general rule. The exceptions below are real and we honour them.',
      ],
    },
    {
      id: 'exceptions',
      title: 'When we do refund',
      body: ['We refund in full, without argument, in these cases:'],
      bullets: [
        'You were charged twice for the same thing',
        'You were charged after cancelling, or after a subscription had already ended',
        'The amount charged does not match the price shown at checkout',
        'You were charged for a plan you did not choose',
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancelling',
      body: [
        'You can cancel at any time from the billing screen or by writing to us. Cancelling stops the next renewal.',
        'Access continues to the end of the term you have already paid for. Cancelling does not cut you off immediately and does not refund the remainder.',
        'Your data is kept for 30 days after access ends, so you can export it or come back.',
      ],
    },
    {
      id: 'how-to-claim',
      title: 'How to ask for a refund',
      body: [
        `Write to ${ENTITY.supportEmail} with the payment reference and what went wrong. We will respond within three working days.`,
        'An approved refund goes back to the original payment method. Razorpay usually takes five to seven working days to complete it, and that part is not in our hands.',
      ],
    },
    {
      id: 'chargebacks',
      title: 'Chargebacks',
      body: [
        'If something looks wrong, tell us before you raise a chargeback with your bank. We will almost always resolve it faster than the bank will.',
        'A chargeback raised without contacting us first suspends the account while the bank investigates, which helps nobody.',
      ],
    },
    CONTACT_SECTION('billing or refunds'),
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  privacy: PRIVACY,
  terms: TERMS,
  refund: REFUND,
};

export const LEGAL_SLUGS: LegalSlug[] = ['privacy', 'terms', 'refund'];

/** Plain text, for the mobile app and for seeding legal_pages. */
export function renderLegalText(doc: LegalDocument): string {
  return doc.sections
    .map((s, i) => {
      const bullets = s.bullets?.length ? '\n' + s.bullets.map((b) => `• ${b}`).join('\n') : '';
      return `${i + 1}. ${s.title}\n\n${s.body.join('\n\n')}${bullets}`;
    })
    .join('\n\n');
}
