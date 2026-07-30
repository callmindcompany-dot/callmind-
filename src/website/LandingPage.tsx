import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { IntegrationsBar } from './components/IntegrationsBar';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { IndiaFirstSection } from './components/IndiaFirstSection';
import { RoiCalculator } from './components/RoiCalculator';
import { Footer } from './components/Footer';
import { ArrowRight, ShieldCheck, Zap, Phone, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from './components/SEOHead';
import { FREE_TRIAL_CONFIG } from '../config/pricing';

/**
 * Clean, High-Converting Home Page
 * Focused on core value proposition, instant lead capture, and clear CTAs.
 * Detailed product specs are cleanly linked to dedicated sub-pages (/product, /pricing, /security).
 */
export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="CallMind - Make Every Call Smarter | Telecalling CRM for Indian Sales Teams"
        description="CallMind auto-captures leads from IndiaMART & Meta Ads in 2 seconds, logs SIM calls, and tracks sales pipelines for SMEs."
        path="/"
      />
      <Navbar />

      <main className="flex-grow">
        {/* 1. Hero Section — Positioning & Primary Call to Action */}
        <Hero />

        {/* 2. B2B Lead Integrations Bar */}
        <IntegrationsBar />

        {/* 3. Before vs After — Problem & Solution Visual Comparison */}
        <BeforeAfterComparison />

        {/* 4. Why this fits Indian teams — the positioning story, and the
               gateway to the full platform page (dark, to break the rhythm) */}
        <IndiaFirstSection />

        {/* 5. Interactive ROI & Time-Saved Calculator */}
        <RoiCalculator />

        {/* 6. Final Conversion Call to Action Banner */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-200 font-sans">
          <div className="max-w-6xl mx-auto bg-gradient-to-br from-brand-600 via-brand-700 to-blue-800 rounded-3xl p-8 md:p-14 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                <Zap size={14} className="text-amber-300" />
                Instant Setup in 5 Minutes
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight font-display">
                Ready to Make Every Call Smarter?
              </h2>
              <p className="text-white/80 text-sm sm:text-base font-medium">
                Start your {FREE_TRIAL_CONFIG.trialDays}-day free trial with {FREE_TRIAL_CONFIG.includedTelecallers} telecallers included. No credit card required.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-white/70 text-xs font-semibold pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-400" /> Zero call audio stored</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400" /> GST invoices included</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-brand-700 hover:bg-slate-50 rounded-xl font-bold text-sm btn-tactile shadow-lg flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              Start Free Trial Now
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
