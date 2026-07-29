import React from 'react';

export const EnterpriseMission = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-slate-950 text-white relative overflow-hidden">
      {/* Enterprise Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display mb-10 leading-tight">
          Built for Scale.<br />
          <span className="text-slate-400">Designed for Productivity.</span>
        </h2>
        
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-3xl text-left shadow-2xl">
          <div className="space-y-6 text-lg md:text-xl text-slate-300 font-medium leading-relaxed">
            <p>
              Leading sales teams require a system that eliminates operational friction. Downloading CSVs, distributing leads via spreadsheets, and maintaining expensive cloud telephony infrastructure is no longer viable.
            </p>
            <p className="text-white font-bold">
              CallMind centralizes lead ingestion and decentralizes telecalling execution.
            </p>
            <p>
              By routing leads instantly from your sources directly to the agent's mobile device, we bypass hardware limitations. Agents tap to dial using their native SIM, while enterprise administrators gain real-time, tamper-proof visibility into pipeline progression.
            </p>
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-black text-white font-display mb-1">99.9%</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Uptime SLA</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-display mb-1">&lt;3s</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lead Routing</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-display mb-1">256-bit</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Encryption</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-display mb-1">0 GB</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Audio Stored</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
