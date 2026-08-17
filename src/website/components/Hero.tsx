import React, { useState } from 'react';
import { ArrowRight, PhoneCall, Zap, ShieldCheck, CheckCircle2, Phone, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FREE_TRIAL_CONFIG } from '../../config/pricing';

export const Hero = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ingress' | 'calling' | 'crm'>('ingress');

  return (
    <section className="pt-16 pb-20 px-6 md:px-12 bg-white relative border-b border-slate-100">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left: Headline & Core Pitch */}
        <div className="lg:col-span-7 space-y-7">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700 font-sans">
                A Voolabs Product · Telecalling CRM for Indian Sales Teams
              </span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
            Make Every Call Smarter.<br className="hidden md:block" />
            Turn SIM Calls Into{' '}
            <span className="text-brand-600">
              Higher Revenue.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl font-medium leading-relaxed font-sans">
            Auto-capture leads from IndiaMART & Meta Ads in under 2 seconds. Dial with 1 tap from your mobile SIM, log notes directly into your CRM, and monitor call quotas in real-time — with zero audio stored.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button 
              onClick={() => navigate('/signup')}
              className="px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm btn-tactile shadow-md shadow-brand-500/20 font-sans flex items-center gap-2 cursor-pointer"
            >
              Start {FREE_TRIAL_CONFIG.trialDays}-Day Trial ({FREE_TRIAL_CONFIG.includedTelecallers} Seats Included)
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => navigate('/product')}
              className="px-6 py-3.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-sm transition-colors font-sans btn-tactile cursor-pointer"
            >
              Explore Product
            </button>
          </div>

          {/* Trust Metrics */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-slate-900 font-grotesk">100%</div>
              <div className="text-xs font-semibold text-slate-700 font-sans mt-0.5">SIM Privacy</div>
              <div className="text-[11px] text-slate-400 font-sans">Zero Audio Stored</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 font-grotesk">&lt; 2s</div>
              <div className="text-xs font-semibold text-slate-700 font-sans mt-0.5">Lead Ingress</div>
              <div className="text-[11px] text-slate-400 font-sans">IndiaMART & Meta Ads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 font-grotesk">18% GST</div>
              <div className="text-xs font-semibold text-slate-700 font-sans mt-0.5">Tax Compliant</div>
              <div className="text-[11px] text-slate-400 font-sans">ITC Invoices Included</div>
            </div>
          </div>
        </div>

        {/* Right: Authentic Interactive Workstation Console */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5 text-white">
            
            {/* Terminal / App Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="text-[11px] font-mono font-bold text-slate-400 pl-1">CallMind Telecaller Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400">
                ACTIVE
              </span>
            </div>

            {/* Interactive Step Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ingress')}
                className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'ingress'
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Webhook
              </button>
              <button
                onClick={() => setActiveTab('calling')}
                className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'calling'
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. SIM Dial
              </button>
              <button
                onClick={() => setActiveTab('crm')}
                className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'crm'
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. CRM Sync
              </button>
            </div>

            {/* Tab 1: Webhook Ingress */}
            {activeTab === 'ingress' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                    <Zap size={14} /> [WEBHOOK] IndiaMART Buy Lead Received
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">0.8s ago</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Buyer:</span>
                    <span className="font-semibold text-white">Vikram Shinde (Pune, MH)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-semibold text-slate-200">+91 9823X XXXXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requirement:</span>
                    <span className="text-amber-300 font-semibold">Industrial Solar Inverters (50 kW)</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Routing: Round-Robin</span>
                  <span className="text-emerald-400 font-bold">Assigned → Telecaller App</span>
                </div>
              </div>
            )}

            {/* Tab 2: 1-Tap SIM Calling */}
            {activeTab === 'calling' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-sans">
                    <PhoneCall size={14} /> Active SIM Call
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">02:18</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Vikram Shinde</div>
                    <div className="text-[11px] text-slate-400">+91 9823X XXXXX · Connected</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-bold">
                    SIM 1 (Jio 5G)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Direct SIM carrier channel · Zero voice audio stored on servers</span>
                </div>
              </div>
            )}

            {/* Tab 3: CRM Auto Sync */}
            {activeTab === 'crm' && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-400 font-sans">
                    <FileText size={14} /> Call Outcome Synced
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Stage: Hot Lead</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-1.5 text-xs">
                  <div className="text-slate-400 font-semibold">Telecaller Notes:</div>
                  <p className="text-slate-200 italic leading-relaxed">
                    "Client requested quotation for 50 kW on-grid inverter with 18% GST tax invoice. Scheduled callback for tomorrow 11:00 AM."
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Logged by: Rahul S.</span>
                  <span className="text-brand-300 font-semibold">Dashboard Synced</span>
                </div>
              </div>
            )}

            {/* Console Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                PostgreSQL RLS Protected
              </span>
              <span className="font-mono text-[11px] text-slate-400">v1.0 API Ready</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

