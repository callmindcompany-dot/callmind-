import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { PlanCard } from '../components/PlanCard';
import { useNavigate } from 'react-router-dom';
import { FREE_TRIAL_CONFIG, GST_RATE } from '../../config/pricing';
import { MARKETING_PLANS } from '../data/planCopy';

const faqs = [
  {
    question: `How does the ${FREE_TRIAL_CONFIG.trialDays}-day free trial work?`,
    answer: `You get full access to CallMind with up to ${FREE_TRIAL_CONFIG.includedTelecallers} telecaller seats for ${FREE_TRIAL_CONFIG.trialDays} days. Zero credit card required to start.`,
  },
  {
    question: 'Can I upgrade or downgrade my plan later?',
    answer: 'Yes, you can change your plan or seat count anytime from your workspace settings. Changes take effect immediately.',
  },
  {
    question: 'Do you provide GST tax invoices?',
    answer: 'Yes, all paid subscriptions include downloadable tax invoices with full 18% GST breakdown (CGST 9% + SGST 9%) and your company GSTIN.',
  },
  {
    question: 'How does SIM-based telecalling work?',
    answer: 'Telecallers use the CallMind mobile app to dial leads directly from their phone SIM. No VoIP software or internet calling needed.',
  },
  {
    question: 'Is our customer data secure?',
    answer: 'Yes. Your workspace data is scoped to your company by PostgreSQL Row-Level Security policies enforced in the database. We also do not record or store call audio.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Credit/Debit Cards, UPI, Net Banking, and corporate cards via Razorpay payment gateway.',
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = MARKETING_PLANS;

  // The largest annual discount across the three plans, from the config.
  const maxAnnualSavingPercent = Math.max(
    ...plans.map((p) => Math.round(((p.monthlyPrice - p.annualPrice) / p.monthlyPrice) * 100)),
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Pricing Plans — Transparent Per-Telecaller Subscription | CallMind CRM"
        description={`Simple, transparent telecalling CRM pricing for Indian SMEs. Starter, Growth, and Pro plans per telecaller with ${FREE_TRIAL_CONFIG.trialDays}-day free trial and 18% GST input tax credit.`}
        path="/pricing"
        keywords={[
          'telecalling CRM pricing India',
          'affordable sales CRM',
          'CRM per user cost',
          'BPO telecalling software price',
          'GST invoice CRM software',
          'SaaS CRM plans India',
          'SIM calling software subscription',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
        jsonLd={[
          {
            '@type': 'ProductGroup',
            '@id': 'https://callmind.app/pricing#plans',
            name: 'CallMind CRM Subscription Plans',
            description:
              'Per-telecaller monthly and annual plans for CallMind CRM with GST-compliant tax invoices.',
            hasVariant: plans.map((p) => ({
              '@type': 'Product',
              name: `CallMind ${p.name} Plan`,
              description: `${p.description} Includes ${p.seats} and ${p.leads}.`,
              offers: {
                '@type': 'Offer',
                priceCurrency: 'INR',
                price: String(p.annualPrice),
                billingDuration: 'P1M',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: String(p.annualPrice),
                  priceCurrency: 'INR',
                  unitCode: 'MON',
                  referenceQuantity: {
                    '@type': 'QuantitativeValue',
                    value: '1',
                    unitCode: 'C62',
                  },
                },
              },
            })),
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-20 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Simple & Transparent Pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Choose the Plan for Your Sales Team
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            {/*
              Read from the config. Both of these said "7-day" as a literal, so
              shortening the trial would have left the page advertising the old
              one — the same drift that once had four surfaces quoting four
              different prices.
            */}
            Start with a {FREE_TRIAL_CONFIG.trialDays}-day free trial, {FREE_TRIAL_CONFIG.includedTelecallers} telecallers
            and {new Intl.NumberFormat('en-IN').format(FREE_TRIAL_CONFIG.leadLimit)} leads included.
            Upgrade as your team grows. Download tax-compliant GST invoices anytime.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-sm font-semibold ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              role="switch"
              aria-checked={isAnnual}
              className="w-14 h-8 bg-slate-200 rounded-full p-1 transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              aria-label="Toggle annual billing"
            >
              <motion.div
                animate={{ x: isAnnual ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-6 h-6 bg-brand-600 rounded-full shadow-md"
              />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Annual
              {/*
                Was a hardcoded "Save ~20%". The real discount differs by plan --
                Starter, Growth and Pro do not save the same share -- so this
                states the best of the three and computes it from the config
                rather than rounding a guess into the page.
              */}
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                Save up to {maxAnnualSavingPercent}%
              </span>
            </span>
          </div>
        </section>

        {/*
          Each card carries its own seat stepper and shows what that team size
          actually costs, GST included in the arithmetic and named on the line.
          The page previously printed a per-seat rate and left the customer to
          multiply, then meet the tax on the invoice.
        */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                onChoose={() => navigate('/signup')}
              />
            ))}
          </div>

          <p className="max-w-2xl mx-auto text-center text-xs text-slate-500 font-medium mt-10 leading-relaxed">
            Prices are per telecaller seat and exclude {Math.round(GST_RATE * 100)}% GST, which is
            shown separately on every invoice with your GSTIN. Move up a plan whenever your team
            outgrows its seat limit.
          </p>
        </section>

        {/* FAQs */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-slate-900 font-display">Frequently Asked Questions</h2>
              <p className="text-sm text-slate-500 font-medium">Everything you need to know about CallMind billing and features.</p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="w-full p-5 text-left flex justify-between items-center font-bold text-sm text-slate-900 font-sans"
                  >
                    <span>{faq.question}</span>
                    {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
