import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Database, HeartHandshake, Award, FileText, CheckCircle2 } from 'lucide-react';

export const CompanyAboutSection = () => {
  const engineeringPillars = [
    {
      icon: Cpu,
      title: 'High-Speed Webhook Architecture',
      desc: 'Sub-2-second lead auto-ingestion from multi-source webhooks, ad campaigns, and Excel spreadsheets directly to mobile telecallers.',
    },
    {
      icon: ShieldCheck,
      title: 'Privacy-First SIM Dialing',
      desc: 'Calls run over native carrier channels. We log durations and timestamps without ever storing audio recordings or personal phone contacts.',
    },
    {
      icon: Database,
      title: 'Multi-Tenant Data Isolation',
      desc: 'Every workspace is scoped to its own company records, enforced in the database with PostgreSQL Row Level Security policies.',
    },
    {
      icon: FileText,
      title: '100% Tax Compliant GST Billing',
      desc: 'Automated 18% GST (CGST + SGST) tax invoice generation for all subscription payments, enabling seamless accounting credit.',
    },
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-slate-50 text-slate-900 relative overflow-hidden font-sans border-b border-slate-100">
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <HeartHandshake size={14} className="text-brand-600" />
            <span>Built by Voolabs for Indian Sales Teams</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 font-display leading-[1.12]">
            Engineering Excellence Dedicated To{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
              Indian SME Growth
            </span>
          </h2>

          <p className="text-slate-500 text-base font-medium leading-relaxed">
            CallMind was built from the ground up to replace outdated spreadsheets, manual dialing, and disconnected CRM systems with a unified, privacy-compliant telecalling platform.
          </p>
        </div>

        {/* 2x2 Engineering Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {engineeringPillars.map((pillar, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 shadow-sm hover:border-brand-200 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                <pillar.icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">{pillar.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{pillar.desc}</p>
            </div>
          ))}
        </div>

        {/* Platform Facts Banner
            Only verifiable product facts belong here. Usage numbers (workspaces,
            calls logged) and uptime figures must not be shown until they can be
            measured and stood behind. */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-sm">
          <div className="space-y-1">
            <p className="text-3xl font-black text-emerald-600 font-grotesk">0 GB</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Call Audio Stored</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 font-grotesk">SIM</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Native Dialing, No VoIP</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-brand-600 font-grotesk">3</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Lead Sources Built In</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-amber-600 font-grotesk">18% GST</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Invoices Generated</p>
          </div>
        </div>

      </div>
    </section>
  );
};
