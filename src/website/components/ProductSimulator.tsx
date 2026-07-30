import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, LayoutDashboard, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const ProductSimulator = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-white relative overflow-hidden border-t border-slate-100">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50/50 -skew-x-12 transform origin-top-right z-0"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-50 rounded-full blur-[100px] opacity-60 z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-bold mb-2">
            <Zap size={16} className="fill-brand-500" /> Live Demo Simulation
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display">
            See how leads flow <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">instantly.</span>
          </h2>
          <p className="text-lg text-slate-500 font-medium font-sans">
            No fake promises. Watch how an IndiaMART inquiry reaches your telecaller's phone in under 3 seconds.
          </p>
        </div>

        {/* Simulator Area */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-center">
            
            {/* Step 1: Lead Source */}
            <div className="relative">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                    <Zap size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">New Lead Capture</h4>
                    <p className="text-slate-400 text-xs">API Webhook</p>
                  </div>
                </div>
                
                <motion.div 
                  className="bg-white rounded-2xl p-4 shadow-lg space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500">GLUSR Payload</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">200 OK</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Rohan Sharma</div>
                    <div className="text-slate-500 text-xs mt-0.5">Looking for CRM Software</div>
                    <div className="text-brand-600 text-xs font-medium mt-1">+91 98XXX XXXXX</div>
                  </div>
                </motion.div>
              </div>

              {/* Connecting Arrow */}
              <div className="hidden lg:flex absolute top-1/2 -right-12 text-slate-600 -translate-y-1/2">
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowRight size={24} />
                </motion.div>
              </div>
            </div>

            {/* Step 2: Mobile App */}
            <div className="relative">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center">
                <div className="flex items-center gap-3 mb-6 w-full">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                    <Smartphone size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Telecaller App</h4>
                    <p className="text-slate-400 text-xs">Push Notification</p>
                  </div>
                </div>
                
                {/* Phone Mockup */}
                <motion.div 
                  className="w-56 h-[400px] bg-slate-950 rounded-[2.5rem] border-4 border-slate-800 p-3 shadow-2xl relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-xl z-20"></div>
                  
                  <div className="w-full h-full bg-white rounded-3xl overflow-hidden flex flex-col relative">
                    <div className="bg-brand-600 pt-8 pb-4 px-4 text-white">
                      <div className="text-xs font-medium opacity-80">Active Leads</div>
                      <div className="font-bold text-lg">CallMind App</div>
                    </div>
                    
                    <div className="p-3">
                      <motion.div 
                        className="bg-white border border-brand-100 shadow-sm rounded-xl p-3 relative overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        viewport={{ once: true }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">NEW</span>
                          <span className="text-[10px] text-slate-400">Just now</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">Rohan Sharma</div>
                        <button className="mt-3 w-full bg-brand-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-brand-700 transition-colors">
                           Dial Now
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Connecting Arrow */}
              <div className="hidden lg:flex absolute top-1/2 -right-12 text-slate-600 -translate-y-1/2">
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                >
                  <ArrowRight size={24} />
                </motion.div>
              </div>
            </div>

            {/* Step 3: Admin Dashboard */}
            <div className="relative">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                    <LayoutDashboard size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Admin CRM</h4>
                    <p className="text-slate-400 text-xs">Live Sync</p>
                  </div>
                </div>
                
                <motion.div 
                  className="bg-white rounded-xl overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                  viewport={{ once: true }}
                >
                  <div className="bg-slate-50 border-b border-slate-100 p-2 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="p-4 bg-slate-100/50">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="h-12 bg-white rounded-lg border border-slate-100 p-2">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Total Leads</div>
                        <div className="text-sm font-black text-slate-800 mt-1">1,402</div>
                      </div>
                      <div className="h-12 bg-white rounded-lg border border-slate-100 p-2">
                         <div className="text-[9px] text-slate-400 font-bold uppercase">Called</div>
                         <div className="text-sm font-black text-emerald-600 mt-1">84%</div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                       <div className="flex items-center gap-2 mb-2">
                         <CheckCircle2 size={12} className="text-emerald-500" />
                         <span className="text-xs font-bold text-slate-700">Recent Activity</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-t border-slate-50">
                         <div>
                           <div className="text-xs font-bold text-slate-900">Rohan Sharma</div>
                           <div className="text-[10px] text-slate-500">Called by Agent 1</div>
                         </div>
                         <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">Follow Up</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
