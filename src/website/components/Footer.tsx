import React, { useState } from 'react';
import { Phone, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const Footer = () => {
  const [email, setEmail] = useState('');

  // <Link> already navigates and renders a crawlable <a href>; this only adds
  // the scroll-to-top side effect the old button handler had.
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success('Thank you! You are subscribed to CallMind updates.');
    setEmail('');
  };

  const productLinks = [
    { label: 'Platform Overview', path: '/platform' },
    { label: 'CRM Product Suite', path: '/product' },
    { label: 'Developer Docs & API', path: '/docs' },
    { label: 'Integrations', path: '/integrations' },
    { label: 'Telecaller Mobile App', path: '/mobile-app' },
    { label: 'Pricing Plans', path: '/pricing' },
    { label: 'Industry Solutions', path: '/solutions' },
  ];

  const companyLinks = [
    { label: 'About CallMind', path: '/company' },
    { label: 'Security & Privacy', path: '/security' },
    { label: 'Contact Sales', path: '/contact' },
  ];

  const linkClass = 'text-sm text-slate-300 hover:text-white transition-colors text-left';

  return (
    <footer className="bg-slate-900 text-white pt-20 pb-10 px-6 md:px-12 font-sans border-t border-slate-800 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-600/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16 pb-16 border-b border-slate-800">

          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link
              to="/"
              onClick={scrollTop}
              className="flex items-center gap-3 cursor-pointer w-fit"
              aria-label="CallMind home"
            >
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
                <Phone size={16} className="text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight font-display">
                CallMind<span className="text-brand-400">.</span>
              </span>
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              The SIM telecalling CRM built for Indian SMEs and sales agencies. Auto-capture leads, dial via mobile SIM, and track every call — with zero audio storage.
            </p>

            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldCheck size={14} className="text-emerald-400" />
              100% SIM Privacy · Zero Audio Storage
            </div>
          </div>

          {/* Product Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Product</h4>
            <div className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={scrollTop} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company & Developer Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Company</h4>
            <div className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={scrollTop} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 mt-8">Developers & API</h4>
            <div className="flex flex-col gap-3">
              <Link
                to="/docs"
                onClick={scrollTop}
                className="text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors text-left flex items-center gap-1.5"
              >
                <span>Documentation & API</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">v1.0</span>
              </Link>
              <Link to="/docs" onClick={scrollTop} className={linkClass}>API Playground</Link>
              <Link to="/docs" onClick={scrollTop} className={linkClass}>Webhooks Guide</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Stay Updated</h4>
            <p className="text-sm text-slate-400 mb-4">Get product updates and telecalling growth tips.</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-label="Email address for product updates"
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold btn-glow btn-tactile flex items-center gap-1.5"
              >
                <Mail size={14} />
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Copyright + Legal Links Bottom Bar */}
        <div className="flex flex-col items-center gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/legal/privacy" onClick={scrollTop} className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-slate-700">·</span>
            <Link to="/legal/terms" onClick={scrollTop} className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <span className="text-slate-700">·</span>
            <Link to="/legal/refund" onClick={scrollTop} className="hover:text-slate-300 transition-colors">
              Refund Policy
            </Link>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 text-center">
            <span>© {new Date().getFullYear()} Voolabs Technologies. CallMind is a product of Voolabs. All rights reserved.</span>
            <span className="hidden md:inline text-slate-700">·</span>
            <span>Mumbai, Maharashtra, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
