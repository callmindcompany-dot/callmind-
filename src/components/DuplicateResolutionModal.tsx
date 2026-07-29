import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Copy, ArrowRightLeft } from 'lucide-react';
import { Lead } from '../types/lead';
import CallMindLoader from './CallMindLoader';

interface DuplicateResolutionModalProps {
  existingLead: Lead;
  newLeadData: Partial<Lead>;
  onResolve: (action: 'skip' | 'overwrite' | 'merge') => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
}

export const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
  existingLead,
  newLeadData,
  onResolve,
  onClose,
  isProcessing
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-50 flex items-center gap-4 bg-amber-50/50">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-display text-slate-900">Duplicate Lead Detected</h2>
            <p className="text-slate-500 text-sm font-medium">
              A lead with the phone number <span className="font-bold text-slate-900">{existingLead.phone}</span> already exists.
            </p>
          </div>
        </div>

        {/* Comparison Dashboard */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Existing Lead Card */}
            <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/50 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Existing Lead</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Name</span>
                  <span className="text-sm font-bold text-slate-800">{existingLead.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Email</span>
                  <span className="text-sm font-bold text-slate-800">{existingLead.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Status</span>
                  <span className="text-sm font-bold text-slate-800">{existingLead.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Source</span>
                  <span className="text-sm font-bold text-slate-800">{existingLead.source}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Location</span>
                  <span className="text-sm font-bold text-slate-800">
                    {[existingLead.city, existingLead.state].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Notes</span>
                  <span className="text-xs font-medium text-slate-600 block line-clamp-3">
                    {existingLead.notes || 'No notes logged.'}
                  </span>
                </div>
                {existingLead.custom_fields && Object.keys(existingLead.custom_fields).length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block mb-1">Custom Fields</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(existingLead.custom_fields).map(([key, val]) => (
                        <div key={key} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 block">{key}</span>
                          <span className="font-semibold text-slate-700">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* New Lead Input Card */}
            <div className="border border-brand-100 rounded-3xl p-6 bg-brand-50/10 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-500">New Data Entered</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Name</span>
                  <span className="text-sm font-bold text-slate-800">{newLeadData.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Email</span>
                  <span className="text-sm font-bold text-slate-800">{newLeadData.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Status</span>
                  <span className="text-sm font-bold text-slate-800">{newLeadData.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Source</span>
                  <span className="text-sm font-bold text-slate-800">{newLeadData.source}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Location</span>
                  <span className="text-sm font-bold text-slate-800">
                    {[newLeadData.city, newLeadData.state].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block">Notes</span>
                  <span className="text-xs font-medium text-slate-600 block line-clamp-3">
                    {newLeadData.notes || 'No notes logged.'}
                  </span>
                </div>
                {newLeadData.custom_fields && Object.keys(newLeadData.custom_fields).length > 0 && (
                  <div className="pt-3 border-t border-brand-50">
                    <span className="text-[10px] font-black text-brand-300 uppercase tracking-wider block mb-1">Custom Fields</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(newLeadData.custom_fields).map(([key, val]) => (
                        <div key={key} className="bg-white px-2.5 py-1.5 rounded-lg border border-brand-50">
                          <span className="text-[9px] font-bold text-brand-400 block">{key}</span>
                          <span className="font-semibold text-slate-700">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4">
          <button
            onClick={onClose}
            className="flex-1 min-w-[120px] py-4 bg-white border border-slate-200 text-slate-600 rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95"
          >
            Cancel
          </button>
          
          <button
            onClick={() => onResolve('skip')}
            disabled={isProcessing}
            className="flex-1 min-w-[120px] py-4 bg-amber-500 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
          >
            Skip (Cancel Save)
          </button>

          <button
            onClick={() => onResolve('overwrite')}
            disabled={isProcessing}
            className="flex-1 min-w-[120px] py-4 bg-rose-600 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
          >
            Overwrite Existing
          </button>

          <button
            onClick={() => onResolve('merge')}
            disabled={isProcessing}
            className="flex-[1.5] min-w-[160px] py-4 bg-brand-600 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-600/25"
          >
            {isProcessing ? <CallMindLoader size="xs" /> : <ArrowRightLeft className="w-4 h-4" />}
            <span>Merge & Save</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
