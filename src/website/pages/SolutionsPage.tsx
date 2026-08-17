import React from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, PhoneCall, Rocket, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { FREE_TRIAL_CONFIG } from '../../config/pricing';

const solutions = [
  {
    icon: Building2,
    title: 'B2B Sales Teams',
    tagline: 'Never Lose an Inbound IndiaMART or Meta Lead',
    description: 'B2B companies receive dozens of inbound inquiries daily. CallMind auto-assigns leads to telecallers instantly and flags untouched leads before they go cold.',
    benefits: [
      'Instant lead assignment via IndiaMART & Meta webhooks',
      'Lead rotting alerts for untouched leads (>24 hours)',
      'Stage progression tracking from New to Negotiation',
      'Daily call targets and telecaller quota monitoring',
    ],
  },
  {
    icon: Users,
    title: 'BPO & Telecalling Agencies',
    tagline: 'Scale 10 to 50 Telecallers With Zero Friction',
    description: 'Outsourced telecalling agencies need rapid onboarding, strict team management, and clear productivity reports across multiple client accounts.',
    benefits: [
      '3-second QR code telecaller team onboarding',
      'Real-time call duration and attempt analytics',
      'Multi-branch workspace allocation for different clients',
      'Role-based permissions — agents only see assigned leads',
    ],
  },
  {
    icon: PhoneCall,
    title: 'Customer Support & Re-Engagement',
    tagline: 'Turn Inactive Customers Into Renewal Sales',
    description: 'Support teams can manage structured follow-up call lists with post-call notes, ensuring customer queries and renewal reminders are completed on time.',
    benefits: [
      'Structured follow-up call queues per agent',
      '1-click SIM dialing with zero call recording overhead',
      'Post-call stage updates and quick notes',
      // Was "every customer interaction". Ordinary calls and status changes
      // are not audited; deletions, reassignments and document access are.
      'Audit log history for deletions, reassignments and document access',
    ],
  },
  {
    icon: Rocket,
    title: 'Founder-Led Companies',
    tagline: 'Complete Visibility Without Micro-Management',
    description: 'Founders gain a bird’s-eye view of team call volume, pipeline velocity, and GST tax invoices without spending hours reviewing spreadsheets.',
    benefits: [
      'Executive dashboard with real-time call metrics',
      'Automated GST tax invoice downloads (18% GST)',
      'Zero audio storage — respects team privacy',
      '7-day free trial with instant setup',
    ],
  },
];

export const SolutionsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Industry Solutions — Real Estate, BFSI, Education, SME Sales | CallMind"
        description="Tailored telecalling workflows for Real Estate brokers, Loan & Insurance agents, EdTech counseling, Healthcare clinics, Automobile dealerships, and B2B distributors."
        path="/solutions"
        keywords={[
          'real estate telecalling CRM',
          'insurance sales CRM software',
          'education counseling CRM',
          'B2B telecalling software',
          'SME lead management system',
          'automotive dealership CRM',
          'financial services telecalling CRM',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Solutions', path: '/solutions' },
        ]}
        jsonLd={[
          {
            '@type': 'Service',
            '@id': 'https://callmind.app/solutions#service',
            name: 'CallMind Industry Telecalling Solutions',
            provider: {
              '@type': 'Organization',
              name: 'Voolabs Technologies',
            },
            serviceType: 'Telecalling and Lead Management Systems for Indian Industries',
            areaServed: 'IN',
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-20 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Industry Solutions
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Built for Teams That Live on the Phone
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Whether you run a 3-person sales office or a 50-seat telecalling agency, CallMind adapts to your workflow.
          </p>
        </section>

        {/* Solutions Grid */}
        <section className="py-20 px-6 md:px-12 bg-slate-50">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {solutions.map((sol, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-8 md:p-10 rounded-3xl space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
                    <sol.icon size={24} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 font-display">{sol.title}</h3>
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mt-1">{sol.tagline}</p>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{sol.description}</p>
                  
                  <div className="space-y-2.5 pt-2">
                    {sol.benefits.map((b, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-900 hover:border-brand-300 hover:text-brand-600 rounded-xl text-xs font-bold font-sans transition-all btn-tactile flex items-center justify-center gap-2"
                  >
                    View Pricing Plans
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 md:px-12 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
              Transform Your Telecalling Workflow
            </h2>
            <p className="text-base text-slate-500 font-medium">
              Start your {FREE_TRIAL_CONFIG.trialDays}-day free trial today. Up to {FREE_TRIAL_CONFIG.includedTelecallers} telecallers included free.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile inline-flex items-center gap-2"
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
