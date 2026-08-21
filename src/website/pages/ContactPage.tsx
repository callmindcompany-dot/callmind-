import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { Mail, Phone, MapPin, Send, MessageSquare, ArrowLeft, MessageCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const ContactPage = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast.error('Please enter your work email and message.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Thank you! Your inquiry has been received. Our team will contact you within 15 minutes.');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }, 600);
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead 
        title="Contact Sales & Support Team — Schedule Live Demo | CallMind" 
        description="Get in touch with the CallMind team. Book an interactive product demo, discuss customized enterprise plans, or speak to our technical support team in India."
        path="/contact"
        keywords={[
          'contact CallMind',
          'schedule CRM demo',
          'telecalling software support',
          'CallMind sales phone email',
          'enterprise CRM consultation',
          'Indian CRM customer support',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact Us', path: '/contact' },
        ]}
        jsonLd={[
          {
            '@type': 'ContactPage',
            '@id': 'https://callmind.app/contact#contact',
            name: 'Contact CallMind Sales & Support',
            mainEntity: {
              '@type': 'Organization',
              name: 'Voolabs Technologies',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support & sales',
                email: 'support@callmind.app',
                availableLanguage: ['English', 'Hindi', 'Marathi'],
                areaServed: 'IN',
              },
            },
          },
        ]}
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-20 pb-12 px-6 md:px-12 bg-white text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-3xl mx-auto">
            Let's Talk About Scaling Your Sales.
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
            Have questions about integrations, pricing, or enterprise plans? Our team is ready to help you set up CallMind.
          </p>
        </section>

        {/* Contact Content */}
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left: Contact Info */}
            <div className="space-y-12">
              <div className="space-y-8">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-brand-100">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-display">Sales & Demo</h3>
                    <p className="text-slate-500 mt-1 font-medium">Want to see CallMind in action? Schedule a 1-on-1 demo with our product experts.</p>
                    <a href="mailto:sales@callmind.app" className="inline-flex items-center gap-2 mt-3 text-brand-600 font-bold hover:text-brand-700">
                      sales@callmind.app
                    </a>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-brand-100">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-display">Customer Support</h3>
                    <p className="text-slate-500 mt-1 font-medium">Need technical help or billing support? Response time depends on your plan — see pricing.</p>
                    <a href="mailto:support@callmind.app" className="inline-flex items-center gap-2 mt-3 text-brand-600 font-bold hover:text-brand-700">
                      support@callmind.app
                    </a>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-brand-100">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-display">Office Headquarters</h3>
                    <p className="text-slate-500 mt-1 font-medium">Voolabs Technology Solutions<br />Pune, Nashik, Satara, Maharashtra, India</p>
                  </div>
                </motion.div>
              </div>

              {/* Book Demo CTA */}
              <div className="bg-slate-900 rounded-2xl p-8 text-white border border-slate-800 shadow-xl relative space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Fast 15-Min Response
                </div>
                <h3 className="text-2xl font-bold font-display">Prefer a live walk-through?</h3>
                <p className="text-slate-300 font-medium">
                  Book a quick call with our engineering and product team. We'll help you connect IndiaMART and add your team.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a 
                    href="mailto:sales@callmind.app?subject=Request%20Live%20CallMind%20Demo" 
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all btn-tactile inline-flex items-center gap-2"
                  >
                    <Calendar size={16} /> Request Demo Call
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Send us a message</h2>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" 
                      placeholder="Rajesh" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" 
                      placeholder="Kumar" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Work Email *</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" 
                    placeholder="rajesh@company.com" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phone Number (Optional)</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" 
                    placeholder="+91 98XXX XXXXX" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">How can we help? *</label>
                  <textarea 
                    rows={4} 
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow resize-none" 
                    placeholder="I want to connect our IndiaMART account and onboard 5 telecallers..."
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-bold text-sm btn-glow btn-tactile flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'} <Send size={16} />
                </button>
              </form>
            </motion.div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};
