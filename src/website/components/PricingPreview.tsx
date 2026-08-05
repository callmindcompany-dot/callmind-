import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRICING_PLANS, FREE_TRIAL_CONFIG } from '../../config/pricing';

/**
 * Plan copy for the landing page.
 *
 * Prices and seat limits are read from PRICING_PLANS so this section can never
 * drift from what the billing flow actually charges. This component previously
 * hardcoded ₹599/₹1199/₹1799 and advertised an "Enterprise" plan with SSO and a
 * 99.9% uptime guarantee — none of which exist in the pricing config.
 */
const PLAN_COPY = [
  {
    key: 'starter',
    desc: 'For small sales teams starting with SIM telecalling',
    popular: false,
    features: [
      'Android app with 1-click SIM dialing',
      'Excel & CSV lead import',
      'Call duration & timestamp logs',
      'Performance dashboards',
      'Email support',
    ],
  },
  {
    key: 'growth',
    desc: 'For scaling SMEs that need automated lead capture and AI scripts',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'IndiaMART GLUSR webhook integration',
      'Meta Lead Ads auto-capture',
      'AI talk scripts & lead scoring',
      'Kanban lead pipeline board',
      'Automated 18% GST tax invoices',
      'Chat support',
    ],
  },
  {
    key: 'pro',
    desc: 'For large sales teams needing unlimited leads and full API access',
    popular: false,
    features: [
      'Everything in Growth, plus:',
      'Unlimited leads & pipeline stages',
      'Full read/write REST API access',
      'Advanced AI lead scoring',
      'Priority WhatsApp support',
    ],
  },
] as const;

export const PricingPreview = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = PLAN_COPY.map((copy) => {
    const plan = PRICING_PLANS[copy.key];
    return {
      name: plan.name,
      desc: copy.desc,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      seats: `1–${plan.maxSeats} telecallers`,
      popular: copy.popular,
      features: copy.features,
    };
  });

  const maxAnnualSaving = Math.max(
    ...plans.map((p) => Math.round(((p.monthlyPrice - p.annualPrice) / p.monthlyPrice) * 100))
  );

  return (
    <section className="py-24 px-6 md:px-12 bg-white relative overflow-hidden font-sans border-t border-slate-100">
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Header & Toggle */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <Zap size={14} className="text-brand-600" />
            <span>Simple, Transparent Pricing</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            Invest in Higher Telecalling ROI
          </h2>
          <p className="text-base text-slate-500 font-medium">
            Start with a {FREE_TRIAL_CONFIG.trialDays}-day free trial including {FREE_TRIAL_CONFIG.includedTelecallers} telecallers.
            Upgrade anytime. All plans include B2B GST tax invoices.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                !isAnnual ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAnnual ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Annual Billing
              {/* Derived, not hardcoded — the discount differs per plan
                  (20% / 25% / 18%), so a single fixed figure would be wrong. */}
              <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase">
                Save up to {maxAnnualSaving}%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p, i) => {
            const price = isAnnual ? p.annualPrice : p.monthlyPrice;
            return (
              <div
                key={i}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                  p.popular
                    ? 'bg-slate-950 text-white shadow-2xl border-2 border-brand-500 scale-[1.02]'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 hover:border-brand-200'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-500 text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                    <Sparkles size={12} />
                    Most Popular for SMEs
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className={`text-xl font-bold font-display ${p.popular ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </h3>
                    <p className={`text-xs mt-1 font-medium ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.desc}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-grotesk">₹{price}</span>
                      <span className={`text-xs font-semibold ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                        / telecaller / month
                      </span>
                    </div>
                    <p className={`text-[11px] font-semibold ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.seats}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 pt-4 border-t border-slate-200/40">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs font-medium">
                        <div className={`mt-0.5 rounded-full p-0.5 ${p.popular ? 'bg-brand-500/20 text-brand-400' : 'bg-brand-50 text-brand-600'}`}>
                          <Check size={12} />
                        </div>
                        <span className={p.popular ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-8">
                  <button
                    onClick={() => navigate('/signup')}
                    className={`w-full py-4 rounded-xl font-bold text-xs transition-all btn-tactile flex items-center justify-center gap-2 ${
                      p.popular
                        ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    Start 7-Day Free Trial
                    <ArrowRight size={14} />
                  </button>
                  <p className={`text-[11px] text-center mt-2.5 font-medium ${p.popular ? 'text-slate-400' : 'text-slate-400'}`}>
                    No credit card required · Instant setup
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* GST Note */}
        <div className="text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-brand-600" />
          <span>Prices exclude 18% GST (CGST + SGST). Full tax credit invoice issued automatically.</span>
        </div>

      </div>
    </section>
  );
};
