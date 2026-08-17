import React, { useState } from 'react';
import { COMPANY_LOCATIONS } from '../siteConfig';
import { ENTITY } from '@/config/legal';
import { motion } from 'framer-motion';
import { Mail, MapPin, ShieldCheck, Building2, User, Send, CheckCircle2, ArrowLeft, HeartHandshake } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { FounderSection } from '../components/FounderSection';
import { CompanyAboutSection } from '../components/CompanyAboutSection';
import { masterFounderEmail } from '../../constants';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const CompanyPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Thank you! Your message has been sent to our leadership team.');
      setName('');
      setEmail('');
      setMessage('');
    }, 800);
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="About CallMind & Voolabs Technologies | Indian SaaS Company"
        description="Learn about Voolabs Technologies and our mission to build high-performance, privacy-first telecalling software for fast-growing sales organizations across India."
        path="/company"
        keywords={[
          'CallMind company',
          'Voolabs Technologies',
          'Vrushabh Shinde founder',
          'Pune SaaS startup',
          'Made in India CRM',
          'telecalling technology company',
          'Indian CRM software company',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Company', path: '/company' },
        ]}
        jsonLd={[
          {
            '@type': 'AboutPage',
            '@id': 'https://callmind.app/company#about',
            name: 'About CallMind & Voolabs Technologies',
            mainEntity: {
              '@type': 'Organization',
              name: 'Voolabs Technologies',
              url: 'https://callmind.app',
              founder: {
                '@type': 'Person',
                name: 'Vrushabh Shinde',
                jobTitle: 'Founder & Software Architect',
              },
            },
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-20 pb-16 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-6">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              {ENTITY.business} — Creators of CallMind
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Engineering Telecalling Infrastructure for High-Velocity Teams
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            CallMind was built to solve a critical problem for Indian SMEs and BPO agencies: eliminating manual spreadsheet data entry while keeping 100% SIM privacy.
          </p>
        </section>

        {/* 1. Founder Spotlight (Vrushabh Shinde) */}
        <FounderSection />

        {/* 2. Platform Architecture & Engineering Mission */}
        <CompanyAboutSection />

        {/* 3. Direct Leadership Contact Section */}
        <section className="py-20 px-6 md:px-12 bg-white font-sans border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Direct Connect</span>
              <h2 className="text-3xl font-black text-slate-900 font-display">Get in Touch with Leadership</h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Have questions about enterprise custom SLA, API webhooks, or multi-workspace deployment? Write directly to our team.
              </p>

              <div className="space-y-4 pt-2 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Mail size={16} className="text-brand-600" />
                  <span>{masterFounderEmail}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <MapPin size={16} className="text-brand-600" />
                  <span>{ENTITY.business} · {COMPANY_LOCATIONS}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 p-8 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-display">Send a Direct Message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help your sales team?"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                  <Send size={14} />
                </button>
              </form>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
