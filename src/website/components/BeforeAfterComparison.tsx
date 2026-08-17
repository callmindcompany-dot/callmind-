import React from 'react';
import { XCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

export const BeforeAfterComparison = () => {
  const comparisons = [
    {
      problemTitle: 'Manual Excel Number Typing',
      problemDesc: 'Telecallers waste 3+ hours daily dialing numbers manually from spreadsheets, causing frequent typos.',
      solutionTitle: '1-Tap Native SIM Dialing',
      solutionDesc: 'Dial instantly from Android SIM 1 or SIM 2 with zero manual typing and automatic duration tracking.',
    },
    {
      problemTitle: 'IndiaMART Leads Sit Idle',
      problemDesc: 'Inquiries sit in email inboxes for hours before telecallers see them, losing hot buyer intent.',
      solutionTitle: 'Sub-2s Webhook Ingress',
      solutionDesc: 'IndiaMART & Meta Ads leads route directly to checked-in telecallers on their phones in under 2 seconds.',
    },
    {
      problemTitle: 'Zero Real-Time Visibility',
      problemDesc: 'Founders and managers rely on end-of-day verbal reports without knowing true connected call counts.',
      solutionTitle: 'Live Telecaller Dashboards',
      solutionDesc: 'Real-time pipeline tracking, daily call quota progress, and connected talk-time breakdown.',
    },
    {
      problemTitle: 'Lost Customer Notes & Follow-ups',
      problemDesc: 'Lead discussions written on paper pads or scattered chat apps get forgotten or lost.',
      solutionTitle: 'Structured Post-Call CRM Logs',
      solutionDesc: 'Log call outcomes, structured customer notes, and scheduled calendar callbacks right after each call.',
    },
  ];

  return (
    <section className="py-20 px-6 md:px-12 bg-white font-sans border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <SectionHeader
          badge={{ icon: TrendingUp, text: 'Operational Comparison' }}
          title="Spreadsheets vs CallMind SIM Telecalling"
          subtitle="A direct comparison of manual telecalling overhead versus an automated, compliant SIM workflow."
        />

        {/* High-Clarity Side-by-Side Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Left: The Old Way */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider font-mono">Traditional Method</span>
                <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">Spreadsheets & Manual Dialing</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <XCircle size={18} />
              </div>
            </div>

            <div className="space-y-3.5">
              {comparisons.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                    <XCircle size={14} className="shrink-0" />
                    <span>{item.problemTitle}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium pl-5 leading-relaxed">{item.problemDesc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: With CallMind */}
          <div className="bg-brand-50/50 border border-brand-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-brand-200/80 pb-4">
              <div>
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider font-mono">CallMind Workflow</span>
                <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">Automated SIM CRM System</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold shadow-xs">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="space-y-3.5">
              {comparisons.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-brand-200/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-brand-700 font-bold text-xs">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    <span>{item.solutionTitle}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium pl-5 leading-relaxed">{item.solutionDesc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

