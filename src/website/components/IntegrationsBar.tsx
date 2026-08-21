import React from 'react';
import { Zap, Database, FileSpreadsheet, CreditCard, ShieldCheck } from 'lucide-react';

export const IntegrationsBar = () => {
  const channels = [
    { name: 'IndiaMART GLUSR API', tag: '< 1.8s Ingress', detail: 'Direct Webhook Push' },
    { name: 'Meta Lead Ads', tag: 'Real-Time', detail: 'FB & IG Form Ingress' },
    { name: 'TradeIndia Leads', tag: 'Automated Sync', detail: 'Buyer Inquiries' },
    { name: 'JustDial Enquiries', tag: 'Direct Capture', detail: 'Instant Assignment' },
    { name: 'Google Sheets & CSV', tag: 'Live Sync', detail: 'Clean Data Mapping' },
    { name: '18% GST Invoicing', tag: 'B2B Tax Credit', detail: 'Instant ITC Invoices' },
  ];

  return (
    <section className="py-7 px-6 md:px-12 bg-slate-50 border-b border-slate-200/80 font-sans">
      <div className="max-w-7xl mx-auto space-y-3.5">
        <p className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Verified B2B Lead Ingress & Payment Integrations
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {channels.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-brand-600" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 font-sans">{item.name}</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {item.tag}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

