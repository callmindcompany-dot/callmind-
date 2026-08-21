import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, WifiOff, Languages, PhoneCall, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const pillars = [
  {
    icon: WifiOff,
    constraint: 'Mobile data drops in the field',
    title: 'Keeps working offline',
    body: 'Calls and notes are saved on the phone when the network drops and sync themselves when it returns. Nobody loses a day of work to bad signal.',
  },
  {
    icon: Languages,
    constraint: 'Not every good telecaller reads English',
    title: 'Works in their language',
    body: 'Telecallers pick the language they are comfortable in (Marathi, Hindi, English), so you can hire on selling ability instead of English fluency.',
  },
  {
    icon: PhoneCall,
    constraint: 'Cloud telephony bills by the minute',
    title: 'Dials from their own SIM',
    body: 'Calls go through the phone’s native dialer on your existing mobile plan. No VoIP setup, no per-minute platform charges, and no call audio on our servers.',
  },
  {
    icon: MapPin,
    constraint: 'Your leads come from multiple marketplaces & ads',
    title: 'Ad campaigns & portals built in',
    body: 'The lead sources Indian businesses actually rely on — from ad campaigns and online portals to spreadsheets — are wired in directly.',
  },
  {
    icon: FileText,
    constraint: 'Your accountant needs proper tax invoices',
    title: 'GST invoices, automatically',
    body: 'Every subscription payment produces a tax invoice with the CGST and SGST split, ready for input tax credit (ITC).',
  },
  {
    icon: ShieldCheck,
    constraint: 'DPDP Act changed the rules on customer data',
    title: 'Export and erasure on demand',
    body: 'Take a full export of your workspace whenever you like, or delete it permanently. Both are built in, not a support request.',
  },
];

export const IndiaFirstSection = () => {
  return (
    <section className="py-20 px-6 md:px-12 bg-slate-900 text-white font-sans border-b border-slate-800">
      <div className="max-w-7xl mx-auto space-y-14">
        <SectionHeader
          theme="dark"
          badge={{ icon: MapPin, text: 'Built for India' }}
          title={
            <>
              Built around how Indian sales teams{' '}
              <span className="text-brand-400">
                actually work.
              </span>
            </>
          }
          subtitle="Not a global CRM with an India price. Every point below is a constraint Indian telecalling teams live with, and what CallMind does about it."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-7 space-y-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-400/20 flex items-center justify-center text-brand-400">
                <p.icon size={20} />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {p.constraint}
              </p>

              <h3 className="text-lg font-bold text-white font-display leading-snug">{p.title}</h3>

              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            to="/platform"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm btn-tactile shadow-md transition-colors"
          >
            See everything the platform does
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

