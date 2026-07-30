import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, PhoneCall, Database, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FREE_TRIAL_CONFIG } from '../../config/pricing';

const simulatorSteps = [
  {
    label: 'Lead Captured',
    color: 'bg-blue-50 text-blue-700',
    content: (
      <div className="p-5 bg-slate-900 rounded-2xl space-y-2.5 font-mono text-xs">
        <div className="text-emerald-400 font-bold">[WEBHOOK] IndiaMART Lead Received</div>
        <div className="text-slate-300">Name: "Rajesh Kumar" · Phone: +91 98XXX XXXXX</div>
        <div className="text-slate-500 text-[11px]">Auto-assigned → Telecaller Mobile App</div>
      </div>
    ),
  },
  {
    label: 'SIM Call Active',
    color: 'bg-emerald-50 text-emerald-700',
    content: (
      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
        <div className="flex justify-between items-center text-sm font-bold text-slate-800 font-sans">
          <span>Rajesh Kumar</span>
          <span className="text-emerald-600 font-grotesk animate-pulse">01:42</span>
        </div>
        <div className="w-full bg-emerald-500 text-white py-2.5 rounded-xl text-center text-sm font-bold">
          Connected via SIM 1
        </div>
      </div>
    ),
  },
  {
    label: 'Call Logged in CRM',
    color: 'bg-violet-50 text-violet-700',
    content: (
      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-sm">
        <div className="flex justify-between text-sm font-bold text-slate-900 font-sans">
          <span>Stage → Hot Lead</span>
          <span className="text-brand-600 font-grotesk">Logged</span>
        </div>
        <p className="text-sm text-slate-500 italic">"Client wants product catalog and GST invoice quote."</p>
      </div>
    ),
  },
];

export const Hero = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 3), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="pt-20 pb-24 px-6 md:px-12 bg-white relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-brand-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] w-[400px] h-[400px] bg-brand-500/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
        
        {/* Left: Headline */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-brand-200 bg-brand-50">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              <span className="text-xs font-semibold text-brand-700 font-sans">
                A Voolabs Product · Built for Indian SMEs & Sales Agencies
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display"
          >
            Make Every Call Smarter.<br className="hidden md:block" />
            Turn SIM Calls Into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
              Higher Revenue.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-500 max-w-xl font-medium leading-relaxed font-sans"
          >
            Auto-capture leads from IndiaMART & Meta Ads in 2 seconds. Dial with 1 tap from your mobile SIM, follow AI talk scripts, and log CRM notes automatically — zero audio recordings stored.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 pt-1"
          >
            <button 
              onClick={() => navigate('/signup')}
              className="group px-7 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile font-sans flex items-center gap-2 overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start {FREE_TRIAL_CONFIG.trialDays}-Day Trial ({FREE_TRIAL_CONFIG.includedTelecallers} Telecallers Included)
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 w-0 bg-white/10 group-hover:w-full transition-all duration-300 ease-out z-0" />
            </button>
            <button 
              onClick={() => navigate('/product')}
              className="px-7 py-3.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all font-sans btn-tactile"
            >
              Explore Product
            </button>
          </motion.div>

          {/* Trust Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-6"
          >
            {[
              { value: '100%', label: 'SIM Privacy', sub: 'Zero Audio Stored' },
              { value: '<3s', label: 'QR Pairing', sub: 'Instant Mobile Join' },
              { value: 'Multi', label: 'Lead Sources', sub: 'IndiaMART · Meta · CSV' },
            ].map((m, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-slate-900 font-grotesk">{m.value}</div>
                <div className="text-xs font-semibold text-slate-700 font-sans mt-0.5">{m.label}</div>
                <div className="text-[11px] text-slate-400 font-sans">{m.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Animated Simulator */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-5"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-medium text-slate-400 font-sans">Live Preview</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold font-sans ${simulatorSteps[step].color}`}>
                  Step {step + 1}: {simulatorSteps[step].label}
                </span>
                {simulatorSteps[step].content}
              </motion.div>
            </AnimatePresence>

            {/* Step Dots */}
            <div className="flex justify-center gap-2 pt-1">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all ${step === i ? 'w-8 bg-brand-600' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
