import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, PhoneCall, Layers, FileText, Users, ArrowRight, CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WebAppShowcase } from '../components/WebAppShowcase';
import { MobileAppShowcase } from '../components/MobileAppShowcase';
import { TechnicalFeatures } from '../components/TechnicalFeatures';
import { SecurityHighlight } from '../components/SecurityHighlight';
import { useNavigate } from 'react-router-dom';

export const ProductPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Concise Header */}
        <section className="pt-16 pb-12 px-6 md:px-12 bg-white border-b border-slate-100 text-center space-y-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Home
          </button>
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              Complete Product Ecosystem
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] font-display max-w-4xl mx-auto">
            Web Admin Dashboard & Mobile Telecaller App
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto font-medium">
            Explore authentic UI screens and core capabilities for business owners, sales managers, and mobile telecallers.
          </p>
        </section>

        {/* 1. Web Admin Dashboard Showcase (Screen 1 = Web Admin Dashboard) */}
        <WebAppShowcase />

        {/* 2. Telecaller Mobile Companion App Showcase (Screen 1 = Mobile Dashboard) */}
        <MobileAppShowcase />

        {/* 3. Technical Architecture */}
        <TechnicalFeatures />

        {/* 4. Security & Isolation */}
        <SecurityHighlight />

        {/* CTA Banner */}
        <section className="py-20 px-6 md:px-12 bg-white font-sans">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-brand-600 to-blue-700 rounded-3xl p-10 text-white text-center space-y-6 shadow-xl">
            <h2 className="text-3xl font-black font-display">Empower Your Sales Team Today</h2>
            <p className="text-white/80 max-w-xl mx-auto text-sm font-medium">
              Start your 7-Day Free Trial. No credit card required. Instant setup for up to 2 telecallers.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-3.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:bg-slate-100 transition-all btn-tactile inline-flex items-center gap-2 shadow-lg cursor-pointer"
            >
              Start Free Trial <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
