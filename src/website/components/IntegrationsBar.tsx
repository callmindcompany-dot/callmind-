import React from 'react';
import { Database, Zap, FileSpreadsheet, ShieldCheck, CreditCard } from 'lucide-react';

export const IntegrationsBar = () => {
  const channels = [
    { name: 'IndiaMART GLUSR Webhooks', icon: Zap, detail: 'Sub-2s Lead Ingress' },
    { name: 'Meta (Facebook & IG) Lead Ads', icon: Database, detail: 'Real-Time Auto Capture' },
    { name: 'Google Sheets Live Sync', icon: FileSpreadsheet, detail: 'Cloud Database Import' },
    { name: 'Smart Excel / CSV Import', icon: FileSpreadsheet, detail: 'AI Column Mapping' },
    { name: 'Razorpay 18% GST Payments', icon: CreditCard, detail: 'B2B Invoice Compliance' },
  ];

  return (
    <section className="py-8 px-6 md:px-12 bg-white border-b border-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Trusted Lead Ingress & Payment Integrations
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {channels.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 hover:border-brand-200 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 font-display">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
