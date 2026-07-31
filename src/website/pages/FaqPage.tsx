import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { SectionHeader } from '../components/SectionHeader';
import { faqsByCategory, FAQS } from '../data/faqs';

/**
 * Public FAQ.
 *
 * The FAQ content used to live inside FAQSection.tsx, which stopped being
 * imported when the home page was trimmed — six written answers that no
 * visitor could reach. It now lives in src/website/data/faqs.ts and is rendered
 * here, where it also earns a FAQPage JSON-LD block (below) that lets search
 * engines show the questions directly in results.
 */
/**
 * FAQPage structured data.
 *
 * Rendered into the markup rather than appended from a useEffect, because
 * effects never run during prerendering — and the crawlers this schema exists
 * for (Google rich results, and answer engines like ChatGPT and Perplexity) do
 * not execute JavaScript, so an effect-injected block would be invisible to
 * every consumer it was written for.
 */
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
});

export const FaqPage = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Frequently Asked Questions — CallMind Telecalling CRM"
        description="Answers about SIM dialing, offline calling, IndiaMART and JustDial lead capture, data privacy under India's DPDP Act, GST invoices and CallMind pricing."
        path="/faq"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-16 pb-14 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all"
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              <HelpCircle size={14} className="text-brand-600" />
              Frequently Asked Questions
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-3xl mx-auto">
            Questions, answered{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
              straight.
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            {FAQS.length} answers about how CallMind works, what it costs, and what happens to your data.
          </p>
        </section>

        {/* Categories */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-4xl mx-auto space-y-16">
            {faqsByCategory.map((group) => (
              <div key={group.category} className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">
                  {group.label}
                </h2>

                <div className="space-y-3">
                  {group.items.map((faq, idx) => {
                    const key = `${group.category}-${idx}`;
                    const isOpen = openKey === key;
                    return (
                      <div
                        key={key}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-brand-200"
                      >
                        <button
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          className="w-full p-5 md:p-6 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset rounded-2xl"
                        >
                          <span className="text-base font-bold text-slate-900 font-display">
                            {faq.question}
                          </span>
                          <div
                            className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-300 ${
                              isOpen ? 'bg-brand-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <ChevronDown size={18} />
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <p className="px-5 md:px-6 pb-6 text-sm text-slate-600 font-medium leading-relaxed">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Still stuck */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <SectionHeader
              badge={{ icon: MessageSquare, text: 'Still Have Questions?' }}
              title="Talk to someone who knows the product"
              subtitle="If your question isn't here, ask us directly. We'd rather tell you it isn't a fit than sell you the wrong thing."
            />
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/contact"
                className="px-7 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile inline-flex items-center gap-2"
              >
                Contact Sales
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/platform"
                className="px-7 py-3.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all btn-tactile"
              >
                See the full platform
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
