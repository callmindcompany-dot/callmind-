import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowRight, Phone } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SEOHead } from '../components/SEOHead';

/**
 * Real 404 page. The router previously redirected every unknown path to "/",
 * which is a soft 404 — the visitor lands on the homepage with no explanation
 * and search engines see a mistyped URL return 200 OK. This gives a clear
 * message and routes people to the pages they most likely wanted.
 */
const helpfulLinks = [
  { label: 'Product', path: '/product' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Mobile App', path: '/mobile-app' },
  { label: 'Documentation', path: '/docs' },
  { label: 'Contact Sales', path: '/contact' },
];

export const NotFoundPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <SEOHead
        title="Page Not Found — CallMind CRM"
        description="The page you were looking for could not be found."
        noindex
      />
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-6 py-24">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600">
            <Phone size={28} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-600 font-grotesk">Error 404</p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
              This call didn't connect.
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-md mx-auto">
              The page you're looking for doesn't exist or may have moved. Let's get you back on track.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="px-7 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm btn-glow btn-tactile flex items-center gap-2"
            >
              <Home size={16} />
              Back to Home
            </Link>
            <Link
              to="/contact"
              className="px-7 py-3.5 border border-slate-200 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all btn-tactile flex items-center gap-2"
            >
              Contact Support
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="pt-8 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-1.5">
              <Search size={13} /> Popular pages
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {helpfulLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:text-brand-600 hover:border-brand-200 transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
