import React from 'react';
import { motion } from 'framer-motion';
import { Users, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTrial } from '../hooks/useTrial';

export const TrialProgressBar = () => {
  const { trialDaysRemaining, profile, isGodMode } = useAuth();
  if (isGodMode || (profile?.plan !== 'trial' && profile?.role !== 'tester')) return null;

  const totalDays = 7;
  const day = Math.max(1, totalDays - (trialDaysRemaining || 0));
  const percentage = (day / totalDays) * 100;

  const getColor = () => {
    if (trialDaysRemaining >= 4) return 'bg-emerald-500';
    if (trialDaysRemaining >= 2) return 'bg-amber-500';
    if (trialDaysRemaining === 1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const colorClass = getColor();

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trial Progress</span>
        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Day {day} of {totalDays}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${colorClass} rounded-full`}
        />
      </div>
    </div>
  );
};

export const TrialUsageSummary = () => {
  const { trial, isLoading } = useTrial();
  const { profile, isGodMode } = useAuth();

  if (isGodMode || (profile?.plan !== 'trial' && profile?.role !== 'tester')) return null;
  if (isLoading || !trial || !trial.usage || !trial.limits) return null;

  const { usage, limits } = trial;

  const stats = [
    { label: 'Leads', used: usage.leadsImported, max: limits.maxLeads, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'AI Drafts', used: usage.aiDraftsUsed, max: limits.maxAIDrafts, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Team', used: usage.teamSize, max: limits.maxTeamSeats, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl shadow-slate-200/50">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Trial Usage</h3>
      <div className="space-y-6">
        {stats.map((stat, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon size={14} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
              </div>
              <span className="text-[10px] font-black text-slate-900">
                {stat.used} / {stat.max}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stat.used / stat.max) * 100}%` }}
                className={`h-full ${stat.color.replace('text', 'bg')} rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-slate-50">
        <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
          Upgrade to unlock unlimited capacity and advanced features.
        </p>
      </div>
    </div>
  );
};
