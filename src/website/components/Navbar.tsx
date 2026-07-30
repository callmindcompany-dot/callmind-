import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Menu, X, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Platform', path: '/platform' },
  { name: 'Product', path: '/product' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'Company', path: '/company' },
  { name: 'Contact', path: '/contact' },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Links navigate via react-router's <Link> (which renders a real, crawlable
  // <a href>). This only handles the side effects that used to live in the
  // old onClick handler: scroll to top and close the mobile drawer.
  const afterNav = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200/80 bg-white/90 backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">

        {/* Brand Logo */}
        <Link
          to="/"
          onClick={afterNav}
          className="flex items-center gap-3 cursor-pointer group"
          aria-label="CallMind home"
        >
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Phone size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tight font-display leading-tight">
              CallMind<span className="text-brand-600">.</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
              by Voolabs
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items — Center Aligned */}
        <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={afterNav}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-brand-600 bg-brand-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 text-slate-600 text-sm font-semibold rounded-xl hover:text-brand-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl btn-glow btn-tactile flex items-center gap-2 cursor-pointer"
          >
            Start Free Trial
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:hidden absolute top-full left-4 right-4 bg-white/98 backdrop-blur-2xl rounded-2xl p-5 border border-slate-200 shadow-2xl mt-2 z-50"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={afterNav}
                className={`text-sm font-semibold text-left py-3 px-4 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <hr className="my-3 border-slate-100" />

          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl text-center"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-brand-600 text-white text-sm font-bold rounded-xl btn-glow flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
};
