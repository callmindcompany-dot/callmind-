import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Database, TrendingUp, FileText, ShieldCheck, ChevronRight, ChevronLeft, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SITE_DOMAIN } from '../siteConfig';

const webScreens = [
  {
    id: 'dashboard',
    title: 'Web Admin Main Dashboard',
    badge: 'Main Dashboard',
    desc: 'Executive KPI command center monitoring real-time call volume, connected calls, conversion rate, and active lead pipelines.',
    bullets: [
      'Central command hub for business owners and sales managers',
      'Real-time telecaller performance metrics & lead ingress status',
    ],
    imageSrc: '/ui-images/web-ui-1.png',
  },
  {
    id: 'ingestion',
    title: 'IndiaMART & Meta Webhook Engine',
    badge: 'Webhook Engine',
    desc: 'Auto-capture prospective buyers from IndiaMART GLUSR API and Meta Lead Ads in sub-2 seconds directly to telecaller queues.',
    bullets: [
      'Sub-2s lead auto-ingestion with smart duplicate detection',
      'Automatic round-robin assignment to active mobile telecallers',
    ],
    imageSrc: '/ui-images/web-ui-2.png',
  },
  {
    id: 'analytics',
    title: 'Call Performance Analytics',
    badge: 'Analytics Dashboard',
    desc: 'Real-time charts tracking daily call volume, connected calls, average talk time, and team conversion rates.',
    bullets: [
      'Real-time team call volume & talk-time metrics',
      'Conversion rate tracking per telecaller',
    ],
    imageSrc: '/ui-images/web-ui-3.png',
  },
  {
    id: 'invoicing',
    title: 'B2B 18% GST Tax Invoice Generator',
    badge: 'GST Invoicing',
    desc: 'Generate PDF tax invoices with complete CGST (9%) + SGST (9%) breakdowns for every subscription payment.',
    bullets: [
      'Automated 18% GST tax invoices for business accounting credit',
      'Downloadable PDF linked with Razorpay subscription payment ID',
    ],
    imageSrc: '/ui-images/web-ui-4.png',
  },
];

export const WebAppShowcase = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % webScreens.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentScreen = webScreens[activeIndex];

  return (
    <section className="py-24 px-6 md:px-12 bg-white relative overflow-hidden font-sans border-b border-slate-100">
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <LayoutGrid size={14} className="text-brand-600" />
            <span>CallMind Web Admin Dashboard</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            Built For Business Owners & Sales Admins
          </h2>
          <p className="text-base text-slate-500 font-medium">
            Monitor telecalling performance, auto-capture IndiaMART leads, manage sales pipelines, and download 18% GST invoices in one central control hub.
          </p>
        </div>

        {/* Interactive Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Screen Tabs */}
          <div className="lg:col-span-5 space-y-3">
            {webScreens.map((screen, idx) => {
              const isActive = activeIndex === idx;
              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left p-5 rounded-2xl transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-brand-50 text-slate-900 border-brand-500 shadow-md scale-[1.01]'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-brand-700' : 'text-slate-400'}`}>
                      {screen.badge}
                    </span>
                    {isActive && <ChevronRight size={16} className="text-brand-600" />}
                  </div>
                  <h3 className={`text-base font-bold font-display mt-1 ${isActive ? 'text-brand-900' : 'text-slate-900'}`}>
                    {screen.title}
                  </h3>
                  <div className="pt-2 space-y-1">
                    {screen.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-1.5 text-xs text-slate-600 font-medium">
                        <CheckCircle2 size={13} className="text-brand-600 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Custom Generated UI Image Display */}
          <div className="lg:col-span-7">
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4 relative overflow-hidden">
              {/* Browser Window Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="px-4 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono border border-slate-200 font-semibold">
                  {SITE_DOMAIN} / {currentScreen.id}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <button
                    onClick={() => setActiveIndex((prev) => (prev - 1 + webScreens.length) % webScreens.length)}
                    className="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActiveIndex((prev) => (prev + 1) % webScreens.length)}
                    className="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Custom Generated UI Screenshot Image Container */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner max-h-[380px] bg-slate-50 flex items-center justify-center"
                >
                  <img
                    src={currentScreen.imageSrc}
                    alt={currentScreen.title}
                    className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-500"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Bottom Carousel Indicators */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-medium border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {webScreens.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeIndex === i ? 'w-8 bg-brand-600' : 'w-2 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => navigate('/signup')}
                  className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Explore Web Admin Dashboard
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
