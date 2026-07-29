import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BeforeAfterComparison = () => {
  const navigate = useNavigate();

  const comparisons = [
    {
      problemTitle: 'Manual Excel Number Typing',
      problemDesc: 'Telecallers waste 3+ hours daily typing numbers manually into their phone keypad.',
      solutionTitle: '1-Tap Native SIM Dialing',
      solutionDesc: 'Tap once on the telecaller app to dial via SIM 1 or SIM 2 with zero manual typing.',
    },
    {
      problemTitle: 'IndiaMART Leads Go Cold',
      problemDesc: 'Inquiries sit in email inboxes for 4+ hours before anyone calls them back.',
      solutionTitle: 'Sub-2s Webhook Auto-Capture',
      solutionDesc: 'IndiaMART & Meta Ads leads arrive on the telecaller phone in under 2 seconds.',
    },
    {
      problemTitle: 'Zero Call Quota Visibility',
      problemDesc: 'Founders have no idea how many calls were actually placed or connected today.',
      solutionTitle: 'Real-Time Admin Dashboards',
      solutionDesc: 'Track telecaller quotas, call durations, and pipeline stages in real-time.',
    },
    {
      problemTitle: 'Fragmented Customer Notes',
      problemDesc: 'Lead follow-ups are written on paper pads or lost in chat groups.',
      solutionTitle: 'Structured Post-Call CRM Logs',
      solutionDesc: 'Log outcomes, notes, and callback reminders in 2 taps right after the call.',
    },
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-white font-sans border-b border-slate-100">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <TrendingUp size={14} className="text-brand-600" />
            <span>SME Telecalling Transformation</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            How CallMind Transforms Your Sales Team
          </h2>

          <p className="text-base text-slate-500 font-medium">
            See the dramatic efficiency leap when switching from outdated spreadsheets to automated SIM telecalling.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Before CallMind */}
          <div className="bg-red-50/40 border border-red-200/80 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-red-200/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">Before CallMind</h3>
                <p className="text-xs text-red-700 font-semibold">Manual Excel Spreadsheets & Cold Follow-ups</p>
              </div>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-red-100 space-y-1 shadow-sm">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                    <XCircle size={14} className="shrink-0" />
                    <span>{item.problemTitle}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium pl-5">{item.problemDesc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: With CallMind */}
          <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-200/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">With CallMind</h3>
                <p className="text-xs text-emerald-700 font-semibold">Automated SIM Telecalling & Sub-2s Webhooks</p>
              </div>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-1 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{item.solutionTitle}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium pl-5">{item.solutionDesc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
