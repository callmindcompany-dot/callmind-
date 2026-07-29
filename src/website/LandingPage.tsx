import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { IntegrationsBar } from './components/IntegrationsBar';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { Features } from './components/Features';
import { RoiCalculator } from './components/RoiCalculator';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from './components/SEOHead';

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
        {/* 1. Hero Section with Elevated Tagline & Live Simulator */}
        <Hero />

        {/* 2. Trusted Lead Ingress & Payment Integrations Logo Bar */}
        <IntegrationsBar />

        {/* 3. Before vs. With CallMind Transformation Matrix */}
        <BeforeAfterComparison />

        {/* 4. Platform Core Capabilities Grid */}
        <Features />

        {/* 5. Interactive ROI & Revenue Lift Calculator */}
        <RoiCalculator />

        {/* 6. Frequently Asked Questions Accordion */}
        <FAQSection />

        {/* 7. Final Conversion CTA Banner */}
        <section className="py-24 px-6 md:px-12 bg-white border-b border-slate-100 font-sans">
          <div className="max-w-7xl mx-auto bg-gradient-to-br from-brand-600 to-blue-700 rounded-3xl p-10 md:p-16 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight font-display">
                Ready to Make Every Call Smarter?
              </h2>
              <p className="text-white/80 text-base font-medium">
                Join Indian SMEs and BPO agencies using CallMind. Start your 7-Day Free Trial with up to 2 telecallers — zero credit card required.
              </p>
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
