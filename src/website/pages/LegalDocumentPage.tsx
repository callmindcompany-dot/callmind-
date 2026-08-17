import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Mail,
  ChevronRight,
  ArrowLeft,
  Printer,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import {
  LEGAL_DOCUMENTS,
  LEGAL_SLUGS,
  ENTITY,
  READY_TO_PUBLISH,
  REVIEWED_BY_LAWYER,
  ENTITY_IS_COMPLETE,
  type LegalSlug,
} from '@/config/legal';

/**
 * One page for all three legal documents.
 *
 * There were three near-identical files here — 1,326 lines between them — each
 * carrying its own copy of the text, and the mobile app carried a fourth while
 * the legal_pages table held a fifth. They disagreed: one named the operating
 * entity as "Voolabs Technologies", another as "CallMind Technologies Inc."
 * with jurisdiction in Pune, and the Terms named Stripe as a payment processor
 * that has never been integrated.
 *
 * The words now live in src/config/legal.ts and this renders them.
 */

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
);

const Ul = ({ items }: { items: string[] }) => (
  <ul className="space-y-2 mt-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
        <ChevronRight size={14} className="text-brand-500 mt-0.5 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export const LegalDocumentPage = ({ slug }: { slug: LegalSlug }) => {
  const doc = LEGAL_DOCUMENTS[slug];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title={`${doc.title} — ${ENTITY.brand} CRM Legal`}
        description={doc.summary}
        path={`/legal/${doc.slug}`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Legal', path: '/legal/terms' },
          { name: doc.title, path: `/legal/${doc.slug}` },
        ]}
        jsonLd={[
          {
            '@type': 'WebPage',
            '@id': `https://callmind.app/legal/${doc.slug}#webpage`,
            name: `${doc.title} - CallMind CRM`,
            description: doc.summary,
            publisher: {
              '@type': 'Organization',
              name: 'Voolabs Technologies',
            },
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        <section className="pt-16 pb-14 px-6 md:px-12 bg-white border-b border-slate-100 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto space-y-5"
          >
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display leading-tight">
              {doc.title}
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-xl mx-auto">{doc.summary}</p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-medium pt-2">
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Last updated {formatDate(doc.effectiveDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} /> Version {doc.version}
              </span>
            </div>

            {/* Sibling documents, so a reader can move between them. Each page
                used to be a dead end. */}
            <nav className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {LEGAL_SLUGS.map((s) => (
                <a
                  key={s}
                  href={`/legal/${s}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    s === slug
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {LEGAL_DOCUMENTS[s].title}
                </a>
              ))}
            </nav>

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all btn-tactile"
              >
                <Printer size={13} />
                Print / Save PDF
              </button>
            </div>
          </motion.div>
        </section>

        {/* Visible only while the entity placeholders are unfilled, so an
            incomplete document cannot quietly go live naming nobody. */}
        {!READY_TO_PUBLISH && (
          <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">This document is not ready to publish.</p>
                <p className="mt-1">
                  {!ENTITY_IS_COMPLETE
                    ? 'The operating entity or address in src/config/legal.ts is still a placeholder.'
                    : !REVIEWED_BY_LAWYER
                      ? 'No lawyer has reviewed this text yet. Set REVIEWED_BY_LAWYER in src/config/legal.ts once one has.'
                      : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex gap-10 items-start">
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                On this page
              </p>
              <nav className="space-y-1">
                {doc.sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
                  >
                    <ChevronRight size={13} className="text-slate-400 shrink-0" />
                    {s.title}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-4 bg-slate-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold mb-1">Questions?</p>
              <p className="text-xs text-slate-400 mb-3">We reply within three working days.</p>
              <a
                href={`mailto:${ENTITY.supportEmail}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:underline"
              >
                <Mail size={12} />
                {ENTITY.supportEmail}
              </a>
            </div>
          </aside>

          <article className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 mb-12 last:mb-0">
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 text-brand-600 text-sm font-black">
                    {i + 1}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 font-display">{s.title}</h2>
                </div>
                <div className="space-y-3">
                  {s.body.map((para, j) => (
                    <P key={j}>{para}</P>
                  ))}
                  {s.bullets && <Ul items={s.bullets} />}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export const PrivacyPolicyPage = () => <LegalDocumentPage slug="privacy" />;
export const TermsOfServicePage = () => <LegalDocumentPage slug="terms" />;
export const RefundPolicyPage = () => <LegalDocumentPage slug="refund" />;
