import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, CreditCard, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrialUpgradeModal } from './TrialUpgradeModal';

import { useTrial } from '../hooks/useTrial';

export const AccountPausedPage = () => {
  const { signOut } = useAuth();
  const { trial } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();

  const leadsCount = trial?.usage?.leadsImported || 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Pause size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">
          Account <span className="text-amber-600">Paused.</span>
        </h2>
        
        <p className="text-slate-500 font-bold text-sm mb-10 leading-relaxed uppercase tracking-tight">
          Your trial has ended. Your <span className="text-slate-900">{leadsCount} leads</span> and pipeline are safe for <span className="text-slate-900">30 more days</span>.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => setShowUpgrade(true)}
            className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <CreditCard size={18} /> Upgrade to Resume
          </button>

          <a 
            href="mailto:support@callmind.app"
            className="block w-full py-5 bg-white text-slate-400 hover:text-brand-600 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 border border-slate-100"
          >
            <Mail size={16} /> Contact Support
          </a>

          <button 
            onClick={() => signOut()}
            className="w-full py-4 text-slate-300 hover:text-slate-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Sign Out
          </button>
        </div>
      </motion.div>

      {showUpgrade && (
          <div className="fixed inset-0 z-[300]">
              <TrialUpgradeModal />
          </div>
      )}
    </div>
  );
};
