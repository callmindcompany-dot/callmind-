import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CheckCircle2, Sparkles, Rocket } from 'lucide-react';
import { useAuth } from '@/AuthContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  limitType: 'leads' | 'ai';
}

export const UpgradeModal = ({ isOpen, onClose, title, description, limitType }: UpgradeModalProps) => {
  const { isSuperFounder, isTester } = useAuth();
  const isWhitelisted = isSuperFounder || isTester;

  React.useEffect(() => {
    if (isWhitelisted && isOpen) {
      onClose();
    }
  }, [isWhitelisted, isOpen, onClose]);

  if (isWhitelisted && isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            {/* Header with Gradient */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white relative overflow-hidden">
              <Zap className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mb-6">
                  <Rocket size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">{title}</h2>
                <p className="text-brand-100 font-medium">{description}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Why Upgrade?</h3>
                <div className="space-y-3">
                  {[
                    'Unlimited Lead Storage & Management',
                    'Advanced Neural Lead Analysis',
                    'Smart Auto-Dialer & Predictive Routing',
                    'Real-time Performance Analytics',
                    'Priority 24/7 Founder Support'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="p-1 bg-green-50 text-green-600 rounded-full">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.location.href = '/dashboard/billing'}
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 group"
                >
                  <Sparkles size={18} className="group-hover:animate-pulse" />
                  Upgrade to Pro
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Maybe Later
                </button>
              </div>
              
              <p className="text-center text-[10px] text-gray-400 font-medium">
                Join 500+ agencies scaling with CallMind Pro.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
