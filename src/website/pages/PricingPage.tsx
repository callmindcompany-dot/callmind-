import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, HelpCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { PRICING_PLANS } from '../../config/pricing';

const faqs = [
  {
    question: 'How does the 7-day free trial work?',
    answer: 'You get full access to CallMind with up to 2 telecaller seats for 7 days. Zero credit card required to start.',
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
    answer: 'Yes. We enforce Supabase Row-Level Security (RLS), meaning each company\'s data is completely isolated. We do not record or store call audio.',
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

  const plans = [
    {
      id: 'starter',
      name: PRICING_PLANS.starter.name,
      monthlyPrice: PRICING_PLANS.starter.monthlyPrice,
      annualPrice: PRICING_PLANS.starter.annualPrice,
      seats: `${PRICING_PLANS.starter.minSeats} - ${PRICING_PLANS.starter.maxSeats} seats`,
      leads: '50,000 leads / month',
      description: 'Ideal for small sales teams starting with SIM telecalling. Free Trial transitions seamlessly into Starter.',
      highlight: false,
      features: [
        '1 Admin Capacity (Master Founder)',
        '1 to 10 Telecaller Seats (Min 1 seat)',
        '50,000 Inbound Lead Storage',
        'Direct SIM Mobile Dialing',
        'IndiaMART & Meta Webhooks',
        '5 Pipeline Board Stages',
        '2 Automation Rules',
        'Standard Email Support (48h response)',
      ],
    },
    {
      id: 'growth',
      name: PRICING_PLANS.growth.name,
      monthlyPrice: PRICING_PLANS.growth.monthlyPrice,
      annualPrice: PRICING_PLANS.growth.annualPrice,
      seats: `${PRICING_PLANS.growth.minSeats} - ${PRICING_PLANS.growth.maxSeats} seats`,
      leads: '250,000 leads / month',
      description: 'For growing sales teams needing Team Lead hierarchy, Lead Rotting Alerts & Auto Allocation.',
      highlight: true,
      badge: 'Most Popular',
      features: [
        '2 Admins Capacity (Founder + 1 Sub-Admin)',
        '11 to 25 Telecaller Seats',
        '250,000 Inbound Lead Limit',
        'Everything in Starter',
        'Team Lead (TL) Sub-Teams',
        'Round-Robin Lead Assignment',
        'Lead Rotting Alerts (24h+ untouched)',
        '15 Pipeline Stages & 200 AI Credits',
        'WhatsApp Business API Integration',
        'Priority Chat Support (8h response)',
      ],
    },
    {
      id: 'pro',
      name: PRICING_PLANS.pro.name,
      monthlyPrice: PRICING_PLANS.pro.monthlyPrice,
      annualPrice: PRICING_PLANS.pro.annualPrice,
      seats: `${PRICING_PLANS.pro.minSeats} - ${PRICING_PLANS.pro.maxSeats} seats`,
      leads: 'Unlimited leads',
      description: 'For call centers & high-volume teams requiring multi-team leads & full API access.',
      highlight: false,
      features: [
        '3 Admins Capacity (Founder + 2 Sub-Admins)',
        '26 to 50 Telecaller Seats (Max Cap)',
        'Unlimited Inbound Lead Storage',
        'Everything in Growth',
        'Multi-Level Team Lead Hierarchy',
        'Full Read/Write REST API Access',
        'Unlimited AI Call Summaries',
        'Advanced AI Lead Quality Scoring',
        '365 Days Activity Audit Logs',
        'Priority WhatsApp Support (2h response)',
      ],
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="CallMind Pricing — Plans for Indian Telecalling Teams"
        description="Transparent per-telecaller pricing for CallMind CRM. Start a 7-day free trial with 3 telecallers included. All plans include GST-compliant invoices."
        path="/pricing"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-16 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Home
          </button>
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Simple & Transparent Pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Choose the Plan for Your Sales Team
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Start with a 7-day free trial. Upgrade as your telecaller team grows. Download tax-compliant GST invoices anytime.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-sm font-semibold ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-8 bg-slate-200 rounded-full p-1 transition-colors relative focus:outline-none"
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
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                Save ~20%
              </span>
            </span>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={`glass-card p-8 rounded-3xl flex flex-col justify-between relative space-y-6 ${
                    plan.highlight ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-brand-600 text-white text-xs font-bold rounded-full shadow-md font-sans">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900 font-display">{plan.name}</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{plan.description}</p>
                    
                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900 font-grotesk">₹{price}</span>
                        <span className="text-sm text-slate-500 font-medium">/ seat / month</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-medium">{plan.seats} · {plan.leads}</div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/signup')}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider btn-tactile font-sans flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? 'bg-brand-600 text-white btn-glow'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Start Free Trial
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
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
