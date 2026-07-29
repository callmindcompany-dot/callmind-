import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Smartphone, QrCode, Shield, RefreshCw, Sparkles, Share2 } from 'lucide-react';

interface TelecallerInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyId: string;
  joinCode?: string;
}

export const TelecallerInviteModal: React.FC<TelecallerInviteModalProps> = ({
  isOpen,
  onClose,
  companyName,
  companyId,
  joinCode = "CALLMIND-6829"
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const joinLink = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/join?code=${joinCode}&companyId=${companyId}`;
  const qrData = encodeURIComponent(joinLink);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${qrData}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 sm:p-8 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight font-display">Pair Telecaller App</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">{companyName} Workspace</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* QR & Join Code Body */}
          <div className="py-6 space-y-6">
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center relative group">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden flex items-center justify-center mb-3">
                <img 
                  src={qrImageUrl} 
                  alt="Telecaller App Pair QR Code" 
                  className="w-full h-full object-contain" 
                  loading="eager"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <QrCode size={14} className="text-blue-600" />
                <span>Scan from CallMind Telecaller Expo App</span>
              </div>
            </div>

            {/* 6-Digit Join Code */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Or Enter 6-Digit Pairing Code
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex-1 px-4 py-2 font-mono font-black text-2xl text-slate-900 tracking-widest text-center">
                  {joinCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Join Link */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-500">Direct Invitation Link</span>
                <button 
                  onClick={handleCopyLink} 
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                >
                  {copiedLink ? <Check size={12} /> : <Share2 size={12} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={joinLink}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 font-mono outline-none"
              />
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-500" />
              <span>Multi-tenant RLS Protected</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
