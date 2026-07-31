import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Database,
  Eye,
  Lock,
  Globe,
  Mail,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  Share2,
  ChevronRight,
  Phone,
  Cookie,
  UserCheck,
  Server,
  Printer,
  ArrowLeft
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';

// ─── TOC Sections ────────────────────────────────────────────────────────────
const TOC_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'information-we-collect', label: 'Information We Collect', icon: Database },
  { id: 'how-we-use', label: 'How We Use Your Data', icon: Eye },
  { id: 'data-storage', label: 'Data Storage & Security', icon: Server },
  { id: 'data-sharing', label: 'Data Sharing', icon: Share2 },
  { id: 'cookies', label: 'Cookies & Tracking', icon: Cookie },
  { id: 'user-rights', label: 'Your Rights', icon: UserCheck },
  { id: 'data-retention', label: 'Data Retention', icon: Clock },
  { id: 'childrens-privacy', label: "Children's Privacy", icon: AlertCircle },
  { id: 'third-party', label: 'Third-Party Services', icon: Globe },
  { id: 'changes', label: 'Changes to Policy', icon: FileText },
  { id: 'contact', label: 'Contact Us', icon: Mail },
];

// ─── Section Component ────────────────────────────────────────────────────────
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

const InfoBox = ({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'success' }) => {
  const styles = {
    info: 'bg-brand-50 border-brand-200 text-brand-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };
  return (
    <div className={`p-4 rounded-xl border text-sm font-medium ${styles[variant]}`}>
      {children}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PrivacyPolicyPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
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
        title="Privacy Policy — CallMind CRM by Voolabs"
        description="How CallMind CRM by Voolabs Technologies collects, uses, stores, and protects your data."
        path="/legal/privacy"
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
                <ShieldCheck size={13} />
                Legal Document
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display leading-tight">
              Privacy Policy
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-xl mx-auto">
              We are committed to protecting your personal data. This policy explains what information CallMind collects, how we use it, and the rights you have over your data.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-medium pt-2">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Effective: January 1, 2025</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Last Updated: July 28, 2026</span>
              <span className="flex items-center gap-1.5"><Globe size={12} /> Jurisdiction: India (IT Act, 2000)</span>
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
              <p className="text-xs font-bold mb-1">Privacy Questions?</p>
              <p className="text-xs text-white/70 mb-3">Our team responds within 48 hours.</p>
              <a
                href="mailto:privacy@callmind.app"
                className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-brand-200 transition-colors"
              >
                <Mail size={12} />
                privacy@callmind.app
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <div ref={contentRef} className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">

            <Section id="overview" title="Overview" icon={ShieldCheck}>
              <P>
                CallMind ("we", "us", or "our") is a SaaS CRM product developed and operated by <strong>Voolabs Technologies</strong>, a company incorporated under Indian law with its principal place of business in Mumbai, Maharashtra, India.
              </P>
              <P>
                This Privacy Policy applies to all users of the CallMind platform, including the web application (app.callmind.app), the marketing website (callmind.app), and the CallMind Mobile App (telecaller companion app). By using CallMind, you agree to the collection and use of information described in this policy.
              </P>
              <InfoBox variant="success">
                🔒 <strong>Core Commitment:</strong> CallMind is built on the principle of <strong>100% SIM Privacy</strong>. We do NOT record, store, or process any audio from calls made through your telecaller's SIM card. Calls are made device-to-device; we only capture metadata such as call duration, timestamps, and disposition notes entered by the agent.
              </InfoBox>
              <P>
                This policy is governed by the <strong>Information Technology Act, 2000</strong> and the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> ("SPDI Rules") of India.
              </P>
            </Section>

            <Section id="information-we-collect" title="Information We Collect" icon={Database}>
              <SubHeading>A. Account & Profile Information</SubHeading>
              <Ul items={[
                'Full name, email address, and phone number (provided at registration or onboarding)',
                'Company name, industry type, and job role',
                'Profile photo (optional, Google Sign-In avatar)',
                'Password (stored as a cryptographic hash — we never store plaintext passwords)',
              ]} />

              <SubHeading>B. Usage & Call Activity Data</SubHeading>
              <Ul items={[
                'Lead records added by your team (name, phone, email, custom fields)',
                'Call logs: timestamp, duration, call disposition, agent name',
                'Note entries, follow-up reminders, and pipeline stage changes',
                'Chat messages between team members within the CRM',
                'AI Insights usage (queries sent to the AI assistant)',
              ]} />

              <SubHeading>C. Technical & Device Data</SubHeading>
              <Ul items={[
                'IP address, browser type, and operating system',
                'Pages visited, time on page, and navigation path (analytics)',
                'Device identifiers for the CallMind Mobile App',
                'Error logs and crash reports (to diagnose and fix bugs)',
              ]} />

              <SubHeading>D. Billing Information</SubHeading>
              <Ul items={[
                'Subscription plan, billing cycle, and payment method type',
                'GST number and billing address (for Indian invoicing)',
                'Payment transactions processed via Razorpay or Stripe — we do NOT store raw card numbers',
              ]} />

              <InfoBox variant="info">
                📌 We do <strong>NOT</strong> collect: audio recordings, SMS content, personal messages outside the platform, or biometric data of any kind.
              </InfoBox>
            </Section>

            <Section id="how-we-use" title="How We Use Your Data" icon={Eye}>
              <P>We use the data we collect for the following purposes:</P>
              <SubHeading>Core Service Delivery</SubHeading>
              <Ul items={[
                'Provide access to the CallMind CRM dashboard, mobile app, and all subscribed features',
                'Authenticate your identity and manage session security',
                'Process payments, generate GST invoices, and maintain billing records',
                'Enable multi-agent team collaboration, role-based access, and data isolation between companies',
              ]} />

              <SubHeading>Product Improvement</SubHeading>
              <Ul items={[
                'Analyze aggregated, anonymized usage patterns to improve features',
                'Diagnose and resolve technical bugs and performance issues',
                'Train AI features using anonymized call metadata (never raw audio)',
              ]} />

              <SubHeading>Communication</SubHeading>
              <Ul items={[
                'Send transactional emails: account creation, OTP, password reset, invoices',
                'Send product update announcements and feature release notes (opt-out available)',
                'Send billing reminders and subscription renewal notices',
              ]} />

              <InfoBox variant="warning">
                ⚠️ We do <strong>NOT</strong> use your lead database (your customers' contact info) for any purpose other than providing the CRM service to your company. Your leads are YOUR data.
              </InfoBox>
            </Section>

            <Section id="data-storage" title="Data Storage & Security" icon={Server}>
              <P>
                CallMind's primary data infrastructure is hosted on <strong>Supabase</strong> (PostgreSQL), with services distributed across secure cloud data centers. Our AI features use the <strong>Google Gemini API</strong>.
              </P>
              <SubHeading>Security Measures</SubHeading>
              <Ul items={[
                'All data is encrypted in transit using TLS 1.3',
                'Database-level encryption at rest (AES-256)',
                'Row-Level Security (RLS) policies isolate each company\'s data — no cross-tenant access is possible',
                'Supabase Authentication handles password hashing (bcrypt) and session management',
                'API keys and secrets are stored in environment variables, never in source code',
                'Regular automated backups with point-in-time recovery',
                'Access to production systems is restricted to authorized Voolabs engineers only',
              ]} />

              <InfoBox variant="success">
                🛡️ CallMind has passed internal security audits including OWASP Top 10 review, SQL injection testing, and XSS prevention verification.
              </InfoBox>
            </Section>

            <Section id="data-sharing" title="Data Sharing" icon={Share2}>
              <P>
                We do not sell, trade, or rent your personal data to third parties. We may share data only in the following limited circumstances:
              </P>
              <SubHeading>Service Providers (Sub-processors)</SubHeading>
              <Ul items={[
                'Supabase — Database hosting and authentication',
                'Google Gemini API — AI-powered insights and chatbot responses',
                'Razorpay / Stripe — Payment processing (PCI-DSS compliant)',
                'Vercel / Cloudflare — Hosting, CDN, and DDoS protection',
                'PostHog — Product analytics (anonymized, no PII sharing)',
              ]} />
              <P>All sub-processors are bound by confidentiality agreements and data processing terms.</P>

              <SubHeading>Legal Compliance</SubHeading>
              <P>
                We may disclose personal data if required by law, court order, or government authority under Indian law (IT Act, 2000, Section 69). We will notify users to the extent permitted by law before any such disclosure.
              </P>

              <SubHeading>Business Transfer</SubHeading>
              <P>
                In the event of a merger, acquisition, or sale of assets involving Voolabs Technologies, your data may be transferred to the acquiring entity, subject to the same privacy protections as this policy.
              </P>
            </Section>

            <Section id="cookies" title="Cookies & Tracking" icon={Cookie}>
              <P>CallMind uses cookies and similar technologies for the following purposes:</P>
              <SubHeading>Essential Cookies (Always Active)</SubHeading>
              <Ul items={[
                'Authentication tokens — keep you signed in securely',
                'CSRF protection tokens — prevent cross-site request forgery',
                'Session preferences — language, UI state, sidebar collapse',
              ]} />

              <SubHeading>Analytics Cookies (Opt-Out Available)</SubHeading>
              <Ul items={[
                'PostHog session replay and event tracking (anonymized)',
                'Page view analytics to understand which features are used',
              ]} />

              <P>
                You can disable non-essential cookies from your browser settings. Disabling essential cookies may prevent you from signing in to the platform.
              </P>
            </Section>

            <Section id="user-rights" title="Your Rights" icon={UserCheck}>
              <P>As a user of CallMind (and as an Indian data subject under SPDI Rules), you have the following rights:</P>
              <Ul items={[
                'Right to Access — Request a copy of all personal data we hold about you',
                'Right to Correction — Request correction of inaccurate or incomplete data',
                'Right to Deletion — Request deletion of your account and associated data',
                'Right to Portability — Request an export of your lead data and call logs in CSV format',
                'Right to Withdraw Consent — Opt out of marketing communications at any time via "Unsubscribe" links',
                'Right to Restrict Processing — Request that we limit how we process your data in certain circumstances',
              ]} />
              <P>
                To exercise any of these rights, email us at <strong>privacy@callmind.app</strong> with subject line "Privacy Rights Request". We will respond within <strong>30 business days</strong> as required under applicable Indian law.
              </P>
              <InfoBox variant="info">
                📧 Account deletion requests submitted by the Company Admin will permanently delete all user profiles, lead data, call logs, and billing history associated with that company workspace.
              </InfoBox>
            </Section>

            <Section id="data-retention" title="Data Retention" icon={Clock}>
              <P>We retain your data for the following durations:</P>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border border-slate-200">
                      <th className="text-left p-3 font-bold text-slate-700 border border-slate-200">Data Type</th>
                      <th className="text-left p-3 font-bold text-slate-700 border border-slate-200">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Account profile data', 'Duration of active subscription + 90 days after cancellation'],
                      ['Lead records & call logs', 'Duration of active subscription + 90 days after cancellation'],
                      ['Billing & GST invoices', '7 years (as required by Indian tax law)'],
                      ['AI chat history', '24 hours (auto-purged)'],
                      ['Error logs & crash reports', '30 days'],
                      ['Anonymized analytics', 'Up to 24 months'],
                    ].map(([type, period], i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-3 text-slate-700 border border-slate-200 font-medium">{type}</td>
                        <td className="p-3 text-slate-600 border border-slate-200">{period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="childrens-privacy" title="Children's Privacy" icon={AlertCircle}>
              <P>
                CallMind is a professional B2B SaaS platform intended for businesses and their employees. It is <strong>not directed at children under the age of 18</strong>. We do not knowingly collect personal data from minors.
              </P>
              <P>
                If you believe that a minor has provided us with personal data, please contact us at <strong>privacy@callmind.app</strong> and we will promptly delete the information.
              </P>
            </Section>

            <Section id="third-party" title="Third-Party Services" icon={Globe}>
              <P>
                CallMind integrates with third-party services that have their own privacy policies. We encourage you to review the privacy policies of:
              </P>
              <Ul items={[
                'Google (Sign-In, Gemini AI) — policies.google.com/privacy',
                'Razorpay (Payments) — razorpay.com/privacy',
                'Supabase (Infrastructure) — supabase.com/privacy',
                'Twilio / MSG91 (SMS & OTP) — their respective privacy policies',
              ]} />
              <P>
                CallMind is not responsible for the privacy practices of third-party services. Your use of such services is governed by their terms and privacy policies.
              </P>
            </Section>

            <Section id="changes" title="Changes to This Policy" icon={FileText}>
              <P>
                We may update this Privacy Policy from time to time as our product evolves or as required by law. When we make material changes, we will:
              </P>
              <Ul items={[
                'Update the "Last Updated" date at the top of this page',
                'Send an in-app notification to all active users at least 7 days before the change takes effect',
                'For significant changes, send an email notification to the registered company admin',
              ]} />
              <P>
                Your continued use of CallMind after any changes constitutes your acceptance of the updated Privacy Policy.
              </P>
            </Section>

            <Section id="contact" title="Contact Us" icon={Mail}>
              <P>
                For any privacy-related inquiries, data requests, or concerns, please contact us:
              </P>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">CallMind Official Email</span>
                  </div>
                  <a href="mailto:privacy@callmind.app" className="text-sm font-semibold text-brand-600 hover:underline">
                    privacy@callmind.app
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
                    <Lock size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">Voolabs Technologies — Data Controller</span>
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
