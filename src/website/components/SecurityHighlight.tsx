import React from 'react';
import { ShieldCheck, Server, Lock, EarOff } from 'lucide-react';

export const SecurityHighlight = () => {
  return (
    <section className="py-20 px-6 md:px-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          
          <div className="w-full md:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-sm font-bold">
              <ShieldCheck size={16} /> Enterprise Grade Security
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-display leading-tight">
              Your Data Stays Yours. <br/>
              <span className="text-slate-500">Zero Audio Tracking.</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium max-w-lg">
              We respect telecaller privacy and client confidentiality. CallMind tracks call duration and outcomes, but we deliberately DO NOT record audio.
            </p>
            
            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <EarOff size={16} className="text-slate-700" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Zero Audio Storage</h4>
                  <p className="text-sm text-slate-500 font-medium">No voice recordings are ever saved or uploaded to our servers.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <Lock size={16} className="text-slate-700" />
                </div>
                <div>
                  {/* RLS filters rows by policy — it is not encryption. Describing
                      it as "cryptographically isolated" is a claim the system
                      does not make and cannot be defended in a security review. */}
                  <h4 className="font-bold text-slate-900">Row-Level Database Security</h4>
                  <p className="text-sm text-slate-500 font-medium">Every query is scoped to your workspace by PostgreSQL Row Level Security policies, enforced in the database itself.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="w-full md:w-1/2">
            {/* Visual Security Architecture */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-colors"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Server className="text-emerald-500" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">Encrypted Cloud Database</div>
                    <div className="text-xs text-slate-500">Hosted on AWS / Supabase</div>
                  </div>
                  <ShieldCheck className="text-emerald-500" />
                </div>

                <div className="flex justify-center">
                  <div className="h-8 w-px bg-slate-200"></div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Lock className="text-emerald-500" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">End-to-End API Security</div>
                    <div className="text-xs text-slate-500">TLS 1.3 Encryption</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
