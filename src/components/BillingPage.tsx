import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus,
  Zap,
  Rocket,
  MessageCircle,
  PhoneCall,
  Search,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Users,
  History,
  LockKeyhole,
  Gem,
  CheckCircle2,
  Box,
  Settings2,
  Calendar,
  FileText,
  ShoppingBag,
  Headphones,
  ChevronUp,
  ChevronDown,
  XCircle,
  AlertCircle,
  X,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { SeatBlockedBanner } from './SeatBlockedBanner';
import { toast } from 'react-hot-toast';
import { 
  useSubscription, 
  useInvoices, 
  useRegisterUpgradeIntent,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment 
} from '@/hooks/useBilling';
import { useTeamMembers } from '@/hooks/useTeam';
import { PRICING_PLANS, PURCHASABLE_PLAN_IDS, GST_RATE, ALLOWED_TERM_MONTHS } from '@/config/pricing';
import { describePlan } from '@/website/data/planCopy';

// --- STYLED ODOMETER COMPONENT ---
// ... (rest remains unchanged)


// --- STYLED ODOMETER COMPONENT ---
const Digit: React.FC<{ value: string; index: number }> = ({ value, index }) => (
  <div className="relative overflow-hidden h-[1.1em] w-[0.6em] inline-flex items-center justify-center">
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 30,
          delay: index * 0.015
        }}
        className="absolute"
      >
        {value}
      </motion.span>
    </AnimatePresence>
    <span className="invisible">{value}</span>
  </div>
);

const RollingPrice = ({ value }: { value: number }) => {
  const formattedValue = Math.round(value).toLocaleString('en-IN');
  return (
    <span className="inline-flex items-baseline overflow-hidden">
      {formattedValue.split("").map((char, i) => (
        char === "," || char === "." ? (
          <span key={`char-${i}`} className="mx-px text-inherit">{char}</span>
        ) : (
          <Digit key={`digit-${i}-${char}`} value={char} index={i} />
        )
      ))}
    </span>
  );
};

