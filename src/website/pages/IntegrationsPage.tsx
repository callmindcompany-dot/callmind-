import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { ArrowLeft, ArrowRight, Database, Facebook, FileSpreadsheet, CheckCircle2, Building2, Package, Globe, Webhook, MessageCircle, Mail, CreditCard, Plug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../components/SectionHeader';

/**
 * Every card below maps to something that actually *works* — not merely to a
 * file with the right name:
 *   IndiaMART      -> supabase/functions/indiamart-poll
 *   JustDial       -> supabase/functions/justdial-poll
 *   TradeIndia     -> supabase/functions/tradeindia-poll
 *   Meta Lead Ads  -> supabase/functions/facebook-poll
 *   Website Forms  -> supabase/functions/webhook-receiver (+ WebsiteFormPanel)
 *   Custom Webhook -> supabase/functions/webhook-receiver
 *   Excel / Sheets -> in-app importer
 *   Razorpay       -> src/routes/payments.ts
 *
 * Two cards are gone, and the reason is the reason this comment now says
 * "works" rather than "exists":
 *
 *   WhatsApp Business  send-whatsapp-message and receive-whatsapp-webhook are
 *                      both present and neither talks to Meta. The first had
 *                      the Graph API call commented out and returned an
 *                      invented message id; the second stored nothing and
 *                      answered 200. Listing them as proof was checking the
 *                      filenames, not the code inside them.
 *
 *   Email / SMTP       send-email answers `success: false, "Custom domain
 *                      email sending is currently disabled"`, and
 *                      emailFromOwnDomain is false on every plan in
 *                      src/config/pricing.ts. Honest function, false card.
 *
 * Put them back in the same change that makes them send something.
 */
const allIntegrations = [
  { icon: Database, name: 'IndiaMART', desc: 'GLUSR webhook lead sync' },
  { icon: Building2, name: 'JustDial', desc: 'Auto-capture JustDial enquiries' },
  { icon: Package, name: 'TradeIndia', desc: 'TradeIndia lead ingestion' },
  { icon: Facebook, name: 'Meta Lead Ads', desc: 'Facebook & Instagram forms' },
  { icon: Globe, name: 'Website Forms', desc: 'Embed a form, leads flow in' },
  { icon: Webhook, name: 'Custom Webhooks', desc: 'POST leads from any source' },
  { icon: FileSpreadsheet, name: 'Excel & Google Sheets', desc: 'Bulk import with AI mapping' },
  { icon: CreditCard, name: 'Razorpay', desc: 'GST-compliant subscription billing' },
];

export const IntegrationsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead 
        title="Lead Integrations — IndiaMART, JustDial, Meta Ads & Webhooks | CallMind" 
        description="Connect your lead generation sources in 60 seconds. Real-time auto-capture webhooks for IndiaMART, JustDial, TradeIndia, Facebook Lead Ads, Google Forms, and REST APIs."
        path="/integrations"
        keywords={[
          'IndiaMART CRM API integration',
          'JustDial lead webhook',
          'Facebook Lead Ads auto import',
          'TradeIndia CRM integration',
          'lead capture webhooks',
          'REST API telecalling CRM',
          'WhatsApp webhook CRM',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Integrations', path: '/integrations' },
        ]}
        jsonLd={[
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://callmind.app/integrations#software',
            name: 'CallMind CRM Integrations Engine',
            applicationCategory: 'BusinessApplication',
            description:
              'Real-time automated webhook and API integration connectors for IndiaMART, JustDial, Meta Ads, and webhooks.',
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-20 pb-12 px-6 md:px-12 bg-white text-center space-y-6">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Seamless Integrations
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Connect Your Lead Sources in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">60 Seconds.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Stop downloading CSV files. Route leads from IndiaMART, JustDial, TradeIndia, Meta Ads, website forms and custom webhooks straight into your telecallers' mobile app.
          </p>
        </section>

        {/* Integration Cards */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto space-y-24">
            
            {/* IndiaMART Integration */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                  <Database size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 font-display">IndiaMART CRM Sync</h2>
                <p className="text-lg text-slate-500 font-medium">
                  Use our GLUSR webhook to instantly capture every IndiaMART inquiry. The moment a buyer sends a message, it rings on your telecaller's phone.
                </p>
                <ul className="space-y-3">
                  {['Zero API coding required', 'Auto-assign to available agents', 'Lead de-duplication enabled'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800">New IndiaMART Lead</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">Auto-Assigned</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta Ads Integration */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                  <Facebook size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 font-display">Meta (Facebook) Leads</h2>
                <p className="text-lg text-slate-500 font-medium">
                  Never let Facebook or Instagram ad leads go cold. Connect your Meta Business account to route leads directly to your pipeline board.
                </p>
                <ul className="space-y-3">
                  {['Map custom ad form fields', 'Real-time webhook ingestion', 'Track ROI per campaign'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative">
                   <div className="font-mono text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                     POST /api/webhooks/meta<br/>
                     {"{"} "lead_id": "12345", "form": "Q3_Offers" {"}"}
                   </div>
                </div>
              </div>
            </div>

            {/* Custom / Excel */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
              <div className="w-full md:w-1/2 space-y-6">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                  <FileSpreadsheet size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 font-display">Excel & Google Sheets</h2>
                <p className="text-lg text-slate-500 font-medium">
                  Have an existing database? Upload your CSV or connect a live Google Sheet. Our AI column mapper automatically formats your data into actionable leads.
                </p>
              </div>
              <div className="w-full md:w-1/2">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex justify-center items-center">
                   <button className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-2 border border-slate-200">
                     <FileSpreadsheet size={18} /> Upload contacts.csv
                   </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Full integrations grid — every card is backed by real code (see allIntegrations) */}
        <section className="py-20 px-6 md:px-12 bg-slate-50 border-t border-slate-100">
          <div className="max-w-6xl mx-auto space-y-14">
            <SectionHeader
              badge={{ icon: Plug, text: 'Everything Connected' }}
              title="One Platform, Every Lead Source"
              subtitle="Capture leads wherever they come from, and reach customers on every channel — all wired into the same pipeline."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {allIntegrations.map((it) => (
                <div
                  key={it.name}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4 hover:border-brand-200 hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 shrink-0 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center border border-brand-100">
                    <it.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">{it.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-24 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl relative border border-slate-800">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight font-display mb-6">
              Ready to automate your lead ingress?
            </h2>
            <button 
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile flex items-center gap-2 mx-auto"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
