import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, WifiOff, Languages, PhoneCall, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

/**
 * The India-specific positioning story.
 *
 * These are real, shipped capabilities (see src/website/data/capabilities.ts for
 * the code references) that the site never mentioned — despite being the actual
 * reason CallMind fits Indian sales floors better than a generic CRM. Each entry
 * pairs the constraint Indian teams face with what the product does about it.
 */
const pillars = [
  {
    icon: WifiOff,
    constraint: 'Mobile data drops in the field',
    title: 'Keeps working offline',
    body: 'Calls and notes are saved on the phone when the network goes and sync themselves when it returns. Nobody loses a day of work to a bad signal.',
    source: 'mobile/src/services/sync.ts',
  },
  {
    icon: Languages,
    constraint: 'Not every good telecaller reads English',
    title: 'Works in their language',
    body: 'Telecallers pick the language they are comfortable in, so you can hire on selling ability instead of English fluency.',
    source: 'mobile/src/screens/10_LanguageSelectionScreen.tsx',
  },
  {
    icon: PhoneCall,
    constraint: 'Cloud telephony bills by the minute',
    title: 'Dials from their own SIM',
    body: 'Calls go through the phone’s native dialer on your existing mobile plan. No VoIP setup, no per-minute platform charges, and no call audio on our servers.',
    source: 'mobile/src/screens/38_CallingScreen.tsx',
  },
  {
    icon: MapPin,
    constraint: 'Your leads come from Indian marketplaces',
    title: 'IndiaMART, JustDial, TradeIndia built in',
    body: 'The lead sources Indian businesses actually buy from are wired in directly — not left to you to build with a generic webhook.',
    source: 'supabase/functions/indiamart-poll',
  },
  {
    icon: FileText,
    constraint: 'Your accountant needs proper tax invoices',
    title: 'GST invoices, automatically',
    body: 'Every payment produces a tax invoice with the CGST and SGST split, ready for input credit.',
    source: 'src/routes/payments.ts',
  },
  {
    icon: ShieldCheck,
    constraint: 'DPDP Act changed the rules on customer data',
    title: 'Export and erasure on demand',
    body: 'Take a full export of your workspace whenever you like, or delete it permanently. Both are built in, not a support request.',
    source: 'supabase/functions/purge-user-data',
  },
];

export const IndiaFirstSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-slate-900 text-white relative overflow-hidden font-sans">
      {/* Ambient glow */}
      <div className="absolute -top-40 -right-32 w-[500px] h-[500px] bg-brand-500/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        <SectionHeader
          theme="dark"
          badge={{ icon: MapPin, text: 'Built for India' }}
          title={
            <>
              Built around how Indian sales teams{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-emerald-300">
                actually work.
              </span>
            </>
          }
          subtitle="Not a global CRM with an India price. Every point below is a constraint Indian telecalling teams live with, and what CallMind does about it."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="bg-white/[0.06] border border-white/10 rounded-3xl p-7 space-y-4 backdrop-blur-sm hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-400/20 flex items-center justify-center text-brand-300">
                <p.icon size={22} />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {p.constraint}
              </p>

              <h3 className="text-lg font-bold text-white font-display leading-snug">{p.title}</h3>

              <p className="text-sm text-slate-300 font-medium leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/platform"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-900 rounded-xl font-bold text-sm btn-tactile shadow-lg hover:bg-slate-100 transition-colors"
          >
            See everything the platform does
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};
