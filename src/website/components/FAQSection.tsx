import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, CheckCircle2, MessageSquare } from 'lucide-react';

const faqs = [
  {
    question: 'How does 1-click SIM dialing work on Android mobile devices?',
    answer:
      'Telecallers open the CallMind Android Mobile App on their phone. When tapping "Call Lead", the app initiates a direct mobile call through the phone\'s native SIM 1 or SIM 2. The call outcome, duration, and timestamp auto-sync directly to your central CRM database.',
  },
  {
    question: 'How does automatic multi-source lead capture work?',
    answer:
      'CallMind provides built-in webhook endpoints and connectors for Meta Lead Ads, online marketplaces, website forms, and Excel spreadsheets. Inbound inquiries are captured within seconds and automatically assigned to available telecallers via round-robin distribution.',
  },
  {
    question: 'What is the security difference between Admin Web Dashboard and Telecaller Mobile App?',
    answer:
      'CallMind enforces strict role-based app separation. Business owners and admins manage pipelines, team quotas, and GST invoices via the Web Dashboard. Telecallers log into the Mobile App using Google OAuth and can only view their assigned lead queue.',
  },
  {
    question: 'Are call recordings or personal contacts stored on CallMind servers?',
    answer:
      'No. CallMind respects strict Indian privacy guidelines and GDPR regulations. Calls are placed directly over native mobile carrier channels. We log call metadata (duration, timestamp, outcome, notes) but never record or store audio files or personal phone contacts.',
  },
  {
    question: 'Can I generate 18% GST tax invoices for business accounting?',
    answer:
      'Yes! CallMind automatically issues B2B tax-compliant GST invoices for every subscription payment with a full breakdown of CGST (9%) + SGST (9%) or IGST (18%). You can input your company GSTIN during checkout or in Settings.',
  },
  {
    question: 'Is there a free trial, and do I need to enter credit card details?',
    answer:
      'You get a 7-Day Free Trial with full access to 3 telecaller seats, multi-source lead integrations, and Kanban pipelines. No credit card or upfront payment commitment is required to start your trial.',
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 md:px-12 bg-slate-50 border-t border-slate-100 font-sans">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <HelpCircle size={14} className="text-brand-600" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            Got Questions? We've Got Answers
          </h2>
          <p className="text-base text-slate-500 font-medium">
            Everything you need to know about CallMind telecalling software, mobile app integration, and pricing.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-brand-200"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  aria-expanded={isOpen}
                  /* focus-visible ring replaces the removed outline: without it
                     keyboard users got no indication of which FAQ is focused. */
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset rounded-2xl"
                >
                  <span className="text-base font-bold text-slate-900 font-display">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 ${
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
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-0 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100/80">
                        <p className="pt-4">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-1">
            <h4 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <MessageSquare size={18} className="text-brand-600" />
              Still have questions for your sales team?
            </h4>
            <p className="text-sm text-slate-500 font-medium">
              Our team of telecalling experts is ready to assist you in setting up IndiaMART webhooks and mobile apps.
            </p>
          </div>
          <a
            href="/contact"
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all btn-tactile whitespace-nowrap"
          >
            Talk to Sales Specialist
          </a>
        </div>

      </div>
    </section>
  );
};
