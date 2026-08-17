import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  PhoneCall, 
  Layers, 
  FileText, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ArrowLeft, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  MapPin, 
  Cpu, 
  Lock, 
  Check, 
  X,
  Server,
  Activity
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WebAppShowcase } from '../components/WebAppShowcase';
import { MobileAppShowcase } from '../components/MobileAppShowcase';
import { TechnicalFeatures } from '../components/TechnicalFeatures';
import { useNavigate } from 'react-router-dom';
import { FREE_TRIAL_CONFIG } from '../../config/pricing';
import { SEOHead } from '../components/SEOHead';

const PRODUCT_MODULES = [
  {
    id: 'ingestion',
    title: 'Lead Ingestion Engine',
    icon: Zap,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    description: 'Auto-captures buy leads from IndiaMART, TradeIndia, Justdial, and Facebook Ads within 2 seconds.',
    features: [
      'Multi-source API polling & webhook triggers',
      'Automatic phone number sanitization & deduplication',
      'Custom JSON metadata extraction (Budget, Location, Requirement)',
      // Was "Instant SMS / WhatsApp notification to assigned agent". There is
      // no SMS sending anywhere in the product, and WhatsApp does not
      // dispatch. In-app and push notification is real -- notification.service.
      'Instant in-app notification to the assigned agent'
    ]
  },
  {
    id: 'routing',
    title: 'Round-Robin Routing',
    icon: Layers,
    color: 'text-brand-600 bg-brand-50 border-brand-200',
    description: 'Sequential & performance-based lead distribution algorithm to eliminate response delays.',
    features: [
      'Active-Agent Check: Only routes to checked-in telecallers',
      'Equal weight & ratio-based distribution rules',
      'Unassigned fallback queue with auto-reclaim after 15 minutes',
      'Lead transfer & bulk manager reassignment'
    ]
  },
  {
    id: 'sim-sync',
    title: 'SIM Dialing & Sync Engine',
    icon: PhoneCall,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Telecallers dial directly via mobile SIM. Duration, timestamps & disposition sync automatically.',
    features: [
      'Native Android phone call log listener (Android 8.0+)',
      '100% SIM privacy — Zero audio call recordings stored',
      'Offline log buffering: Syncs automatically when internet resumes',
      'Call outcome tagging (Interested, Follow-up, Busy, Invalid)'
    ]
  },
  {
    id: 'attendance',
    title: 'Attendance & Live Agent Status',
    icon: MapPin,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    description: 'Punch-in and punch-out logs, live agent status, and daily work-hour breakdowns.',
    features: [
      'One-click Punch In / Punch Out with timestamps',
      'Live agent status grid (Active, On-Call, Offline)',
      'Daily work-hours and call volume breakdown',
      'No selfie and no location permission required'
    ]
  },
  {
    id: 'ai-gemini',
    title: 'Gemini AI Intelligence',
    icon: Sparkles,
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    description: 'Google Gemini AI summarizes call notes, categorizes customer sentiment, and generates follow-ups.',
    features: [
      'Automated 2-bullet call transcript summaries',
      'Customer Sentiment Scoring (Hot, Warm, Cold lead intent)',
      'Auto-suggested follow-up tasks & calendar alerts',
      'Privacy-first PII scrubbing before AI processing'
    ]
  },
  {
    id: 'security',
    title: 'Multi-Tenant Security',
    icon: ShieldCheck,
    color: 'text-slate-900 bg-slate-100 border-slate-300',
    description: 'PostgreSQL Row-Level Security (RLS) ensures complete data isolation between organization accounts.',
    features: [
      'Kernel-level RLS policies on company_id key',
      'India DPDP Act & GDPR compliant right-to-be-forgotten deletion',
      'AES-256 encrypted database backups',
      'CSV formula injection protection on all data exports'
    ]
  }
];

