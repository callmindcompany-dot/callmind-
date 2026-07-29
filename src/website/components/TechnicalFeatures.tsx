import React from 'react';
import { Network, Users, Download, Receipt } from 'lucide-react';

export const TechnicalFeatures = () => {
  const features = [
    {
      icon: <Network size={24} />,
      title: "Universal API & Webhooks",
      desc: "Connect CallMind to any external system. We support bi-directional webhooks for real-time lead ingestion and status updates."
    },
    {
      icon: <Users size={24} />,
      title: "Role-Based Access Control",
      desc: "Enterprise-grade RBAC. Assign leads to specific sub-admins or telecallers with strict data isolation protocols."
    },
    {
      icon: <Download size={24} />,
      title: "Secure Data Export",
      desc: "Export your pipeline data to CSV or Excel instantly. Scheduled automated backups available for enterprise tiers."
    },
    {
      icon: <Receipt size={24} />,
      title: "B2B GST Invoicing",
      desc: "Fully compliant with Indian taxation. Get automatic 18% GST invoices for your subscription to claim input tax credit."
    }
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-display">
            Enterprise Capabilities
          </h2>
          <p className="text-lg text-slate-500 font-medium">
            Everything you need to run a secure, scalable telecalling operation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feat, i) => (
            <div key={i} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{feat.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
