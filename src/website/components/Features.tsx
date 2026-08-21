import React from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, Database, Clock, Layers, FileText, Users } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const features = [
  {
    icon: Database,
    title: 'Multi-Source Lead Capture',
    description: 'Auto-import leads from webhooks, Meta Lead Ads, Google Sheets, Excel/CSV files, and custom API endpoints.',
    tag: 'Webhooks',
  },
  {
    icon: PhoneCall,
    title: '1-Click SIM Dialing',
    description: 'Telecallers tap to dial from their own mobile SIM. No VoIP, no call recordings stored — 100% privacy compliant.',
    tag: 'Telecalling',
  },
  {
    icon: Clock,
    title: 'Lead Rotting Alerts',
    description: 'Automatically flag leads untouched for 24+ hours. Prevent lost sales with real-time overdue notifications.',
    tag: 'Automation',
  },
  {
    icon: Layers,
    title: 'Kanban Pipeline Board',
    description: 'Drag-and-drop lead stages from New → Hot → Negotiation → Closed. Visual clarity for your entire sales funnel.',
    tag: 'Pipeline',
  },
  {
    icon: FileText,
    title: 'GST Invoice Generator',
    description: 'Download tax-compliant PDF invoices with 18% GST breakdown (CGST + SGST) for every subscription payment.',
    tag: 'Billing',
  },
  {
    icon: Users,
    title: 'Team Quota Management',
    description: 'Set daily call targets per telecaller. Track performance with real-time dashboards and role-based access controls.',
    tag: 'Management',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const Features = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-slate-50 border-y border-slate-100 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <SectionHeader
          className="mb-16"
          badge={{ text: 'Core Platform Features' }}
          title="Everything Your Sales Team Needs"
          subtitle="From lead capture to GST invoicing — CallMind replaces spreadsheets, manual typing, and disconnected tools with one unified telecalling CRM."
        />

        {/* 3x2 Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="glass-card p-7 rounded-2xl space-y-4 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <f.icon size={20} className="text-brand-600" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                  {f.tag}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
