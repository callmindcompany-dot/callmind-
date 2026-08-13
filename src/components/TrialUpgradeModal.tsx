import React, { useState, useEffect } from 'react';
import { PRICING_PLANS, PURCHASABLE_PLAN_IDS } from '@/config/pricing';
import { describePlan } from '@/website/data/planCopy';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Hourglass, Check, Zap, Sparkles, Phone, ShieldCheck, 
  CheckCircle2, Users, ArrowRight, Minus, Plus, CreditCard
} from 'lucide-react';
import { useTrial } from '../hooks/useTrial';
import { useAuth } from '../AuthContext';
import { useCompany } from '../CompanyContext';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment } from '../hooks/useBilling';
import { toast } from 'react-hot-toast';

interface PlanCardProps {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxSeats: number;
  features: string[];
  isRecommended?: boolean;
  onSelect: (id: string, maxSeats: number) => void;
  isSelected: boolean;
  billingCycle: 'monthly' | 'annual';
}

import { trackTrialEvent } from '../utils/trialTracking';

const PlanCard: React.FC<PlanCardProps> = ({ 
  id, name, monthlyPrice, annualPrice, maxSeats, features, isRecommended, onSelect, isSelected, billingCycle 
}) => {
  const currentPrice = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const savings = monthlyPrice - annualPrice;

  return (
    <div 
      onClick={() => onSelect(id, maxSeats)}
      className={`relative cursor-pointer group transition-all duration-300 ${isSelected ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}`}
    >
      {isRecommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest shadow-xl shadow-brand-500/20 z-20">
          {/* Was "MOST POPULAR". The prop is already called isRecommended;
              the label now matches it, and matches the fact that no plan has
              been bought yet. */}
          RECOMMENDED
        </div>
      )}
      
      <div className={`h-full bg-white/90 backdrop-blur-xl border-2 rounded-[32px] p-8 flex flex-col gap-6 transition-all ${isSelected ? 'border-brand-500 shadow-2xl shadow-brand-500/10' : 'border-slate-100 hover:border-slate-200'}`}>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900">₹{currentPrice}</span>
            <span className="text-sm font-bold text-slate-400">/seat/mo</span>
          </div>
          {billingCycle === 'annual' && savings > 0 && (
            <div className="inline-block bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-md">
              SAVE ₹{savings} /MO
            </div>
          )}
        </div>

        <div className="space-y-4 flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Includes</p>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 p-0.5 rounded-full ${isSelected ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Check size={12} />
                </div>
                <span className="text-xs font-bold text-slate-600 leading-snug">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <div className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all text-center ${isSelected ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'}`}>
            {isSelected ? 'Selected' : `Choose ${name}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TrialUpgradeModal = () => {
  const { trial, upgradeTrial, isUpgrading } = useTrial();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const createOrderMutation = useCreateRazorpayOrder();
  const verifyPaymentMutation = useVerifyRazorpayPayment();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [seats, setSeats] = useState(5);

  // These were hardcoded at 399/299, 699/549 and 999/799 -- none of which
  // matched src/config/pricing.ts, so a trial user about to convert was quoted
  // one price and charged another. Derived from the config now, like every
  // other price in the product.
  const plans = PURCHASABLE_PLAN_IDS.map((id) => {
    const plan = PRICING_PLANS[id];
    return {
      id,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      maxSeats: plan.maxSeats,
      isRecommended: Boolean(plan.highlight),
      features: describePlan(plan).slice(0, 5),
    };
  });

  useEffect(() => {
    if (trial) {
      const { daysRemaining } = trial;
      const userId = user?.uid;
      if (!userId) return;

      const today = new Date().toISOString().split('T')[0];
      const lastShown = localStorage.getItem(`trial_upgrade_modal_shown_${userId}`);

      // Day 7 (Final day): Re-show every 30 minutes
      if (daysRemaining <= 1) {
        const lastDismissed = localStorage.getItem(`trial_upgrade_modal_dismissed_time_${userId}`);
        if (lastDismissed) {
          const timeSinceDismissed = Date.now() - parseInt(lastDismissed);
          if (timeSinceDismissed > 30 * 60 * 1000) {
            setIsOpen(true);
          }
        } else {
          setIsOpen(true);
        }
      } 
      // Day 6: Show once per day
      else if (daysRemaining <= 2) {
        if (lastShown !== today) {
          setIsOpen(true);
          localStorage.setItem(`trial_upgrade_modal_shown_${userId}`, today);
        }
      }
    }
  }, [trial, user?.uid]);

  useEffect(() => {
    if (isOpen && companyId && user?.uid) {
      trackTrialEvent(companyId, user.uid, 'upgrade_modal_shown');
    }
  }, [isOpen, companyId, user?.uid]);

  // Every plan starts at one seat now, so choosing a plan no longer forces a
  // seat count up. It can only pull it down to the plan's ceiling.
  const handlePlanSelect = (id: string, maxSeats: number) => {
    setSelectedPlan(id);
    if (seats > maxSeats) setSeats(maxSeats);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (user?.uid) {
      localStorage.setItem(`trial_upgrade_modal_dismissed_time_${user.uid}`, Date.now().toString());
    }
  };

  const handleRemindTomorrow = () => {
    handleClose();
    // In a real app, this might set a specific timestamp 24h from now
  };

  const currentPlan = plans.find(p => p.id === selectedPlan)!;
  const currentPrice = billingCycle === 'annual' ? currentPlan.annualPrice : currentPlan.monthlyPrice;
  const totalPrice = currentPrice * seats;

  const handleUpgrade = async () => {
    if (!companyId || !user?.uid) return;
    
    trackTrialEvent(companyId, user.uid, 'upgrade_clicked', { plan: selectedPlan, seats, billing: billingCycle });
    setIsProcessingPayment(true);

    try {
      // 1. Create Razorpay order via API
      const orderRes = await createOrderMutation.mutateAsync({
        amount: totalPrice,
        companyId,
        planId: selectedPlan,
        seats,
        durationMonths: billingCycle === 'annual' ? 12 : 1
      });

      // 2. Fallback to intent if window.Razorpay script not loaded or zero amount
      if (totalPrice === 0 || !window.Razorpay) {
        upgradeTrial({
          plan: selectedPlan,
          seats,
          billing: billingCycle
        });
        setIsProcessingPayment(false);
        setIsOpen(false);
        return;
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'CallMind CRM',
        description: `Trial Upgrade: ${selectedPlan.toUpperCase()} (${seats} Seats)`,
        order_id: orderRes.orderId,
        prefill: {
          name: user.displayName || user.email?.split('@')[0] || 'Subscriber',
          email: user.email || '',
        },
        notes: {
          companyId,
          planId: selectedPlan,
          seats: String(seats)
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async (response: any) => {
          try {
            toast.loading('Verifying payment signature...', { id: 'trial-rzp-verify' });
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              companyId,
              planId: selectedPlan,
              seats,
              amount: totalPrice,
              durationMonths: billingCycle === 'annual' ? 12 : 1
            });
            toast.dismiss('trial-rzp-verify');
            setIsOpen(false);
          } catch (err: any) {
            toast.dismiss('trial-rzp-verify');
            toast.error(err.message || 'Payment verification failed');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            toast('Payment cancelled', { icon: 'ℹ️' });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      toast.error(err.message || 'Failed to initiate Razorpay payment checkout');
    }
  };

  if (!isOpen || !trial) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl"
          onClick={handleClose}
        />

        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl bg-slate-50/80 backdrop-blur-md rounded-[48px] shadow-2xl border border-white overflow-hidden flex flex-col md:max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 md:p-12 pb-6 flex flex-col items-center text-center relative">
            <button 
              onClick={handleClose}
              className="absolute top-8 right-8 p-3 bg-white/50 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-brand-50/50">
              <Hourglass size={32} />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-3 uppercase">
              Your trial ends in <span className="text-brand-600">{trial.daysRemaining} days</span>
            </h2>
            <p className="text-slate-500 font-bold text-sm mb-10 max-w-md">
              Keep your progress and scale your operations with CallMind Pro. 
              Your data will be safe for 30 days after trial ends.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
              <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={20} /></div>
                <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads</p><p className="text-lg font-black text-slate-900 leading-none">{trial.usage?.leadsImported || 0}</p></div>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Phone size={20} /></div>
                <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calls</p><p className="text-lg font-black text-slate-900 leading-none">{trial.usage?.callsLogged || 0}</p></div>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Sparkles size={20} /></div>
                <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Drafts</p><p className="text-lg font-black text-slate-900 leading-none">{trial.usage?.aiDraftsUsed || 0}</p></div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 md:px-12 pb-12">
            {/* Pricing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-xs font-black uppercase tracking-widest ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button 
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
                className="w-14 h-7 bg-slate-200 rounded-full p-1 relative transition-colors duration-300"
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${billingCycle === 'annual' ? 'translate-x-[28px]' : 'translate-x-0'}`} />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-widest ${billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-400'}`}>Annual</span>
                <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">SAVE 25%</div>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {plans.map(plan => (
                <PlanCard 
                  key={plan.id}
                  {...plan}
                  isSelected={selectedPlan === plan.id}
                  onSelect={handlePlanSelect}
                  billingCycle={billingCycle}
                />
              ))}
            </div>

            {/* Seat Selector */}
            <div className="bg-white/40 border border-white p-8 rounded-[32px] mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Select Team Size</h4>
                  <p className="text-xs font-bold text-slate-400">{currentPlan.name} covers up to {currentPlan.maxSeats} seats. Start with as few as 1.</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSeats(Math.max(1, seats - 1))}
                      className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                      disabled={seats <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-black text-slate-900 min-w-[2ch] text-center">{seats}</span>
                    <button 
                      onClick={() => setSeats(Math.min(currentPlan.maxSeats, seats + 1))}
                      className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                      disabled={seats >= currentPlan.maxSeats}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost</p>
                    <p className="text-2xl font-black text-brand-600">₹{totalPrice.toLocaleString()}<span className="text-xs text-slate-400">/mo</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={handleUpgrade}
                disabled={isProcessingPayment || isUpgrading}
                className="w-full max-w-md py-5 bg-brand-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-brand-500/30 hover:bg-brand-700 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 btn-tactile btn-glow"
              >
                {isProcessingPayment || isUpgrading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                {isProcessingPayment ? 'Processing Payment...' : `Pay via Razorpay — ₹${totalPrice.toLocaleString()}/mo`}
              </button>

              <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Secure Payment</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Cancel Anytime</div>
                <div className="flex items-center gap-2 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors" onClick={handleRemindTomorrow}>Remind me tomorrow</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
