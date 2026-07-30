import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lock,
  CreditCard,
  Ban,
  Scale,
  Globe,
  Mail,
  Clock,
  ShieldCheck,
  ChevronRight,
  Phone,
  UserCheck,
  AlertCircle,
  Printer,
  Building2,
  Link,
  ArrowLeft
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';

// ─── TOC Sections ────────────────────────────────────────────────────────────
const TOC_SECTIONS = [
  { id: 'acceptance', label: 'Acceptance of Terms', icon: CheckCircle2 },
  { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
  { id: 'license', label: 'License & Access', icon: FileText },
  { id: 'accounts', label: 'User Accounts', icon: Building2 },
  { id: 'trial', label: 'Free Trial Terms', icon: Clock },
  { id: 'payments', label: 'Payments & Billing', icon: CreditCard },
  { id: 'prohibited', label: 'Prohibited Use', icon: Ban },
  { id: 'ip', label: 'Intellectual Property', icon: Lock },
  { id: 'sim-privacy', label: 'SIM Privacy Clause', icon: Phone },
  { id: 'ai-features', label: 'AI Features', icon: ShieldCheck },
  { id: 'termination', label: 'Termination', icon: AlertTriangle },
  { id: 'liability', label: 'Limitation of Liability', icon: AlertCircle },
  { id: 'indemnification', label: 'Indemnification', icon: ShieldCheck },
  { id: 'governing-law', label: 'Governing Law', icon: Scale },
  { id: 'changes', label: 'Changes to Terms', icon: Link },
  { id: 'contact', label: 'Contact Us', icon: Mail },
];

// ─── Components ───────────────────────────────────────────────────────────────
const Section = ({ id, title, icon: Icon, children }: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-28 mb-12">
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
      <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
        <Icon size={18} className="text-brand-600" />
      </div>
      <h2 className="text-xl font-black text-slate-900 font-display">{title}</h2>
    </div>
    <div className="space-y-3 text-sm text-slate-600 leading-relaxed font-sans">
      {children}
    </div>
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
);

const Ul = ({ items }: { items: string[] }) => (
  <ul className="space-y-2 mt-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
        <ChevronRight size={14} className="text-brand-500 mt-0.5 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-slate-800 mt-5 mb-2">{children}</h3>
);

const InfoBox = ({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'success' | 'danger' }) => {
  const styles = {
    info: 'bg-brand-50 border-brand-200 text-brand-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={`p-4 rounded-xl border text-sm font-medium ${styles[variant]}`}>
      {children}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const TermsOfServicePage = () => {
  const [activeSection, setActiveSection] = useState('acceptance');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-25% 0px -70% 0px' }
    );

    TOC_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Terms of Service — CallMind CRM by Voolabs"
        description="The terms governing use of CallMind CRM, operated by Voolabs Technologies."
        path="/legal/terms"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Hero Header */}
        <section className="pt-20 pb-14 px-6 md:px-12 bg-white border-b border-slate-100 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto space-y-5"
          >
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer mb-2"
            >
              <ArrowLeft size={13} /> Back to Home
            </button>
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
                <FileText size={13} />
                Legal Document
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display leading-tight">
              Terms of Service
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-xl mx-auto">
              These terms govern your use of CallMind. Please read them carefully before using our platform. By using CallMind, you agree to be bound by these terms.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-medium pt-2">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Effective: January 1, 2025</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Last Updated: July 28, 2026</span>
              <span className="flex items-center gap-1.5"><Globe size={12} /> Jurisdiction: India (Mumbai Courts)</span>
            </div>
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all btn-tactile"
              >
                <Printer size={13} />
                Print / Save PDF
              </button>
            </div>
          </motion.div>
        </section>

        {/* Content Layout */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex gap-10 items-start">

          {/* Sticky Sidebar TOC */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Table of Contents</p>
              <nav className="space-y-1">
                {TOC_SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                      activeSection === id
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={13} className={activeSection === id ? 'text-brand-600' : 'text-slate-400'} />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contact Card */}
            <div className="mt-4 bg-brand-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold mb-1">Legal Questions?</p>
              <p className="text-xs text-white/70 mb-3">Our team responds within 48 hours.</p>
              <a
                href="mailto:callmind.company@gmail.com"
                className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-brand-200 transition-colors"
              >
                <Mail size={12} />
                callmind.company@gmail.com
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <div ref={contentRef} className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">

            <Section id="acceptance" title="Acceptance of Terms" icon={CheckCircle2}>
              <P>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "Company Admin", or "Telecaller") and <strong>Voolabs Technologies</strong> ("Voolabs", "we", "us", or "our"), the developer and operator of the <strong>CallMind</strong> SaaS platform.
              </P>
              <P>
                By creating an account, accessing, or using CallMind in any way — including through our web application, mobile app, or APIs — you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use CallMind.
              </P>
              <InfoBox variant="warning">
                ⚠️ If you are accessing CallMind on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms. By accepting, you agree on behalf of that entity.
              </InfoBox>
            </Section>

            <Section id="eligibility" title="Eligibility" icon={UserCheck}>
              <P>To use CallMind, you must meet the following eligibility requirements:</P>
              <Ul items={[
                'Be at least 18 years of age',
                'Be legally authorized to enter into binding contracts under applicable Indian law',
                'Represent a legitimate business entity or be an authorized agent of one',
                'Not be barred from receiving services under Indian law or other applicable regulations',
                'Provide accurate and complete registration information',
              ]} />
              <P>
                CallMind is a <strong>B2B platform</strong>. It is designed for businesses, sales teams, telecalling agencies, and BPO operations. Consumer or personal use is not the intended use case.
              </P>
            </Section>

            <Section id="license" title="License & Access" icon={FileText}>
              <P>
                Subject to your compliance with these Terms and payment of applicable subscription fees, Voolabs grants you a <strong>limited, non-exclusive, non-transferable, revocable license</strong> to access and use the CallMind platform for your internal business operations.
              </P>
              <SubHeading>What You May Do</SubHeading>
              <Ul items={[
                'Access the CallMind web app and mobile app on authorized devices',
                'Add team members (agents) up to your plan limit',
                'Import, manage, and export lead data for your own business',
                'Use AI features within your purchased plan\'s AI credit allocation',
                'Integrate with approved third-party services (webhooks, APIs)',
              ]} />
              <SubHeading>What You May NOT Do</SubHeading>
              <Ul items={[
                'Sublicense, resell, or white-label CallMind without written permission from Voolabs',
                'Reverse-engineer, decompile, or attempt to extract the source code',
                'Use the platform to provide services to third-party companies without a reseller agreement',
                'Share login credentials with unauthorized personnel',
              ]} />
            </Section>

            <Section id="accounts" title="User Accounts" icon={Building2}>
              <SubHeading>Company Admin Responsibilities</SubHeading>
              <P>
                The individual who creates a CallMind workspace ("Company Admin") is responsible for:
              </P>
              <Ul items={[
                'Maintaining the confidentiality of the account password and access credentials',
                'All activities that occur under the company workspace',
                'Ensuring all invited team members (telecallers, managers) comply with these Terms',
                'Promptly notifying Voolabs of any unauthorized access or security breach',
              ]} />

              <SubHeading>Account Accuracy</SubHeading>
              <P>
                You agree to provide accurate, current, and complete information during registration and to keep this information up to date. Providing false information may result in immediate account suspension.
              </P>

              <InfoBox variant="info">
                📌 Company Admins can invite team members via invite links or email. Each invited member must accept the invitation and agree to these Terms before accessing the workspace.
              </InfoBox>
            </Section>

            <Section id="trial" title="Free Trial Terms" icon={Clock}>
              <P>
                CallMind offers a <strong>7-Day Free Trial</strong> for new company registrations. The trial includes:
              </P>
              <Ul items={[
                'Full access to all features of the selected plan',
                'Up to 2 telecaller seats during the trial period',
                'No credit card required to start the trial',
                'Automatic expiry after 7 calendar days from workspace creation',
              ]} />

              <InfoBox variant="warning">
                ⚠️ <strong>Trial Limitations:</strong> Certain enterprise features (such as advanced integrations, custom domain, and dedicated support) may require a paid subscription even during the trial period.
              </InfoBox>

              <SubHeading>After Trial Expiry</SubHeading>
              <P>
                Upon expiry of the free trial, your workspace will enter a <strong>paused state</strong>. You will not lose your data for 30 days post-expiry. To continue using CallMind, you must upgrade to a paid plan. After 30 days in expired state with no upgrade, your data may be permanently deleted.
              </P>
            </Section>

            <Section id="payments" title="Payments & Billing" icon={CreditCard}>
              <SubHeading>Subscription Plans</SubHeading>
              <P>
                CallMind offers monthly and annual subscription plans. All prices are listed in Indian Rupees (INR) and are exclusive of applicable GST (18%).
              </P>

              <SubHeading>Billing Cycle</SubHeading>
              <Ul items={[
                'Monthly plans: billed on the same date every month',
                'Annual plans: billed once per year, with a discount vs. monthly billing',
                'Seat-based pricing: charged per active telecaller seat per billing cycle',
                'GST invoices are generated automatically and available in the Billing section',
              ]} />

              <SubHeading>Payment Methods</SubHeading>
              <P>
                Payments are processed through <strong>Razorpay</strong> (India) or <strong>Stripe</strong>. We accept UPI, net banking, credit/debit cards (Visa, Mastercard, RuPay), and EMI options. We do not store raw card data — all payment data is handled by PCI-DSS compliant processors.
              </P>

              <SubHeading>Late Payment & Suspension</SubHeading>
              <P>
                If a payment fails, we will retry the charge 3 times over 7 days. If payment remains unsuccessful, your account will be suspended. Data is retained for 30 days after suspension before permanent deletion.
              </P>

              <InfoBox variant="info">
                🧾 GST Number: You can add your company GST number in Settings → Billing to receive GST-compliant invoices. We are registered under GST and charge 18% GST on all subscriptions.
              </InfoBox>
            </Section>

            <Section id="prohibited" title="Prohibited Use" icon={Ban}>
              <P>You agree NOT to use CallMind for any of the following purposes:</P>
              <Ul items={[
                'Calling or messaging individuals who have registered on the National Do Not Call (DND/NDNC) Registry without proper consent',
                'Spamming, phishing, or conducting fraudulent telecalling campaigns',
                'Recording or storing call audio through any unauthorized mechanism',
                'Uploading or processing data obtained through illegal means or data breaches',
                'Attempting to hack, DDoS, or compromise the security of the CallMind platform',
                'Using the platform to conduct activities that violate TRAI guidelines or Indian telecom regulations',
                'Scraping, crawling, or extracting data from CallMind using automated bots',
                'Creating accounts under false identities or misrepresenting your organization',
                'Using CallMind for multi-level marketing (MLM), ponzi schemes, or fraudulent sales practices',
                'Uploading content that is defamatory, obscene, or violates the IT Act, 2000',
              ]} />
              <InfoBox variant="danger">
                🚫 Violation of these prohibited use terms may result in <strong>immediate account termination without refund</strong> and may lead to legal action under applicable Indian law.
              </InfoBox>
            </Section>

            <Section id="ip" title="Intellectual Property" icon={Lock}>
              <SubHeading>Voolabs Intellectual Property</SubHeading>
              <P>
                The CallMind platform, including its software, source code, design, UI, logos, trademarks, AI models, and all associated documentation, are the sole and exclusive property of <strong>Voolabs Technologies</strong>. All rights are reserved.
              </P>
              <P>
                Nothing in these Terms grants you any right, title, or interest in Voolabs's intellectual property other than the limited license described herein.
              </P>

              <SubHeading>Your Data</SubHeading>
              <P>
                You retain full ownership of all data you upload to CallMind — including lead records, call notes, and company data. By using CallMind, you grant Voolabs a limited, non-exclusive license to process and store your data solely for the purpose of providing the CallMind service to you.
              </P>
              <P>
                We do not claim ownership of your business data and will not use it for purposes other than providing the contracted service.
              </P>
            </Section>

            <Section id="sim-privacy" title="SIM Privacy Clause" icon={Phone}>
              <InfoBox variant="success">
                📱 <strong>Core Privacy Guarantee:</strong> CallMind is built on a SIM-privacy-first architecture. Calls are initiated and completed through the telecaller's personal device SIM — not through VOIP or any recording-enabled system operated by Voolabs.
              </InfoBox>
              <SubHeading>What CallMind Does NOT Do</SubHeading>
              <Ul items={[
                'CallMind does NOT record any call audio at any point',
                'CallMind does NOT store voice data on our servers',
                'CallMind does NOT intercept call content',
                'CallMind does NOT access the customer\'s personal phone number beyond what you explicitly enter',
              ]} />

              <SubHeading>What CallMind Does</SubHeading>
              <Ul items={[
                'Logs call metadata: timestamp, duration, agent name, and lead disposition',
                'Allows agents to add call notes and follow-up reminders after each call',
                'Provides analytics on call volume, success rate, and team performance',
              ]} />
              <P>
                You, as the Company Admin, are responsible for ensuring your telecallers comply with TRAI regulations when using the SIM calling feature, including obtaining proper consent from leads before calling.
              </P>
            </Section>

            <Section id="ai-features" title="AI Features" icon={ShieldCheck}>
              <P>
                CallMind provides AI-powered features including the CallMind AI Assistant (Support Chatbot) and AI Insights Hub, powered by the <strong>Google Gemini API</strong>.
              </P>
              <Ul items={[
                'AI responses are generated based on your queries and anonymized platform context',
                'AI outputs are informational and should not be treated as legal, financial, or medical advice',
                'Voolabs is not liable for decisions made based on AI-generated insights',
                'Your AI queries are subject to Google\'s usage policies for the Gemini API',
                'Voolabs AI features operate under a 10-layer security guardrail to prevent leakage of sensitive system prompts or API keys',
              ]} />
              <InfoBox variant="info">
                🤖 AI chat history is automatically deleted every 24 hours. We do not retain AI conversation logs beyond this window.
              </InfoBox>
            </Section>

            <Section id="termination" title="Termination" icon={AlertTriangle}>
              <SubHeading>Termination by You</SubHeading>
              <P>
                You may cancel your CallMind subscription at any time by navigating to <strong>Settings → Billing → Cancel Subscription</strong>. Upon cancellation, your workspace will remain active until the end of the current billing period.
              </P>

              <SubHeading>Termination by Voolabs</SubHeading>
              <P>Voolabs reserves the right to suspend or terminate your account with immediate effect if:</P>
              <Ul items={[
                'You violate any provision of these Terms',
                'You engage in prohibited use as defined above',
                'We receive a legal order, court directive, or regulatory requirement to do so',
                'Your account payment is overdue by more than 30 days',
                'We determine, at our sole discretion, that continued service poses a risk to our platform or other users',
              ]} />

              <SubHeading>Effect of Termination</SubHeading>
              <P>
                Upon termination, your access to the platform will be immediately revoked. Your data will be retained for 30 days during which you may request a full data export. After 30 days, all data will be permanently deleted.
              </P>
            </Section>

            <Section id="liability" title="Limitation of Liability" icon={AlertCircle}>
              <P>
                To the maximum extent permitted under applicable Indian law, Voolabs Technologies shall NOT be liable for:
              </P>
              <Ul items={[
                'Loss of business, revenue, or profits arising from platform downtime',
                'Indirect, incidental, special, or consequential damages',
                'Data loss due to factors outside our reasonable control (natural disasters, cyber attacks by third parties, etc.)',
                'Decisions or outcomes resulting from AI-generated insights or recommendations',
                'Actions of third-party services integrated with CallMind (e.g., Razorpay, Supabase)',
              ]} />
              <P>
                Voolabs's total aggregate liability under these Terms shall not exceed the <strong>amount paid by you in the 3 months immediately preceding the event giving rise to the claim</strong>.
              </P>

              <InfoBox variant="warning">
                ⚠️ CallMind is provided "as is" and "as available". While we strive for 99.9% uptime, we do not warrant that the service will be error-free, uninterrupted, or meet your specific requirements.
              </InfoBox>
            </Section>

            <Section id="indemnification" title="Indemnification" icon={ShieldCheck}>
              <P>
                You agree to indemnify, defend, and hold harmless Voolabs Technologies and its officers, directors, employees, and agents from any claims, liabilities, damages, costs, or expenses (including legal fees) arising from:
              </P>
              <Ul items={[
                'Your violation of these Terms or any applicable law',
                'Your use of the CallMind platform in a manner not permitted by these Terms',
                'Your infringement of any third-party rights (intellectual property, privacy, etc.)',
                'Any data you upload to the platform that violates applicable laws',
                'Claims by your telecallers, leads, or customers arising from your use of CallMind',
              ]} />
            </Section>

            <Section id="governing-law" title="Governing Law" icon={Scale}>
              <P>
                These Terms shall be governed by and construed in accordance with the <strong>laws of India</strong>. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in <strong>Mumbai, Maharashtra, India</strong>.
              </P>
              <P>
                Before initiating legal proceedings, you agree to first attempt to resolve disputes through our support team (support@callmind.app) with a 30-day good-faith negotiation period.
              </P>
              <InfoBox variant="info">
                ⚖️ Applicable Laws: Information Technology Act, 2000 | IT (Amendment) Act, 2008 | Consumer Protection Act, 2019 | Indian Contract Act, 1872
              </InfoBox>
            </Section>

            <Section id="changes" title="Changes to Terms" icon={Link}>
              <P>
                Voolabs reserves the right to modify these Terms at any time. When we make material changes, we will:
              </P>
              <Ul items={[
                'Update the "Last Updated" date at the top of this page',
                'Send an in-app notification to all active Company Admins',
                'Provide at least 14 days\' notice before changes take effect for paid subscribers',
              ]} />
              <P>
                Your continued use of CallMind after any changes constitutes your acceptance of the updated Terms. If you disagree with the updated Terms, you must stop using the platform and may cancel your subscription.
              </P>
            </Section>

            <Section id="contact" title="Contact Us" icon={Mail}>
              <P>For legal inquiries, Terms-related questions, or contract requests, contact us:</P>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">CallMind Official Email</span>
                  </div>
                  <a href="mailto:callmind.company@gmail.com" className="text-sm font-semibold text-brand-600 hover:underline">
                    callmind.company@gmail.com
                  </a>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">Voolabs Corporate Email</span>
                  </div>
                  <a href="mailto:voolabsofficial@gmail.com" className="text-sm font-semibold text-brand-600 hover:underline">
                    voolabsofficial@gmail.com
                  </a>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">Voolabs Technologies — Service Provider</span>
                  </div>
                  <p className="text-sm text-slate-600">Mumbai, Maharashtra, India · Contact: voolabsofficial@gmail.com</p>
                </div>
              </div>
            </Section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
