import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { IntegrationsBar } from './components/IntegrationsBar';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { WebAppShowcase } from './components/WebAppShowcase';
import { MobileAppShowcase } from './components/MobileAppShowcase';
import { Features } from './components/Features';
import { RoiCalculator } from './components/RoiCalculator';
import { PricingPreview } from './components/PricingPreview';
import { SecurityHighlight } from './components/SecurityHighlight';
import { FounderSection } from './components/FounderSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from './components/SEOHead';
import { FREE_TRIAL_CONFIG } from '../config/pricing';

/**
 * Section order follows the buyer's questions in the order they get asked:
 * what is it → who does it plug into → why change → show me the product →
 * what does it do → what is it worth → what does it cost → is it safe →
 * who is behind it → what if I still have doubts → sign up.
 *
 * Backgrounds alternate white / slate-50 down the page. When reordering,
 * keep that alternation — two same-coloured sections in a row make the page
 * read as one undifferentiated block.
 */
export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="CallMind - Make Every Call Smarter | Telecalling CRM for Indian Sales Teams"
        description="Make Every Call Smarter. CallMind auto-captures leads from IndiaMART & Meta Ads in 2 seconds, logs SIM calls, and tracks sales pipelines for SMEs."
      />
      <Navbar />

      <main className="flex-grow">
        {/* 1. Hero — positioning, primary CTA, live product simulator (white) */}
        <Hero />

        {/* 2. Integrations the platform actually ships with (white) */}
        <IntegrationsBar />

        {/* 3. The problem, and what changes (white) */}
        <BeforeAfterComparison />

        {/* 4. The web admin dashboard, in real screenshots (white) */}
        <WebAppShowcase />

        {/* 5. The telecaller Android app, in real screenshots (slate-50) */}
        <MobileAppShowcase />

        {/* 6. Capability grid (slate-50) */}
        <Features />

        {/* 7. Interactive time-saved calculator (white) */}
        <RoiCalculator />

        {/* 8. Transparent pricing, read from the billing config (white) */}
        <PricingPreview />

        {/* 9. Privacy posture — the core differentiator (slate-50) */}
        <SecurityHighlight />

        {/* 10. The named founder behind the product (white) */}
        <FounderSection />

        {/* 11. Remaining objections (slate-50) */}
        <FAQSection />

        {/* 12. Final conversion CTA */}
        <section className="py-24 px-6 md:px-12 bg-white border-b border-slate-100 font-sans">
          <div className="max-w-7xl mx-auto bg-gradient-to-br from-brand-600 to-blue-700 rounded-3xl p-10 md:p-16 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight font-display">
                Ready to Make Every Call Smarter?
              </h2>
              <p className="text-white/80 text-base font-medium">
                Start your {FREE_TRIAL_CONFIG.trialDays}-day free trial with {FREE_TRIAL_CONFIG.includedTelecallers} telecallers
                included. No credit card required.
              </p>
              <div className="flex items-center gap-2 text-white/70 text-xs font-semibold">
                <ShieldCheck size={14} />
                <span>Zero call audio stored · GST invoices included</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all btn-tactile shadow-lg flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
