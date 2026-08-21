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
        title="CallMind CRM — SIM Telecalling & Multi-Source Lead Management CRM"
        description="India's premier SIM telecalling & sales CRM. Auto-capture leads from ads, webhooks, portals & spreadsheets in 2 seconds. 1-click SIM dialing, WhatsApp follow-ups & zero cloud audio storage."
        path="/"
        keywords={[
          'SIM telecalling CRM',
          'telecalling software India',
          'multi-source lead management',
          'sales CRM software India',
          'outbound sales CRM',
          'mobile telecaller app',
          'WhatsApp CRM automation',
          'lead management system India',
          'call center software Pune Nashik India',
        ]}
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        jsonLd={[
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://callmind.app/#software',
            name: 'CallMind CRM',
            operatingSystem: 'Android, Web, iOS',
            applicationCategory: 'BusinessApplication',
            url: 'https://callmind.app',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'INR',
              lowPrice: '599',
              highPrice: '1499',
              offerCount: '3',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '128',
              bestRating: '5',
              worstRating: '1',
            },
            featureList: [
              '1-Click SIM Telecalling',
              'Multi-Source Webhook & Spreadsheet Ingestion',
              'Automated Lead Assignment & Round Robin',
              'Offline Call Logging & Auto-Sync',
              '1-Click WhatsApp Follow-ups',
              'Zero Cloud Audio Storage (100% Privacy)',
              'GST-Compliant B2B Tax Invoices',
            ],
          },
        ]}
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
        <section className="py-16 px-6 md:px-12 bg-white border-t border-slate-200/80 font-sans">
          <div className="max-w-6xl mx-auto bg-slate-900 rounded-2xl p-8 sm:p-12 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3.5 max-w-2xl text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-emerald-400 border border-slate-700">
                <Zap size={14} />
                Instant Setup in 5 Minutes
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-display">
                Ready to Make Every Call Smarter?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
                Start your {FREE_TRIAL_CONFIG.trialDays}-day free trial with {FREE_TRIAL_CONFIG.includedTelecallers} telecallers included. No credit card required.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-slate-400 text-xs font-semibold pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-400" /> Zero call audio stored</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400" /> 18% GST tax invoices</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm btn-tactile shadow-md shadow-brand-500/20 flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
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
