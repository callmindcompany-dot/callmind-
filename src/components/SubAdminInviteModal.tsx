import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Shield, Users, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SubAdminInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  unallocatedSeats: number;
  allowedSubAdminsRemaining: number;
  onSendInvite: (email: string, quota: number) => Promise<void>;
}

export const SubAdminInviteModal: React.FC<SubAdminInviteModalProps> = ({
  isOpen,
  onClose,
  unallocatedSeats,
  allowedSubAdminsRemaining,
  onSendInvite,
}) => {
  const [email, setEmail] = useState('');
  const [quota, setQuota] = useState(Math.min(25, Math.max(1, unallocatedSeats)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (quota < 1 || quota > unallocatedSeats) {
      toast.error(`Quota must be between 1 and ${unallocatedSeats} seats`);
      return;
    }
    if (allowedSubAdminsRemaining <= 0) {
      toast.error('Sub-Admin capacity limit reached for your current plan. Please upgrade your subscription.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSendInvite(email, quota);
      toast.success(`Sub-Admin invitation sent to ${email} with ${quota} telecaller seats!`);
      setEmail('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-slate-100 font-sans z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">Invite Sub-Admin (Co-Manager)</h3>
                <p className="text-xs text-slate-400 font-medium">Delegate telecaller quota & operational management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sub-Admin Email Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Sub-Admin Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-medium transition-all"
                />
              </div>
            </div>

            {/* Quota Slider & Selector */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-brand-600" />
                  Telecaller Seat Quota
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-brand-600 text-white font-grotesk text-xs">
                  {quota} Seats Allocated
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={Math.max(1, unallocatedSeats)}
                value={quota}
                onChange={(e) => setQuota(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />

              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>1 Seat</span>
                <span>Available Unallocated: {unallocatedSeats} Seats</span>
              </div>
            </div>

            {/* Co-Admin Powers Notice */}
            <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-2xl text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-brand-900 flex items-center gap-1.5">
                <Shield size={14} className="text-brand-600" />
                Co-Admin Manager Powers:
              </p>
              <ul className="space-y-1 list-disc ml-5 text-slate-600">
                <li>Full control over their assigned {quota} telecaller seats</li>
                <li>Can bulk import CSV leads and distribute to their callers</li>
                <li>Can download Excel/CSV reports for their team's calls</li>
                <li><strong>Strictly Restricted:</strong> Cannot access billing, GST invoices, or master API keys</li>
              </ul>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all btn-tactile"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || allowedSubAdminsRemaining <= 0}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl btn-glow btn-tactile disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Sending...' : 'Send Sub-Admin Invite'}
                <CheckCircle2 size={15} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
