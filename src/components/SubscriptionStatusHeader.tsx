import React, { useState, useEffect } from 'react';
import { Clock, Zap, Sparkles, History, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionStatusHeaderProps {
  isSubscribed?: boolean;
  isExpired?: boolean;
  planName?: string;
  expiryDays?: number;
  onOpenHistory?: () => void;
}

export const SubscriptionStatusHeader: React.FC<SubscriptionStatusHeaderProps> = ({
  isSubscribed = false,
  isExpired = false,
  planName = "Professional Tier",
  expiryDays = 28,
  onOpenHistory,
}) => {
  if (isExpired) {
    return (
      <div className="sticky top-14 md:top-0 z-[60] w-full bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-xl px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-amber-900">
            Free Trial Expired (Read-Only Mode) — Upgrade your subscription to resume adding leads, members, and rules.
          </span>
        </div>
        <button
          onClick={onOpenHistory}
          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 ml-4"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  if (isSubscribed) return null;

  // Live 5-day countdown logic
  const [timeLeft, setTimeLeft] = useState({ d: 4, h: 23, m: 59, s: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        if (prev.d > 0) return { ...prev, d: prev.d - 1, h: 23, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="sticky top-14 md:top-0 z-[60] w-full h-12 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-[0_1px_10px_rgba(0,0,0,0.02)] px-6 flex items-center justify-between"
    >
      <div className="flex items-center gap-6">
        <AnimatePresence mode="wait">
          {isSubscribed ? (
            <motion.div 
              key="subscribed"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                 <Sparkles size={14} className="text-emerald-600 fill-emerald-600/10" />
              </div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.15em] flex items-center gap-2">
                Active Deployment: <span className="text-brand-600">{planName}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-slate-400">Expires in: <span className="text-slate-900">{expiryDays} Days</span></span>
              </span>
            </motion.div>
          ) : (
            <motion.div 
              key="trial"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Zap size={15} className="text-brand-600 fill-brand-600" />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-brand-600/30 blur-sm rounded-full"
                  />
                </div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500 fill-amber-400" />
                  Free Trial: <span className="text-slate-900">2 Users</span> | <span className="text-slate-900">1,000 Leads Limit</span>
                </span>
              </div>
              
              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Ends In</span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-black text-slate-800 tabular-nums">
                  <span>{timeLeft.d}d</span>
                  <span className="text-slate-300">:</span>
                  <span>{timeLeft.h.toString().padStart(2, '0')}h</span>
                  <span className="text-slate-300">:</span>
                  <span>{timeLeft.m.toString().padStart(2, '0')}m</span>
                  <span className="text-slate-300 text-[10px] animate-pulse">:</span>
                  <span className="text-brand-600">{timeLeft.s.toString().padStart(2, '0')}s</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           <ShieldCheck size={12} className="text-emerald-500" />
           Cognitive Verified
        </div>
      </div>
    </motion.div>
  );
};
