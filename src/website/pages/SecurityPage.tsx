import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Database, FileText, ArrowRight, CheckCircle2, ArrowLeft, Download, Trash2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';

const securityPillars = [
  {
    icon: ShieldCheck,
    title: 'Zero-Audio Privacy Architecture',
    description: 'CallMind operates over standard mobile SIM networks. Calls are handled directly by your phone carrier — we do NOT route, record, or store any call audio on our servers.',
    tag: 'Audio Privacy',
  },
  {
    icon: Lock,
    title: 'Supabase Row-Level Security (RLS)',
    description: 'Queries are gated by PostgreSQL Row-Level Security policies that match rows against your company, so the isolation is enforced by the database and not by application code.',
    tag: 'Data Isolation',
  },
  {
    icon: Database,
    title: 'Encrypted In-Transit & At-Rest',
    description: 'All web traffic and API payloads are encrypted using TLS 1.3 in transit and AES-256 at rest. Webhook secrets are hashed and protected.',
    tag: 'Encryption',
  },
  {
    icon: FileText,
    title: 'Audit Logs & Activity Trails',
    // Named three things, two of which are not logged. AuditService.logEvent is
    // called for bulk lead distribution and assignment, lead delete and
    // restore, document upload and view, and admin metadata sync -- there is no
    // call on a status change and none on an export. "Immutable" was wrong too:
    // 20260818000000_account_deletion.sql updates these rows to detach a
    // deleted user. The page now claims what the code does.
    description: 'Lead deletions, bulk reassignments, document access and admin changes are written to an audit log your founder dashboard can review.',
    tag: 'Compliance',
  },
  // Backed by the export-user-data / purge-user-data edge functions — both
  // authenticated and rate-limited. Only claim what those functions deliver.
  {
    icon: Download,
    title: 'Export Your Data Anytime',
    description: 'Request a full export of your workspace data on demand. Your leads, calls and notes are yours to take with you — no lock-in.',
    tag: 'Data Rights',
  },
  {
    icon: Trash2,
    title: 'Right to Erasure',
    description: 'Permanently delete your workspace data when you choose, aligned with India’s DPDP Act. Deletion is complete and irreversible.',
    tag: 'DPDP',
  },
];

export const SecurityPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Security & Data Privacy — CallMind CRM"
        description="CallMind stores zero call audio, isolates every workspace with PostgreSQL Row Level Security, and encrypts data in transit. See our security posture."
        path="/security"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-16 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Home
          </button>
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Security & Data Protection
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Your Customer Data Belongs Only to You
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Built from the ground up with strict data isolation, zero audio storage, and audit-ready security controls for Indian sales teams.
          </p>
        </section>

        {/* Security Pillars */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {securityPillars.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-8 rounded-3xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center">
                    <p.icon size={22} className="text-brand-600" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                    {p.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">{p.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Technical Architecture Details */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-black text-slate-900 font-display">Technical Security Guarantees</h2>
            </div>

            <div className="space-y-4 font-sans">
              {[
                { title: 'No Call Interception', text: 'CallMind triggers your native phone dialer via standard OS intents. Your call data travels across your mobile carrier network only.' },
                // Describe the mechanism, not an absolute guarantee. "Cross-tenant
                // leaks are programmatically impossible" was the previous wording;
                // it is not a claim any system can defend, and at the time of
                // writing several browser-readable tables were still missing
                // policies (see supabase/migrations/20260730_rls_gap_closure.sql).
                { title: 'Row-Level Tenant Isolation', text: 'Reads and writes are scoped to your workspace by PostgreSQL Row Level Security policies that check company_id, enforced inside the database rather than in application code.' },
                { title: 'Sanitized Webhook Payloads', text: 'Inbound webhooks from IndiaMART and Meta Ads are sanitized to prevent injection attacks before stored in your workspace inbox.' },
                { title: 'Role-Based Access Control (RBAC)', text: 'Telecallers cannot export lead databases or access financial settings. Only Founders and Admins hold full workspace permissions.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-medium mt-1">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-6">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile inline-flex items-center gap-2"
              >
                Start Free Trial
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
