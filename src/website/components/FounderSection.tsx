import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Quote, Award, Building2 } from 'lucide-react';

export const FounderSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-white text-slate-900 relative overflow-hidden font-sans border-b border-slate-100">
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
            <Sparkles size={14} className="text-brand-600" />
            <span>Leadership & Vision</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 font-display leading-[1.12]">
            Meet The Founder Behind{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
              CallMind
            </span>
          </h2>

          <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
            Driven by a passion to solve telecalling inefficiencies for Indian SMEs, sales agencies, and growing enterprises.
          </p>
        </div>

        {/* Founder Card Spotlight */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-8 md:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Founder Image Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group">
              {/* Outer Glow Halo */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-400 to-emerald-400 rounded-3xl blur-md opacity-30 group-hover:opacity-50 transition duration-500" />
              
              <div className="relative w-[280px] sm:w-[320px] h-[360px] sm:h-[400px] rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-xl flex items-center justify-center">
                <img
                  src="/founder.png"
                  alt="Vrushabh Shinde - Founder & CEO of CallMind"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top transform group-hover:scale-105 transition duration-500"
                />
                
                {/* Gradient Overlay at Bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                
                {/* Floating Badge */}
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 flex items-center justify-between shadow-md">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-display">Vrushabh Shinde</h4>
                    <p className="text-[11px] text-brand-600 font-semibold">Founder & CEO, CallMind</p>
                  </div>
                  <ShieldCheck size={20} className="text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Founder Details & Message */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Founder's Message
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display">
                Building The Future of SME Telecalling in India
              </h3>
            </div>

            <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <Quote size={28} className="text-brand-500/15 absolute -top-3 -left-2 rotate-180" />
              <p className="text-slate-700 text-sm md:text-base leading-relaxed italic font-medium pl-4">
                "Our vision at CallMind is to liberate sales teams from manual data entry. By turning every mobile SIM call into structured CRM intelligence and automating lead capture from all your marketing channels, we give growing businesses the power to close deals faster."
              </p>
              <p className="text-xs font-bold text-brand-600 text-right pr-2">
                — Vrushabh Shinde, Founder & CEO
              </p>
            </div>

            {/* Factual Highlights List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-bold text-slate-900 font-display flex items-center gap-1.5">
                  <Building2 size={14} className="text-brand-600" /> Voolabs Innovation Product
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Architected in Pune, Nashik, Satara, Maharashtra for pan-India sales teams.</p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
                <p className="text-xs font-bold text-slate-900 font-display flex items-center gap-1.5">
                  <Award size={14} className="text-emerald-600" /> Customer First Commitment
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Zero call recordings stored, 100% tax compliant GST billing.</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
