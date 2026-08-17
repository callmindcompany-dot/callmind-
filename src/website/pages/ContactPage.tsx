import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';
import { Mail, Phone, MapPin, Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ContactPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead 
        title="Contact Sales | CallMind by Voolabs" 
        description="Get in touch with the CallMind team. Book a demo, request pricing, or contact our support team in India."
        path="/contact"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="pt-16 pb-12 px-6 md:px-12 bg-white text-center space-y-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Home
          </button>
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
              <div className="bg-slate-900 rounded-2xl p-8 text-white border border-slate-800 shadow-xl relative">
                <h3 className="text-2xl font-bold font-display">Prefer a live walk-through?</h3>
                <p className="text-slate-300 mt-2 mb-6 font-medium">
                  Book a 30-minute Zoom call. We'll show you how to connect IndiaMART and add your team.
                </p>
                <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all btn-tactile w-full md:w-auto relative z-10">
                  Schedule on Calendly
                </button>
              </div>
            </div>

            {/* Right: Contact Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Send us a message</h2>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">First Name</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" placeholder="Rajesh" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Last Name</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" placeholder="Kumar" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Work Email</label>
                  <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" placeholder="rajesh@company.com" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phone Number (Optional)</label>
                  <input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow" placeholder="+91 98XXX XXXXX" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">How can we help?</label>
                  <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow resize-none" placeholder="I want to integrate CallMind with our custom CRM..."></textarea>
                </div>

                <button type="submit" className="w-full bg-brand-600 text-white rounded-xl py-3.5 font-bold text-sm btn-glow btn-tactile flex items-center justify-center gap-2 mt-2">
                  Send Message <Send size={16} />
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
