import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, ShieldCheck, Mail, Lock, AlertCircle, Edit3, Trash2, ArrowUpRight } from 'lucide-react';
import { SubAdminInviteModal } from './SubAdminInviteModal';
import { PRICING_PLANS } from '../config/pricing';
import { toast } from 'react-hot-toast';

interface SubAdminUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending';
  quota: number;
  usedSeats: number;
  createdAt: string;
}

interface SubAdminManagementTabProps {
  currentPlanId?: string;
  companySeatLimit?: number;
  subAdmins?: SubAdminUser[];
  onInviteSubAdmin?: (email: string, quota: number) => Promise<void>;
  onUpdateQuota?: (subAdminId: string, newQuota: number) => Promise<void>;
  onRevokeSubAdmin?: (subAdminId: string) => Promise<void>;
}

export const SubAdminManagementTab: React.FC<SubAdminManagementTabProps> = ({
  currentPlanId = 'pro',
  companySeatLimit = 50,
  subAdmins = [],
  onInviteSubAdmin,
  onUpdateQuota,
  onRevokeSubAdmin,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const plan = PRICING_PLANS[currentPlanId.toLowerCase()] || PRICING_PLANS.pro;
  const maxAllowedSubAdmins = plan.maxAdmins - 1; // Founder is 1st Admin

  const activeSubAdminsCount = subAdmins.length;
  const subAdminsRemaining = Math.max(0, maxAllowedSubAdmins - activeSubAdminsCount);

  const totalAssignedQuota = subAdmins.reduce((sum, sa) => sum + sa.quota, 0);
  const unallocatedSeats = Math.max(0, companySeatLimit - totalAssignedQuota);

  const handleSendInvite = async (email: string, quota: number) => {
    if (onInviteSubAdmin) {
      await onInviteSubAdmin(email, quota);
    } else {
      toast.success(`Mock Invite: Sub-Admin ${email} invited with ${quota} telecaller seats.`);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner & Allocation Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 rounded-3xl p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-3">
                <ShieldCheck size={14} />
                Multi-Admin Seat Allocation Architecture
              </span>
              <h2 className="text-2xl md:text-3xl font-black font-display text-white">
                Sub-Admin (Co-Manager) Management
              </h2>
              <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                Delegate operational management of your 50 telecaller team to Co-Admins with strict seat quota controls and isolated team views.
              </p>
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              disabled={subAdminsRemaining <= 0 || unallocatedSeats <= 0}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-2xl btn-glow btn-tactile disabled:opacity-40 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <UserPlus size={16} />
              Add Sub-Admin
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans pt-2">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
              <div className="text-xl font-black text-white font-display flex items-baseline gap-2">
                {plan.name} Plan
                <span className="text-xs font-semibold text-brand-400">({plan.maxAdmins} Admins Allowed)</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sub-Admin Slots</span>
              <div className="text-xl font-black text-white font-display flex items-baseline gap-2">
                {activeSubAdminsCount} / {maxAllowedSubAdmins} Slots Used
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Telecaller Seats</span>
              <div className="text-xl font-black text-emerald-400 font-display flex items-baseline gap-2 font-grotesk">
                {unallocatedSeats} Unallocated
                <span className="text-xs font-semibold text-slate-400 font-sans">(Total {companySeatLimit})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Admins Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            Active Sub-Admins & Allocated Quotas
          </h3>
        </div>

        {subAdmins.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <ShieldCheck size={36} className="text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">No Sub-Admins added yet</p>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                You are currently managing all {companySeatLimit} telecallers as the Master Founder. Click "Add Sub-Admin" to delegate a team.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Sub-Admin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Allocated Quota</th>
                  <th className="py-3 px-4">Active Callers</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {subAdmins.map((sa) => (
                  <tr key={sa.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs">
                          {sa.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{sa.name}</div>
                          <div className="text-slate-400 text-[11px]">{sa.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        sa.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {sa.status === 'active' ? 'Active' : 'Pending Invite'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 font-grotesk text-sm">
                      {sa.quota} Seats
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-600 rounded-full" 
                            style={{ width: `${Math.min(100, (sa.usedSeats / sa.quota) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 font-grotesk">
                          {sa.usedSeats} / {sa.quota}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {sa.createdAt}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const newQ = prompt(`Update quota for ${sa.name} (Max available ${unallocatedSeats + sa.quota}):`, sa.quota.toString());
                            if (newQ && onUpdateQuota) onUpdateQuota(sa.id, parseInt(newQ, 10));
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                          title="Edit Quota"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Revoke Sub-Admin status for ${sa.name}? Callers will revert to Master Admin queue.`) && onRevokeSubAdmin) {
                              onRevokeSubAdmin(sa.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Revoke Sub-Admin"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <SubAdminInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        unallocatedSeats={unallocatedSeats}
        allowedSubAdminsRemaining={subAdminsRemaining}
        onSendInvite={handleSendInvite}
      />
    </div>
  );
};
