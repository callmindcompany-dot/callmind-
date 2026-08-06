import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Clock, ArrowUpRight, Sparkles, X, 
  ChevronRight, AlertCircle, Info, ExternalLink, Calendar
} from 'lucide-react';
import { useTrial } from '../hooks/useTrial';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { trackTrialEvent } from '../utils/trialTracking';
import { useCompany } from '../CompanyContext';

interface UsageMeterProps {
  label: string;
  used: number;
  max: number;
  color: string;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ label, used, max, color }) => {
  const percentage = Math.min(100, (used / max) * 100);
  
  if (used === 0) return null;

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span>{used}/{max}</span>
      </div>
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
};

export const TrialBanner = () => {
  const { trial, isLoading, extendTrial, isExtending } = useTrial();
  const { user, isGodMode } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const dismissedUntil = localStorage.getItem(`trial_banner_dismissed_${user.uid}`);
      if (dismissedUntil) {
        const until = parseInt(dismissedUntil);
        if (Date.now() < until) {
          setIsDismissed(true);
        }
      }
    }
  }, [user?.uid]);

  const { companyId } = useCompany();

  const handleExtend = async () => {
    if (companyId && user?.uid) {
      trackTrialEvent(companyId, user.uid, 'extension_requested');
      try {
        await extendTrial();
        trackTrialEvent(companyId, user.uid, 'extension_granted');
      } catch (err) {
        // Error handled in useTrial toast
      }
    } else {
      await extendTrial();
    }
  };

  if (isGodMode || isLoading || !trial || isDismissed) return null;

  const { daysRemaining, usage, limits } = trial;

  const handleDismiss = () => {
    if (!user?.uid) return;
    
    // Day 1-5: Permanent dismiss (for a long time)
    // Day 6-7: 30 minutes dismiss
    const duration = daysRemaining > 2 ? 30 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
    const until = Date.now() + duration;
    
    localStorage.setItem(`trial_banner_dismissed_${user.uid}`, until.toString());
    setIsDismissed(true);
  };

  let config = {
    badge: { text: 'Trial Active', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Zap },
    message: `Welcome! ${usage?.leadsImported || 0} leads imported · ${usage?.aiDraftsUsed || 0} AI drafts used`,
    cta: null as { label: string; action: () => void; icon: any } | null
  };

  if (daysRemaining <= 1) {
    config = {
      badge: { text: 'Final day!', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle },
      message: 'Your trial ends today. Upgrade or get extension',
      cta: { 
        label: 'Upgrade Now', 
        action: () => navigate('/dashboard/billing'), 
        icon: ArrowUpRight 
      }
    };
  } else if (daysRemaining === 2) {
    config = {
      badge: { text: '2 days left', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: Clock },
      message: 'Upgrade today — get 1 month FREE on annual plan',
      cta: { 
        label: 'View Plans', 
        action: () => navigate('/dashboard/billing'), 
        icon: ChevronRight 
      }
    };
  } else if (daysRemaining <= 4) {
    config = {
      badge: { text: `${daysRemaining} days left`, color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Info },
      message: 'Try AI Lead Scoring — rank leads by conversion probability',
      cta: { 
        label: 'Try AI Scoring', 
        action: () => navigate('/dashboard/ai'), 
        icon: Sparkles 
      }
    };
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden mb-6"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-white p-1 rounded-2xl shadow-xl shadow-slate-200/50 relative group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 pl-6 pr-4">
            <div className="flex items-center gap-4 flex-1">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${config.badge.color}`}>
                <config.badge.icon size={12} fill="currentColor" />
                {config.badge.text}
              </div>
              <p className="text-sm font-bold text-slate-600">
                {config.message}
              </p>
            </div>

            <div className="flex items-center gap-6">
              {usage && limits && (
                <div className="hidden lg:flex items-center gap-6 border-l border-slate-100 pl-6">
                  <UsageMeter label="Leads" used={usage.leadsImported} max={limits.maxLeads} color="bg-blue-500" />
                  <UsageMeter label="AI Drafts" used={usage.aiDraftsUsed} max={limits.maxAIDrafts} color="bg-purple-500" />
                  <UsageMeter label="Seats" used={usage.teamSize} max={limits.maxTeamSeats} color="bg-amber-500" />
                </div>
              )}

              <div className="flex items-center gap-2">
                {daysRemaining <= 1 && (
                  <button 
                    onClick={handleExtend}
                    disabled={isExtending}
                    className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Calendar size={12} />
                    {isExtending ? 'Extending...' : 'Get Extension'}
                  </button>
                )}
                
                {config.cta && (
                  <button 
                    onClick={config.cta.action}
                    className="px-6 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center gap-2 active:scale-95"
                  >
                    {config.cta.label}
                    <config.cta.icon size={12} />
                  </button>
                )}

                <button 
                  onClick={handleDismiss}
                  className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
