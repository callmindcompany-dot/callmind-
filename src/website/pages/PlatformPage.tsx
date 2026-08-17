import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Layers, Users, Zap, MessageCircle,
  BarChart3, Sparkles, ShieldCheck, PhoneCall, MapPin,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { SectionHeader } from '../components/SectionHeader';
import {
  capabilitiesByGroup,
  indiaEdgeCapabilities,
  CAPABILITIES,
  type CapabilityGroup,
} from '../data/capabilities';

const GROUP_ICONS: Record<CapabilityGroup, typeof Layers> = {
  leads: Layers,
  calling: PhoneCall,
  automation: Zap,
  communication: MessageCircle,
  analytics: BarChart3,
  team: Users,
  ai: Sparkles,
  trust: ShieldCheck,
};

/**
 * The full-depth product page.
 *
 * Everything rendered here comes from src/website/data/capabilities.ts, where
 * each entry cites the code that implements it. The site previously described
 * roughly a quarter of what the product does; this page exists so the other
 * three quarters are visible without anyone hand-writing (and later
 * over-claiming) marketing copy.
 */
export const PlatformPage = () => {
  const groups = capabilitiesByGroup.filter((g) => g.items.length > 0);
  const [activeGroup, setActiveGroup] = useState<CapabilityGroup | 'all'>('all');

  const visibleGroups = activeGroup === 'all' ? groups : groups.filter((g) => g.group === activeGroup);

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Platform — Everything CallMind Does | Telecalling CRM"
        description="The full CallMind platform: multi-source lead capture, SIM dialing, automation rules, WhatsApp and email, reports, team operations, AI assistance and DPDP-aligned data controls."
        path="/platform"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-16 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all"
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              <Layers size={14} className="text-brand-600" />
              The Complete Platform
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            One platform for your entire{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
              telecalling operation.
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            {CAPABILITIES.length} capabilities across lead capture, calling, automation, communication,
            reporting, team operations, AI and compliance — working together in one system.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/signup"
              className="px-7 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="px-7 py-3.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all btn-tactile"
            >
              See Pricing
            </Link>
          </div>
        </section>

        {/* India-first differentiators */}
        <section className="py-20 px-6 md:px-12 bg-slate-900 text-white relative border-b border-slate-800">
          <div className="max-w-6xl mx-auto relative z-10 space-y-14">
            <SectionHeader
              theme="dark"
              badge={{ icon: MapPin, text: 'Built for India' }}
              title="Designed around how Indian sales teams actually work"
              subtitle="Patchy mobile data, telecallers who prefer their own language, Indian lead marketplaces, and Indian tax and privacy rules — these shaped the product, not the marketing."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {indiaEdgeCapabilities.map((cap) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2 backdrop-blur-sm"
                >
                  <h3 className="text-base font-bold text-white font-display">{cap.title}</h3>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{cap.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Full capability catalogue */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-12">
            <SectionHeader
              badge={{ icon: Layers, text: 'Everything Included' }}
              title="The full platform, by area"
              subtitle="Filter by the part of your operation you're trying to fix."
            />

            {/* Group filter */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setActiveGroup('all')}
                aria-pressed={activeGroup === 'all'}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  activeGroup === 'all'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-200'
                }`}
              >
                All
              </button>
              {groups.map((g) => (
                <button
                  key={g.group}
                  onClick={() => setActiveGroup(g.group)}
                  aria-pressed={activeGroup === g.group}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    activeGroup === g.group
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Groups */}
            <div className="space-y-14">
              {visibleGroups.map((g) => {
                const Icon = GROUP_ICONS[g.group];
                return (
                  <div key={g.group} className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100">
                        <Icon size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">
                          {g.label}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{g.blurb}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g.items.map((cap) => (
                        <div
                          key={cap.title}
                          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 hover:border-brand-200 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                            <h3 className="text-sm font-bold text-slate-900 font-display leading-snug">
                              {cap.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed pl-[27px]">
                            {cap.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-10 md:p-16 text-center text-white shadow-xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight font-display">
              See it running on your own leads.
            </h2>
            <p className="text-white/80 text-base font-medium max-w-xl mx-auto">
              Start a free trial and connect one lead source. You'll know within a day whether it fits
              how your team works.
            </p>
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-brand-700 rounded-xl font-bold text-sm btn-tactile shadow-lg inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
