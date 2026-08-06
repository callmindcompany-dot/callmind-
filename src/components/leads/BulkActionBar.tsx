import React, { useState } from 'react';
import { Trash2, X, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DominoWaveLoader = () => (
  <div className="relative w-[48px] h-[16px] flex items-center justify-center overflow-hidden">
    <div className="flex gap-[3px] items-center">
      {[0.125, 0.3, 0.425, 0.54, 0.665, 0.79, 0.915, 1].map((delay, i) => (
        <span
          key={i}
          className="w-[2.5px] h-[10px] bg-indigo-300 rounded-xs domino-bar"
          style={{ animationDelay: `${delay}s`, boxShadow: '0 2px 4px rgba(99, 102, 241, 0.4)' }}
        />
      ))}
    </div>
  </div>
);

interface BulkActionBarProps {
  selectedCount: number;
  agents: any[];
  onBulkAssign: (agentId: string) => void;
  onBulkStatusChange: (status: string) => void;
  onBulkDelete: () => void;
  onBulkExport: () => Promise<void>;
  onClearSelection: () => void;
  isSubmitting?: boolean;
}

/** Mirrors the CHECK constraint on leads.status. */
const BULK_STATUSES = ['New', 'Contacted', 'Interested', 'Call Back', 'Converted', 'Rejected'];

export const BulkActionBar = React.memo(({
  selectedCount,
  agents,
  onBulkAssign,
  onBulkStatusChange,
  onBulkDelete,
  onBulkExport,
  onClearSelection,
  isSubmitting
}: BulkActionBarProps) => {
  // Fix 4: Local state for export loading state
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async () => {
    setIsExporting(true);
    try {
      await onBulkExport();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl shadow-2xl"
        >
          <div className="bg-slate-900 border border-slate-800 p-4 pl-6 rounded-3xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-white/10 text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border border-white/20">
                {selectedCount}
              </div>
              <span className="font-bold text-white text-sm">Leads Selected</span>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-white/20 transition-all cursor-pointer text-gray-800"
                onChange={(e) => onBulkAssign(e.target.value)}
                value=""
              >
                <option value="" disabled className="text-gray-950">Assign to Telecaller...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id} className="text-gray-950">{a.name || 'Agent'}</option>
                ))}
              </select>
              
              <select
                className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-white/20 transition-all cursor-pointer text-gray-800"
                onChange={(e) => {
                  if (e.target.value) onBulkStatusChange(e.target.value);
                  e.target.value = '';
                }}
                value=""
              >
                <option value="" disabled className="text-gray-950">Change status...</option>
                {BULK_STATUSES.map(status => (
                  <option key={status} value={status} className="text-gray-950">{status}</option>
                ))}
              </select>

              <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

              {/* Fix 4: Export Button with loading state and spinner */}
              <button 
                onClick={handleExportClick}
                disabled={isExporting}
                className="px-4 py-2 bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile"
              >
                {isExporting ? (
                  <>
                    <DominoWaveLoader /> Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Export
                  </>
                )}
              </button>

              <button 
                onClick={onBulkDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-500/20 text-red-100 border border-red-500/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile"
              >
                <Trash2 size={16} /> Delete
              </button>
              
              <button 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white shrink-0 ml-2"
                onClick={onClearSelection}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}, (prev, next) => {
  return (
    prev.selectedCount === next.selectedCount &&
    prev.agents === next.agents &&
    prev.isSubmitting === next.isSubmitting
  );
});

BulkActionBar.displayName = 'BulkActionBar';