// --- DYNAMIC STATUS RIBBON ---
const DynamicStatusRibbon = ({ 
  isTrial, 
  planName, 
  usedSeats, 
  seatLimit, 
  trialDaysRemaining,
  onOpenHistory
}: { 
  isTrial: boolean; 
  planName?: string; 
  usedSeats: number; 
  seatLimit: number;
  trialDaysRemaining?: number;
  onOpenHistory: () => void;
}) => {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-[100] w-full border-b border-slate-100 bg-white/70 backdrop-blur-xl"
    >
      <div className="max-w-[1400px] mx-auto px-10 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {isTrial ? (
            <div className="flex items-center gap-3">
              <span className="text-blue-600">🚀</span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 font-sans">
                Exclusive Trial Access: <span className="text-blue-600 font-bold ml-1">{usedSeats} / {seatLimit} Seats Occupied</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>✨</span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 font-sans">
                Active Plan: <span className="text-blue-600">{planName || 'Professional'} Tier</span> 
                <span className="mx-4 opacity-20">|</span> 
                Allocation: <span className="text-slate-600 font-bold">{usedSeats} / {seatLimit} Seats Occupied</span>
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-12">
          {isTrial && typeof trialDaysRemaining === 'number' && (
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-sans">Time Remaining:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse font-sans">
                  {Math.max(0, Math.ceil(trialDaysRemaining))} Days
                </span>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => {
              const el = document.getElementById('billing-history-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-3 text-slate-500 hover:text-blue-600 transition-all group cursor-pointer"
          >
            <History size={16} strokeWidth={1.5} className="group-hover:rotate-[-10deg] transition-transform text-slate-400 group-hover:text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] hidden md:block border-b border-transparent group-hover:border-blue-200 pb-0.5 font-sans">Invoices & Logs</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- PREMIUM MONTH STEPPER ---
const MonthStepper = ({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: number[] }) => {
  const selectedIndex = options.indexOf(value);
  
  return (
    <div className="flex items-center gap-3">
      {/* LARGE WHITE ROUNDED INPUT BOX */}
      <div className="flex-1 flex items-center justify-center bg-white border border-blue-50 rounded-lg h-[72px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus-within:border-blue-600/20 transition-all">
         <span className="text-[15px] font-black uppercase tracking-[0.3em] text-slate-700 select-none">
            {value === 12 ? '12 MONTHS' : `${value} ${value === 1 ? 'MONTH' : 'MONTHS'}`}
         </span>
      </div>
      
      {/* ARROWS ON THE RIGHT SIDE - STACKED OUTSIDE THE INPUT TEXT AREA */}
      <div className="flex flex-col gap-2">
         <button 
            onClick={() => onChange(options[Math.max(0, selectedIndex - 1)])}
            className="w-8 h-8 rounded-md bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95"
            aria-label="Increase month"
         >
            <ChevronUp size={16} strokeWidth={3} />
         </button>
         <button 
            onClick={() => onChange(options[Math.min(options.length - 1, selectedIndex + 1)])}
            className="w-8 h-8 rounded-md bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95"
            aria-label="Decrease month"
         >
            <ChevronDown size={16} strokeWidth={3} />
         </button>
      </div>
    </div>
  );
};

const PlanCard = ({ plan, isSelected, onSelect }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative h-[680px] w-full perspective-2000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full h-full preserve-3d"
      >
        {/* FRONT SURFACE: Elite White Design */}
        <div 
          onClick={() => onSelect(plan.id)}
          className={`absolute inset-0 backface-hidden p-12 rounded-[24px] border border-slate-100 flex flex-col transition-all duration-500 cursor-pointer bg-white overflow-hidden ${
            isSelected 
              ? 'shadow-[0_40px_100px_-20px_rgba(0,82,255,0.08)] ring-1 ring-blue-600/10' 
              : 'shadow-[0_20px_40px_rgba(0,0,0,0.02)] hover:border-blue-200 hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.05)]'
          }`}
        >
          {plan.popular && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-10 py-3 rounded-bl-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl z-20">
              Elite Tier
            </div>
          )}

          <div className="absolute top-0 left-0 opacity-10 blur-[100px] w-64 h-64 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10 pt-4">
             <div className="relative">
                {/* 3D-STYLE ICON CONTAINER */}
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-50 flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.03)] relative z-10 group overflow-hidden">
                   <plan.icon size={40} strokeWidth={1} className="text-[#0052FF] relative z-10" />
                   <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-transparent opacity-50" />
                </div>
             </div>
             
             {isSelected && (
               <div className="bg-[#0052FF] text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-blue-600/20">
                 <CheckCircle2 size={12} className="fill-white text-[#0052FF]" />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Active Plan</span>
               </div>
             )}
          </div>

          <div className="relative z-10">
            <h3 className="text-[26px] font-black text-slate-900 mb-2 uppercase tracking-tighter leading-none">{plan.title}</h3>
            <p className="text-[11px] font-medium text-slate-400 mb-10 leading-relaxed">
              {plan.tagline}
            </p>
          </div>

          <div className="flex flex-col items-start mb-6 pb-6 border-b border-slate-50">
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] font-black text-slate-900 leading-none">₹</span>
              <span className="text-7xl font-black text-slate-900 tracking-tighter leading-none">
                <RollingPrice value={plan.price} />
              </span>
              <span className="text-[12px] font-black text-slate-400 uppercase tracking-tighter ml-2">/user/mo</span>
            </div>
          </div>

          <div className="space-y-6 flex-1 px-4 mb-8">
            {plan.highlights.map((h: string, i: number) => (
              <div key={i} className="flex items-center gap-6">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                   {i === 0 ? <Users size={16} /> : i === 1 ? <ShieldCheck size={16} /> : <Rocket size={16} />}
                </div>
                <span className="text-[13px] font-medium text-slate-600">{h}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <button 
              onClick={() => onSelect(plan.id)}
              className={`w-full py-5 rounded-xl text-[14px] font-black tracking-tight transition-all border-2 ${
                isSelected 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
               {isSelected ? 'Provisioned Tier' : 'Select Core'}
            </button>
          </div>
        </div>

        {/* BACK SURFACE: Pristine Feature Canvas */}
        <div 
          className="absolute inset-0 backface-hidden rotate-y-180 p-10 rounded-[24px] bg-white border border-slate-100 text-slate-900 flex flex-col shadow-[0_60px_100px_-20px_rgba(0,0,0,0.12)] z-30 overflow-hidden"
          style={{ pointerEvents: isFlipped ? 'auto' : 'none' }}
        >
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
            <div>
              <h4 className="text-[14px] font-black uppercase tracking-[0.6em] text-[#0052FF] mb-1">Architecture Matrix</h4>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Next-Gen Cognitive Suite</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50/50 flex items-center justify-center text-[#0052FF] shadow-inner">
               <Gem size={24} strokeWidth={1} />
            </div>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide py-2">
            {plan.features.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-5 group">
                <div className="shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-[#0052FF] transition-colors duration-300">
                  <CheckCircle2 size={12} className="text-[#0052FF] group-hover:text-white transition-colors" />
                </div>
                <p className="text-[13px] font-black text-slate-800 uppercase tracking-tighter leading-tight group-hover:translate-x-1 transition-transform duration-300">
                  {f}
                </p>
              </div>
            ))}
          </div>

          <button 
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`w-full py-5 mt-8 rounded-[20px] text-[11px] font-black uppercase tracking-[0.4em] transition-all bg-[#0052FF] text-white hover:bg-blue-700 shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 shrink-0`}
          >
            Deploy This Architecture
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- CONSTANTS ---
const BASE_PRICES: Record<string, number> = {
  starter: PRICING_PLANS.starter.monthlyPrice,
  growth: PRICING_PLANS.growth.monthlyPrice,
  pro: PRICING_PLANS.pro.monthlyPrice,
};

// The add-on marketplace was removed.
//
// It listed eight paid add-ons. None of them granted anything: the selection
// was written to billing_intents.addons and never read again, so the money was
// charged and no capability changed. Three of them (WhatsApp Business,
// IndiaMart Bridge, Custom API) were already included in the plans that could
// buy them, and four described integrations that do not exist in the codebase.
//
// Everything a customer can buy now lives in src/config/pricing.ts. The only
// planned add-on is extra storage, and it ships when we can measure storage.

export const BillingPage = () => {
  const { user, isGodMode } = useAuth() as any;
  const { companyId } = useCompany();
  const isWhitelisted = isGodMode;

  const subscriptionQuery = useSubscription(companyId);
  const teamMembersQuery = useTeamMembers(companyId);
  const invoicesQuery = useInvoices(companyId);
  const registerIntentMutation = useRegisterUpgradeIntent();
  const createOrderMutation = useCreateRazorpayOrder();
  const verifyPaymentMutation = useVerifyRazorpayPayment();

  const companyData = subscriptionQuery.data;
  const usedSeats = teamMembersQuery.data?.length || 0;
  const isLoading = subscriptionQuery.isLoading || teamMembersQuery.isLoading;

  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [seats, setSeats] = useState(5);
  const [durationMonths, setDurationMonths] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Sync state with company settings once loaded
  useEffect(() => {
    if (companyData) {
      if (companyData.plan) setSelectedPlan(companyData.plan);
      if (companyData.seat_limit) setSeats(companyData.seat_limit);
    }
  }, [companyData]);

  useEffect(() => {
    const cap = (PRICING_PLANS[selectedPlan] || PRICING_PLANS.growth).maxSeats;
    if (seats > cap) setSeats(cap);
  }, [selectedPlan, seats]);

  const seatLimit = useMemo(() => {
    if (companyData?.seat_limit) return companyData.seat_limit;
    const plan = companyData?.plan || 'trial';
    if (plan === 'pro') return PRICING_PLANS.pro.maxSeats;
    if (plan === 'growth') return PRICING_PLANS.growth.maxSeats;
    if (plan === 'starter') return PRICING_PLANS.starter.maxSeats;
    return 3; // Trial default
  }, [companyData]);

  const trialDaysRemaining = useMemo(() => {
    if (!companyData?.created_at) return 0;
    const created = new Date(companyData.created_at);
    const diff = Date.now() - created.getTime();
    const days = 14 - (diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, [companyData]);

  const handleRazorpayCheckout = async () => {
    if (!user?.uid || !companyId) {
      toast.error('Please log in to upgrade your subscription');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Create Order via Backend API
      const orderRes = await createOrderMutation.mutateAsync({
        amount: totals.grandTotal,
        companyId,
        planId: selectedPlan,
        seats,
        durationMonths
      });

      // 2. Fallback to Intent if script/key unavailable or zero amount
      if (totals.grandTotal === 0 || !window.Razorpay) {
        await registerIntentMutation.mutateAsync({
          user_id: user.uid,
          user_email: user.email || '',
          company_id: companyId,
          plan_id: selectedPlan,
          seats,
          duration_months: durationMonths,
          addons: [],
          total_amount: totals.grandTotal
        });
        toast.success('Upgrade registered! Our team will contact you.', { icon: '💎' });
        setIsProcessingPayment(false);
        return;
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'CallMind CRM',
        description: `${selectedPlan.toUpperCase()} Plan (${seats} Seats)`,
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
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI (No Extra Charges)',
                instruments: [
                  {
                    method: 'upi'
                  }
                ]
              },
              other: {
                name: 'Other Payment Methods',
                instruments: [
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  }
                ]
              }
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response: any) => {
          try {
            toast.loading('Verifying payment signature...', { id: 'razorpay-verify' });
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              companyId,
              planId: selectedPlan,
              seats,
              amount: totals.grandTotal,
              durationMonths
            });
            toast.dismiss('razorpay-verify');
          } catch (verifyErr: any) {
            toast.dismiss('razorpay-verify');
            toast.error(verifyErr.message || 'Payment verification failed');
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

  const handleDownloadTaxInvoice = (paymentId?: string, customAmount?: number, customPlan?: string) => {
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const total = customAmount || totals.grandTotal;
    const base = Math.round(total / 1.18);
    const gst = total - base;
    const planName = (customPlan || selectedPlan).toUpperCase();

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CallMind Tax Invoice ${invoiceNum}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
          .invoice-box { max-width: 800px; margin: auto; padding: 36px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 24px; }
          .brand { font-size: 28px; font-weight: 900; color: #2563eb; letter-spacing: -1px; }
          .title { font-size: 18px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
          .details { margin: 30px 0; display: flex; justify-content: space-between; font-size: 14px; leading: 1.6; }
          .table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          .table th, .table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .table th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 800; }
          .total-row { font-weight: 900; font-size: 16px; color: #0f172a; background: #f8fafc; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 20px; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="brand">CALLMIND CRM</div>
            <div class="title">GST TAX INVOICE</div>
          </div>
          <div class="details">
            <div>
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Billed To:</strong><br/>
              <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${companyData?.name || 'Company Workspace'}</span><br/>
              Admin: ${user?.displayName || user?.email}<br/>
              Email: ${user?.email}
            </div>
            <div style="text-align: right;">
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Invoice Details:</strong><br/>
              <strong>Invoice No:</strong> ${invoiceNum}<br/>
              <strong>Date:</strong> ${dateStr}<br/>
              <strong>Payment ID:</strong> ${paymentId || 'PAY-RZP-' + Date.now().toString().slice(-8)}<br/>
              <strong>Status:</strong> <span style="color: #10b981; font-weight: 800;">PAID</span>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Seats</th>
                <th>Subtotal</th>
                <th>GST (18%)</th>
                <th>Total Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CallMind ${planName} Plan (${durationMonths} Months)</td>
                <td>${seats}</td>
                <td>₹${base.toLocaleString('en-IN')}</td>
                <td>₹${gst.toLocaleString('en-IN')}</td>
                <td><strong>₹${total.toLocaleString('en-IN')}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Grand Total (Incl. GST):</td>
                <td style="color: #2563eb;">₹${total.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>CallMind Systems India • Computer Generated GST Tax Invoice • No Physical Signature Required</p>
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(invoiceHtml);
      win.document.close();
    }
  };

  const isSubmittingIntent = registerIntentMutation.isPending;

  // Seat counts, lead caps, stage counts and rule counts were typed by hand
  // here and had already fallen out of step with src/config/pricing.ts. They
  // are derived now, so the billing screen cannot advertise limits the product
  // does not enforce.
  const PLAN_PRESENTATION = {
    starter: { tagline: 'Essential SIM Telecalling', icon: PhoneCall, color: 'text-slate-600' },
    growth:  { tagline: 'Strategic Sales Operations', icon: Rocket, color: 'text-blue-600' },
    pro:     { tagline: 'Sovereign Structural Architecture', icon: Gem, color: 'text-blue-600' },
  } as const;

  const PLANS = PURCHASABLE_PLAN_IDS.map((id) => {
    const plan = PRICING_PLANS[id];
    const copy = describePlan(plan);
    return {
      id,
      title: plan.name.toUpperCase(),
      tagline: PLAN_PRESENTATION[id].tagline,
      price: plan.monthlyPrice,
      icon: PLAN_PRESENTATION[id].icon,
      color: PLAN_PRESENTATION[id].color,
      popular: Boolean(plan.highlight),
      highlights: copy.slice(0, 3),
      features: copy.slice(3, 8),
    };
  });

  const planMaxSeats = (PRICING_PLANS[selectedPlan] || PRICING_PLANS.growth).maxSeats;

  const totals = useMemo(() => {
    const plan = PRICING_PLANS[selectedPlan] || PRICING_PLANS.growth;
    const isYearly = durationMonths === 12;
    const actualMonthlyRate = isYearly ? plan.annualPrice : plan.monthlyPrice;

    // What it would cost at the monthly rate, for showing the annual saving.
    const baseSubtotal = plan.monthlyPrice * seats * durationMonths;
    const subtotal = actualMonthlyRate * seats * durationMonths;
    const discountAmount = baseSubtotal - subtotal;

    // GST was shown on the invoice but never added to the amount charged, so
    // we were collecting the pre-tax figure and owing the tax ourselves. It is
    // part of the total now, and the customer sees it before paying.
    //
    // The 2% "platform fee" that used to be added here is gone; it was never
    // disclosed on the pricing page. It is folded into the plan prices.
    const gstAmount = isWhitelisted ? 0 : Math.round(subtotal * GST_RATE);
    const grandTotal = isWhitelisted ? 0 : subtotal + gstAmount;

    return { baseSubtotal, subtotal, discountAmount, gstAmount, grandTotal, isYearly, isWhitelisted };
  }, [selectedPlan, seats, durationMonths, isWhitelisted]);

  return (
    <div className="w-full text-slate-900 font-sans selection:bg-blue-100 pb-10">
      <DynamicStatusRibbon 
        isTrial={isGodMode ? false : (companyData?.plan || 'trial') === 'trial'}
        planName={isGodMode ? 'Enterprise' : companyData?.plan}
        usedSeats={usedSeats}
        seatLimit={seatLimit}
        trialDaysRemaining={trialDaysRemaining}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* ELITE HEADER ENGINE */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2 shadow-sm">
               <Box className="text-blue-600" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-[#000000] leading-none uppercase">ELITE <span className="text-[#0052FF]">PROVISIONING</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Integrated Dual-Tier Enterprise Architecture</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-12 divide-x divide-slate-100">
            <div className="flex items-center gap-6 pl-12">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-900">
                    <ShieldCheck size={20} strokeWidth={1} />
                 </div>
                 <div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight">99.99%</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Uptime</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-900">
                    <LockKeyhole size={20} strokeWidth={1} />
                 </div>
                 <div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight">ISO 27001</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Certified</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-900">
                    <Headphones size={20} strokeWidth={1} />
                 </div>
                 <div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight">Priority Support</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Dedicated Experts</p>
                 </div>
               </div>
            </div>
            
            <div className="pl-12 flex items-center gap-4">
               <div className="w-11 h-11 rounded-full border border-slate-100 flex items-center justify-center">
                  <CreditCard className="text-slate-900" size={20} strokeWidth={1.5} />
               </div>
               <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Executive Checkout</span>
            </div>
          </div>
        </div>
      </header>


      <div className="max-w-[1500px] mx-auto pt-12 px-4 sm:px-8">
        {/*
          Why they are here, before the plans.

          Somebody on this owner's team tried to join and could not get a seat.
          That is usually the reason a trial turns into a purchase, and it is
          worth naming above the price cards rather than leaving them to work it
          out. No action button -- they are already on the page it would send
          them to.
        */}
        <div className="mb-8 empty:hidden">
          <SeatBlockedBanner companyId={companyId} onChoosePlan={() => {}} hideAction />
        </div>

        {/* MAIN DASHBOARD MATRIX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          
          {/* CORE ARCHITECTURE PLANS */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {PLANS.map(plan => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  isSelected={selectedPlan === plan.id} 
                  onSelect={setSelectedPlan} 
                />
              ))}
            </div>

            {/* PRODUCTIVITY BOOSTERS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShoppingBag size={20} strokeWidth={1.5} />
                   </div>
                   <div>
                      <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Modular Extensions</h2>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Ecosystem Integrations</p>
                   </div>
                </div>
              </div>
              {/* Add-on marketplace removed -- see the note above ADDON_DATA. */}
            </div>
          </div>

          {/* SUBSCRIPTION CONTROLS WIDGET */}
          <div className="lg:col-span-4 bg-white rounded-lg border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-10 flex flex-col h-auto sticky top-32">
              <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0052FF] flex items-center justify-center">
                    <Calendar size={20} strokeWidth={2} />
                  </div>
                  <h2 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900 leading-none">Billing Period</h2>
                </div>
                <Calendar size={16} className="text-slate-300" />
              </div>

              <div className="space-y-12">
                 {/* USER CAPACITY STEPPER */}
                 <div className="space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">User Capacity</p>
                      <Users size={14} className="text-blue-200" />
                    </div>
                   <div className="flex items-center justify-between bg-white border border-slate-100 rounded-[28px] p-5 group hover:border-blue-600 transition-all shadow-sm">
                      <button 
                        onClick={() => setSeats(Math.max(1, seats - 1))} 
                        className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-900 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                      >
                         <Minus size={20} strokeWidth={3} />
                      </button>
                      
                      <div className="flex flex-col items-center">
                         <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{seats}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">Active Users</span>
                      </div>

                      <button 
                        onClick={() => setSeats(Math.min(planMaxSeats, seats + 1))}
                        disabled={seats >= planMaxSeats}
                        
                        className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-900 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                      >
                         <Plus size={20} strokeWidth={3} />
                      </button>
                   </div>
                </div>

                {/* MONTH SELECTOR HUB */}
                <div className="space-y-6">
                   <MonthStepper 
                     value={durationMonths} 
                     onChange={setDurationMonths} 
                     options={[...ALLOWED_TERM_MONTHS]} 
                   />
                   <div className="flex items-center gap-4 p-5 bg-emerald-50 rounded-lg border border-emerald-100/30">
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <Zap size={18} className="text-emerald-500" />
                      </div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.1em] leading-relaxed">
                        {durationMonths === 12 ? '27% ANNUAL REBATE APPLIED' : 'SWITCH TO ANNUAL FOR 27% REBATE'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* BOTTOM SUMMARY DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
           {/* BILLING BREAKDOWN CARD */}
           <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                       <FileText size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                       <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Billing Summary</h2>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time valuation Breakdown</p>
                    </div>
                 </div>
                 <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <History size={14} className="text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Trail Active</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden shadow-inner mb-10">
                 <div className="bg-white p-6 md:p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                       <CreditCard size={14} className="text-[#0052FF]" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Base Subscription</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₹{totals.baseSubtotal.toLocaleString()}</p>
                 </div>

                 <div className="bg-white p-6 md:p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                       <Box size={14} className="text-[#0052FF]" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GST (18%)</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₹{totals.gstAmount.toLocaleString()}</p>
                 </div>

                 <div className="bg-white p-6 md:p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                       <Zap size={14} className="text-emerald-500" />
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Discount Applied</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter tabular-nums">-₹{totals.discountAmount.toLocaleString()}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Plan Summary</p>
                    <div className="h-px bg-slate-100 flex-1 mx-6" />
                 </div>
                 
                 <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                       <Rocket size={14} className="text-[#0052FF]" />
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{(PRICING_PLANS[selectedPlan] || PRICING_PLANS.growth).name} (×{seats})</span>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                       <Calendar size={14} className="text-slate-400" />
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{durationMonths} Month Term</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* TOTAL VALUATION & PAYMENT CARD */}
           <div className="lg:col-span-4 bg-[#0052FF] rounded-[40px] p-10 flex flex-col justify-between relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,82,255,0.4)]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
              
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                    <p className="text-[12px] font-black text-white/50 uppercase tracking-[0.4em]">Final Amount</p>
                    <ShieldCheck size={24} className="text-white/20" />
                 </div>
                 
                 <div className="flex items-baseline gap-4">
                    <span className="text-3xl font-black text-white/40 leading-none">₹</span>
                    <span className="text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-xl">
                       <RollingPrice value={totals.grandTotal} />
                    </span>
                 </div>
              </div>

              <div className="space-y-6 relative z-10 pt-12">
                 <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRazorpayCheckout}
                  disabled={isProcessingPayment || isSubmittingIntent}
                  className="w-full py-7 bg-white text-[#0052FF] rounded-3xl font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 group relative overflow-hidden disabled:opacity-50 btn-tactile btn-glow"
                 >
                    <div className="absolute inset-0 bg-[#0052FF]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex items-center gap-4">
                       {isProcessingPayment || isSubmittingIntent ? (
                         <span className="animate-pulse flex items-center gap-2">
                           <CreditCard size={18} className="animate-spin" /> Processing Payment...
                         </span>
                       ) : (
                         <>
                           <CreditCard size={20} strokeWidth={2.5} />
                           <span>Pay via Razorpay</span>
                         </>
                       )}
                    </div>
                 </motion.button>
                 <p className="text-center text-xs font-bold text-white/90 tracking-wide -mt-2">
                    Pay by UPI — no extra charges.
                 </p>
                 
                 <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Global Server v4 Secured</span>
                    </div>
                    <div className="flex items-center gap-4 opacity-40">
                       <CreditCard size={16} className="text-white bg-white" />
                       <Box size={16} className="text-white bg-white" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
        {/* DEDICATED BILLING HISTORY & GST INVOICES SECTION */}
        <section id="billing-history-section" className="pt-8 pb-12">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 sm:p-10 space-y-8">
            
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                  <History size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase">Billing History & GST Invoices</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Official records of all completed Razorpay subscriptions and 18% GST tax invoices.</p>
                </div>
              </div>

              <button
                onClick={() => handleDownloadTaxInvoice()}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 self-start md:self-auto"
              >
                <Download size={16} />
                <span>Generate Current Tax Invoice</span>
              </button>
            </div>

            {/* Invoices List / Table */}
            {invoicesQuery.isLoading ? (
              <div className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                Loading Billing & Invoice Records...
              </div>
            ) : invoicesQuery.data && invoicesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {invoicesQuery.data.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={22} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">{invoice.invoice_number}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            invoice.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : invoice.status === 'refunded'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500">
                          Billing Period: {new Date(invoice.billing_period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – {new Date(invoice.billing_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      <div className="text-left md:text-right">
                        <p className="text-xl font-black text-slate-900 tracking-tight font-display">₹{invoice.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incl. 18% GST</p>
                      </div>

                      <button 
                        onClick={() => handleDownloadTaxInvoice(invoice.id, invoice.amount, selectedPlan)}
                        className="px-5 py-2.5 bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 transition-all shadow-xs flex items-center gap-2"
                      >
                        <Download size={14} />
                        <span>Tax Invoice PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 px-6 rounded-3xl bg-slate-50 border border-slate-100 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                  <FileText size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">No Previous Transactions Yet</h4>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                    Once you upgrade your subscription via Razorpay, all official B2B 18% GST tax invoices will be archived here for instant PDF download.
                  </p>
                </div>
                <div className="pt-2">
                  <button 
                    onClick={() => handleDownloadTaxInvoice()}
                    className="px-6 py-3 bg-white border border-slate-200 hover:border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    <Download size={14} />
                    <span>Download Preview GST Tax Invoice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Assurance Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/60 flex items-center justify-between gap-4 text-xs font-semibold text-blue-900">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                <span>100% Tax Compliant • Computer Generated GST Tax Invoices • Valid for Corporate Accounting</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600">
                <span>Verified B2B Billing</span>
              </div>
            </div>

          </div>
        </section>

      <style>{`
        .perspective-1000 { perspective: 1000px; } 
        .preserve-3d { transform-style: preserve-3d; } 
        .backface-hidden { backface-visibility: hidden; } 
        .rotate-y-180 { transform: rotateY(180deg); } 
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        @keyframes liquid {
          0% { transform: scale(1) translate(-10%, -10%) rotate(0deg); }
          50% { transform: scale(1.4) translate(15%, 5%) rotate(180deg); }
          100% { transform: scale(1) translate(-10%, -10%) rotate(360deg); }
        }
        @keyframes liquid-slow {
          0% { transform: scale(1.2) translate(10%, 15%) rotate(360deg); }
          50% { transform: scale(1) translate(-5%, -10%) rotate(180deg); }
          100% { transform: scale(1.2) translate(10%, 15%) rotate(0deg); }
        }
        .animate-liquid {
          animation: liquid 6s infinite linear;
        }
        .animate-liquid-slow {
          animation: liquid-slow 10s infinite linear;
        }
        
        .gold-glow {
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.15);
          border-color: rgba(37, 99, 235, 0.3) !important;
          animation: blue-pulse 2.5s infinite ease-in-out;
        }
        
        @keyframes blue-pulse {
          0% { box-shadow: 0 0 10px rgba(37, 99, 235, 0.1); }
          50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.25); }
          100% { box-shadow: 0 0 10px rgba(37, 99, 235, 0.1); }
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default BillingPage;
