import React, { useState } from 'react';
import { useCompany } from '@/CompanyContext';
import { useAuth } from '@/AuthContext';
import { Zap, QrCode, Globe, Download, Users, UserPlus, Trash, Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import CallMindLoader from './CallMindLoader';

interface Invite {
  id: string;
  type: string;
  token?: string | null;
  join_code?: string | null;
  status: string;
  created_at: string;
  used_count: number;
  max_uses?: number | null;
  expires_at?: string | null;
}

interface TeamJoinToolsSectionProps {
  availableSeats: number;
  isFull: boolean;
  pendingRequestsCount: number;
  overLimitCount?: number;
  invites: Invite[];
  onGenerateQR: () => Promise<void>;
  onGenerateJoinCode: () => Promise<void>;
  onRevokeInvite: (id: string) => Promise<void>;
}

/**
 * TeamJoinToolsSection Component
 * 
 * Renders Dynamic Mobile QRs and Active Join Codes. All data fetching and actions
 * are lifted to the parent page to support a single database source.
 */
export const TeamJoinToolsSection = ({
  availableSeats,
  isFull,
  pendingRequestsCount,
  overLimitCount = 0,
  invites,
  onGenerateQR,
  onGenerateJoinCode,
  onRevokeInvite
}: TeamJoinToolsSectionProps) => {
  const { companyId } = useCompany();
  const { isTester, resetTrial, plan_status, trialDaysRemaining } = useAuth();
  
  const [isGenerating, setIsGenerating] = useState(false);

  const qrInvite = invites.find(i => i.type === 'qr_live' && i.status === 'active');
  const joinCodes = invites.filter(i => (i.type === 'join_code' || i.join_code) && i.status === 'active');

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      await onGenerateQR();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateJoinCode = async () => {
    setIsGenerating(true);
    try {
      await onGenerateJoinCode();
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrInvite) return;
    const canvas = document.querySelector('#qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `CallMind_Invite_QR_${qrInvite.token}.png`;
      link.href = url;
      link.click();
      toast.success("QR downloaded!");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Join Tools</h2>
          <p className="text-gray-500 text-sm">Dynamic QR codes, Join codes, and Line invitations for rapid onboarding.</p>
        </div>
        {isTester && (
          <button 
            onClick={() => {
              if (resetTrial) {
                resetTrial();
                toast.success("Trial reset successfully to +14 days.");
              }
            }} 
            className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-100 transition-all"
          >
            Reset Trial (Tester)
          </button>
        )}
      </div>

      {/* Admission Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Seats Available</p>
          <div className="flex items-center justify-between">
             <p className="text-2xl font-black text-gray-900">{availableSeats}</p>
             <div className={`p-2 rounded-xl ${isFull ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
                <Users size={18} />
             </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pending Requests</p>
          <div className="flex items-center justify-between">
             <p className="text-2xl font-black text-gray-900">{pendingRequestsCount}</p>
             <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <UserPlus size={18} />
             </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Codes</p>
          <div className="flex items-center justify-between">
             <p className="text-2xl font-black text-gray-900">{joinCodes.length}</p>
             <div className="p-2 rounded-xl bg-green-50 text-green-600">
                <Zap size={18} />
             </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Plan Status</p>
          <div className="flex items-center justify-between">
             <p className="text-[13px] font-black text-gray-900 uppercase">
                {plan_status === 'trialing' ? `Trial (${Math.max(0, Math.floor(trialDaysRemaining))}d)` : plan_status}
             </p>
             {plan_status === 'trialing' && trialDaysRemaining <= 0 ? (
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             ) : (
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-gray-100 flex flex-col items-center text-center shadow-sm">
          <div className="p-6 bg-white rounded-3xl shadow-lg border border-gray-100 mb-6 relative w-full flex flex-col items-center justify-center min-h-[260px]">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center backdrop-blur-sm z-10">
                <CallMindLoader size="xs" />
              </div>
            )}
            
            {qrInvite ? (
              <div className="flex flex-col items-center w-full">
                <div className="bg-white p-4 rounded-2xl border border-gray-50 shadow-inner">
                  <QRCodeCanvas 
                    id="qr-code-canvas"
                    value={`https://join.callmind.ai/join?companyId=${companyId}&token=${qrInvite.token}`}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Scan to Join</p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="font-mono text-[11px] font-bold text-brand-600 truncate max-w-[140px]">{qrInvite.token}</p>
                </div>
                <p className="text-xs text-brand-600 font-bold mt-2 bg-brand-50 px-3 py-1 rounded-full">
                  {qrInvite.max_uses ? `${qrInvite.max_uses - qrInvite.used_count} of ${qrInvite.max_uses} seats remaining` : ''}
                </p>
                <p className="text-[10px] font-bold text-orange-500 mt-2">
                  Expires {qrInvite.expires_at ? `in ${Math.max(0, Math.round((new Date(qrInvite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)))} hours` : 'soon'}
                </p>
                <div className="flex flex-col gap-2 mt-4 w-full">
                  <button 
                    onClick={() => {
                      const link = `https://join.callmind.ai/join?companyId=${companyId}&token=${qrInvite.token}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Magic Onboarding Link copied to clipboard!");
                    }}
                    className="w-full py-3 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center justify-center gap-1"
                  >
                    <Copy size={12} /> Copy Magic Invite Link
                  </button>
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={downloadQR}
                      className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-1"
                    >
                      <Download size={14} /> Save QR
                    </button>
                    <button 
                      onClick={() => onRevokeInvite(qrInvite.id)}
                      className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleGenerateQR}
                disabled={isGenerating || isFull}
                className="w-[200px] h-full min-h-[220px] flex flex-col items-center justify-center border-4 border-dashed border-brand-100 rounded-3xl bg-brand-50/30 hover:bg-brand-50 hover:border-brand-200 transition-all group active:scale-95"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <QrCode size={32} className="text-brand-600" />
                </div>
                <h6 className="text-[13px] font-black text-brand-900 uppercase tracking-tight">Generate QR</h6>
                <p className="text-[10px] text-brand-600 font-bold uppercase tracking-widest mt-1 opacity-60">
                  {isFull ? "Limit Reached" : "Required for joining"}
                </p>
              </button>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900">Dynamic Mobile QR</h3>
          <p className="text-xs text-gray-500 mt-2 mb-6">Agents scan this via the CallMind App to sync with your team hub.</p>
          
          <button 
            onClick={handleGenerateQR}
            disabled={isGenerating || isFull || (plan_status === 'trialing' && trialDaysRemaining <= 0)}
            className={`w-full py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 ${
                (isFull || overLimitCount > 0) ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-100'
            }`}
          >
            {overLimitCount > 0 ? `Over Limit. Remove ${overLimitCount} Users` : isFull ? 'Limit Reached' : (plan_status === 'trialing' && trialDaysRemaining <= 0) ? 'Trial Expired' : `Generate QR (${availableSeats} seats left)`}
          </button>
        </div>
        
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Zap size={18} className="text-orange-500" />
                Active Join Codes
              </h3>
              <button 
                onClick={handleGenerateJoinCode}
                disabled={isFull || (plan_status === 'trialing' && trialDaysRemaining <= 0)}
                className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline disabled:opacity-50"
              >
                Generate New
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
              {joinCodes.length > 0 ? joinCodes.map((c) => (
                <div key={c.id} className="flex flex-col p-5 bg-gray-50 rounded-3xl border border-gray-100 group hover:border-brand-200 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Join Code</p>
                    <button 
                      onClick={() => onRevokeInvite(c.id)}
                      className="p-2 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-2xl font-black text-brand-600 tracking-widest select-all">{c.join_code}</p>
                    <button 
                      onClick={() => copyCode(c.join_code || '')}
                      className="p-2 text-brand-500 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100">
                      {c.used_count} / {c.max_uses || availableSeats} Uses
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Active</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                  <Zap size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-bold text-gray-600">No active codes</p>
                  <p className="text-xs font-medium text-gray-400 mt-1 max-w-sm text-center">
                    Generate a join code to allow team members to enroll manually.
                  </p>
                  <button 
                    onClick={handleGenerateJoinCode}
                    disabled={isFull || (plan_status === 'trialing' && trialDaysRemaining <= 0)}
                    className="mt-4 px-6 py-2.5 bg-white border border-gray-200 text-brand-600 rounded-xl font-bold text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    {overLimitCount > 0 ? "Over Limit" : isFull ? 'Limit Reached' : (plan_status === 'trialing' && trialDaysRemaining <= 0) ? 'Trial Expired' : 'Generate First Code'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-8 bg-slate-900 p-8 rounded-[40px] text-white flex items-center justify-between relative overflow-hidden group">
              <Globe className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Direct App Link</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-medium">
                  Send this direct join link for app-based enrollment. Approval required.
                </p>
              </div>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/join?id=${companyId}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }}
                className="relative z-10 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
