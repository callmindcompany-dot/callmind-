import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Ban,
  ShieldCheck,
  Clock,
  Mail,
  AlertTriangle,
  ChevronRight,
  FileText,
  CreditCard,
  Printer,
  ArrowLeft,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';

const TOC_SECTIONS = [
  { id: 'no-refund-policy', label: 'Strict No-Refund Policy', icon: Ban },
  { id: 'free-trial', label: '7-Day Free Trial Policy', icon: Clock },
  { id: 'cancellation', label: 'Cancellation & Renewal', icon: AlertTriangle },
  { id: 'exceptions', label: 'Exceptions & Billing Errors', icon: HelpCircle },
  { id: 'chargebacks', label: 'Chargeback & Fraud Warning', icon: XCircle },
  { id: 'contact', label: 'Contact Billing Support', icon: Mail },
];

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

const InfoBox = ({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'danger' }) => {
  const styles = {
    info: 'bg-brand-50 border-brand-200 text-brand-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={`p-4 rounded-xl border text-sm font-medium ${styles[variant]}`}>
      {children}
    </div>
  );
};

export const RefundPolicyPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Refund & Cancellation Policy — CallMind CRM"
        description="CallMind CRM subscription refund and cancellation terms, operated by Voolabs Technologies."
        path="/legal/refund"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Hero Header */}
        <section className="pt-16 pb-14 px-6 md:px-12 bg-white border-b border-slate-100 text-center">
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
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
                <Ban size={13} />
                No Refund Policy — All Sales Final
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display leading-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-xl mx-auto">
              CallMind operates under a strict No-Refund policy. All subscription sales are final. Please review our 7-day free trial before purchasing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-medium pt-2">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Effective: January 1, 2025</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Last Updated: July 28, 2026</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Entity: Voolabs Technologies</span>
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
                  >
                    <Icon size={13} className="text-slate-400" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Contact Card */}
            <div className="mt-4 bg-slate-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold mb-1">Billing Questions?</p>
              <p className="text-xs text-slate-400 mb-3">Our team responds within 24 hours.</p>
              <a
                href="mailto:support@callmind.app"
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:underline"
              >
                <Mail size={12} />
                support@callmind.app
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">

            <Section id="no-refund-policy" title="Strict No-Refund Policy" icon={Ban}>
              <P>
                CallMind ("we", "us", or "our") is a SaaS product developed and operated by <strong>Voolabs Technologies</strong>. 
              </P>
              <InfoBox variant="danger">
                🚫 <strong>ALL SALES ARE FINAL & NON-REFUNDABLE:</strong> Once a subscription plan (Starter, Growth, Pro, or Custom Enterprise) is purchased, no full or partial refunds will be issued under any circumstances.
              </InfoBox>
              <P>
                This No-Refund policy applies to all billing cycles (Monthly and Annual), seat add-ons, plan upgrades, and recurring subscription payments.
              </P>
              <Ul items={[
                'No refunds for unused subscription time or early account closure',
                'No refunds if your team makes zero phone calls during the billing period',
                'No refunds for telecaller seat downgrades midway through a billing cycle',
                'No refunds due to changes in your internal business requirements or team size',
              ]} />
            </Section>

            <Section id="free-trial" title="7-Day Free Trial Policy" icon={Clock}>
              <P>
                To help you evaluate CallMind before making any financial commitment, we provide a <strong>7-Day Free Trial</strong> with up to 2 telecaller seats.
              </P>
              <InfoBox variant="info">
                💡 <strong>Try Before You Buy:</strong> During the 7-day free trial, you have complete access to test SIM telecalling, IndiaMART/Meta webhooks, Kanban pipeline stages, and analytics. No credit card is required to register for the free trial.
              </InfoBox>
              <P>
                By upgrading to a paid plan after or during your free trial, you confirm that you have tested CallMind, verified its suitability for your team, and accept this No-Refund Policy.
              </P>
            </Section>

            <Section id="cancellation" title="Cancellation & Auto-Renewal" icon={AlertTriangle}>
              <P>
                You have complete control over your subscription and may cancel auto-renewal at any time.
              </P>
              <SubHeading>How Cancellation Works</SubHeading>
              <Ul items={[
                'You can disable auto-renewal from your Admin Dashboard → Settings → Subscription tab',
                'Cancellation stops future automatic billing charges from Razorpay',
                'Your workspace remains 100% active until the end of your current paid billing period',
                'After the paid period ends, your workspace enters read-only status',
              ]} />
            </Section>

            <Section id="exceptions" title="Exceptions & Duplicate Charge Errors" icon={HelpCircle}>
              <P>
                The only rare situation where a refund or credit may be processed is a verified <strong>technical billing duplicate charge</strong> caused by payment gateway processing errors.
              </P>
              <Ul items={[
                'Duplicate charge error (you were charged twice for the same invoice within 24 hours)',
                'Razorpay transaction success but license failure (must report within 48 hours)',
              ]} />
              <P>
                If a duplicate charge occurs, email <strong>support@callmind.app</strong> with your Razorpay Payment ID. Verified duplicate charges will be refunded to your original payment method within 5–7 business days.
              </P>
            </Section>

            <Section id="chargebacks" title="Chargebacks & Fraud Warning" icon={XCircle}>
              <P>
                Initiating an unauthorized bank chargeback or payment dispute with Razorpay without contacting CallMind billing support first is a violation of our Terms of Service.
              </P>
              <InfoBox variant="warning">
                ⚠️ <strong>Account Termination:</strong> Any fraudulent chargeback claim will result in immediate, permanent suspension of your CallMind workspace, blacklisting of company domain, and legal escalation under Indian law (IT Act, 2000).
              </InfoBox>
            </Section>

            <Section id="contact" title="Contact Billing Support" icon={Mail}>
              <P>
                For any billing questions, invoice receipts, or duplicate charge inquiries:
              </P>
              <div className="grid sm:grid-cols-2 gap-4 mt-4 font-sans">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">CallMind Support Email</span>
                  </div>
                  <a href="mailto:support@callmind.app" className="text-sm font-semibold text-brand-600 hover:underline">
                    support@callmind.app
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
                    <ShieldCheck size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-700">Voolabs Technologies — Legal & Billing Entity</span>
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

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-slate-800 mt-5 mb-2">{children}</h3>
);