export const ProductPage = () => {
  const navigate = useNavigate();
  const [activeModuleId, setActiveModuleId] = useState<string>(PRODUCT_MODULES[0].id);

  const activeModule = PRODUCT_MODULES.find(m => m.id === activeModuleId) || PRODUCT_MODULES[0];

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="CallMind Product Suite - Features & Architecture Deep Dive"
        description="Explore CallMind's complete product capabilities: Web Admin Dashboard, Mobile Telecaller App, SIM call logging, B2B lead ingestion, and Gemini AI intelligence."
        path="/product"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Product Hero Header */}
        <section className="pt-20 pb-16 px-6 md:px-12 bg-white border-b border-slate-200 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto space-y-5">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
                <Cpu size={14} /> Product Suite & Interactive Walkthrough
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight font-display">
              Complete Web Admin & Mobile Telecaller <span className="text-brand-600">Product Suite</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Explore authentic Web Admin Dashboard previews, Telecaller Mobile App UI screens, and deep-dive technical engineering capabilities.
            </p>
          </div>
        </section>

        {/* 1. Web Admin Dashboard Interactive Showcase */}
        <section className="py-4">
          <WebAppShowcase />
        </section>

        {/* 2. Telecaller Mobile App Interactive Showcase */}
        <section className="py-4">
          <MobileAppShowcase />
        </section>

        {/* 3. Interactive Product Modules Explorer */}
        <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display">Core Capability Specs</h2>
            <p className="text-slate-500 text-sm">Select a capability module to view technical specifications.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Module Selector Buttons */}
            <div className="lg:col-span-4 space-y-3">
              {PRODUCT_MODULES.map(module => {
                const Icon = module.icon;
                const isActive = module.id === activeModuleId;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModuleId(module.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 cursor-pointer ${
                      isActive
                        ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-500/20'
                        : 'glass-card border-slate-200/80 hover:bg-white/90'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border shrink-0 ${module.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-950">{module.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{module.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Module Detailed View */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card p-8 rounded-3xl border border-slate-200/80 shadow-lg bg-white/95 space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                    <div className={`p-3 rounded-2xl border ${activeModule.color}`}>
                      <activeModule.icon size={26} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module Specification</span>
                      <h3 className="text-2xl font-black text-slate-950 font-display">{activeModule.title}</h3>
                    </div>
                  </div>

                  <p className="text-slate-600 text-base leading-relaxed">
                    {activeModule.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">Key Capabilities:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeModule.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800">
                          <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 4. Deep Technical Features */}
        <TechnicalFeatures />

        {/* 5. Side-by-Side Product Comparison Matrix */}
        <section className="py-16 px-6 md:px-12 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                Why CallMind Leads
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
                CallMind vs Traditional Alternatives
              </h2>
              <p className="text-slate-500 text-sm max-w-xl mx-auto">
                Compare CallMind’s native SIM CRM against manual Excel tracking and expensive cloud call centers.
              </p>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 text-xs uppercase font-bold">
                    <th className="py-4 px-4 w-2/5">Feature / Capability</th>
                    <th className="py-4 px-4 bg-brand-50/60 text-brand-700 font-black rounded-t-xl text-center">CallMind CRM</th>
                    <th className="py-4 px-4 text-center">Manual Excel Sheets</th>
                    <th className="py-4 px-4 text-center">Cloud Call Centers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-900">Lead Ingestion Speed</td>
                    <td className="py-4 px-4 bg-brand-50/30 text-center font-bold text-brand-700">⚡ Instant (2 Seconds)</td>
                    <td className="py-4 px-4 text-center text-slate-400">Manual Copy-Paste</td>
                    <td className="py-4 px-4 text-center text-slate-500">1-5 Minutes</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-900">Calling Cost</td>
                    <td className="py-4 px-4 bg-brand-50/30 text-center font-bold text-emerald-600">₹0 Extra (Uses Unlimited SIM)</td>
                    <td className="py-4 px-4 text-center text-slate-500">Uses SIM</td>
                    <td className="py-4 px-4 text-center text-rose-500 font-semibold">Expensive Per-Minute API Charges</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-900">Auto Round-Robin Routing</td>
                    <td className="py-4 px-4 bg-brand-50/30 text-center text-emerald-600"><Check className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-rose-400"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-emerald-600"><Check className="w-5 h-5 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-900">100% Audio Privacy (Zero Storage)</td>
                    <td className="py-4 px-4 bg-brand-50/30 text-center text-emerald-600"><Check className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-emerald-600"><Check className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-rose-500">Records & Stores Audio</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-900">Gemini AI Call Intelligence</td>
                    <td className="py-4 px-4 bg-brand-50/30 text-center font-bold text-brand-600">Built-in Included</td>
                    <td className="py-4 px-4 text-center text-rose-400"><X className="w-5 h-5 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-slate-500">Extra Paid Add-on</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 px-6 md:px-12 font-sans">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-10 text-white text-center space-y-6 shadow-xl">
            <h2 className="text-3xl font-black font-display">Experience CallMind Product Suite</h2>
            <p className="text-white/80 max-w-xl mx-auto text-sm font-medium">
              Start your {FREE_TRIAL_CONFIG.trialDays}-Day Free Trial. No credit card required. Instant setup for up to {FREE_TRIAL_CONFIG.includedTelecallers} telecallers.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-white text-brand-700 hover:bg-slate-50 rounded-xl font-bold text-base shadow-lg btn-tactile inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Start Free Trial</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
