import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, FileText, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface DocumentItem {
  id: string;
  company_id: string;
  lead_id?: string | null;
  category: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  r2_key: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired' | 'superseded';
  version: number;
  uploaded_by?: string | null;
  uploaded_at?: string;
  created_at?: string;
  reviewed_by?: string | null;
  reviewed_at?: string;
  rejection_reason?: string | null;
  expires_at?: string | null;
}

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  documentsList?: DocumentItem[];
  userEmail: string;
  isAdmin: boolean;
  onClose: () => void;
  onApprove?: (docId: string) => Promise<void>;
  onReject?: (docId: string, reason: string) => Promise<void>;
  onNavigateDoc?: (doc: DocumentItem) => void;
}

export const CANNED_REJECTION_REASONS = [
  'Unclear photo',
  'Expired document',
  'Need 6 months bank statement',
  'Wrong document uploaded',
  'Document is password protected',
  'Name mismatch with lead record',
];

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  documentsList = [],
  userEmail,
  isAdmin,
  onClose,
  onApprove,
  onReject,
  onNavigateDoc,
}) => {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset transforms when active document changes
  useEffect(() => {
    setRotation(0);
    setZoom(1);
    setRejecting(false);
    setSelectedReason('');
    setCustomReason('');

    if (doc?.id && isAdmin) {
      fetchSignedUrl(doc.id);
    }
  }, [doc?.id, isAdmin]);

  const fetchSignedUrl = async (id: string) => {
    setLoadingUrl(true);
    try {
      // Nothing in the codebase ever writes a 'supabase_token' key, so this
      // read always returned '' and every request below went out with an
      // empty bearer token.
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? '';
      const res = await fetch(`/v1/documents/${id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSignedUrl(data.url);
      } else {
        toast.error(data.error || 'Failed to fetch document URL');
      }
    } catch (err: any) {
      toast.error('Error loading document preview');
    } finally {
      setLoadingUrl(false);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!doc || !isAdmin) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return; // Don't trigger shortcuts when typing inside form fields
      }

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleApproveClick();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRejecting(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextDoc();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevDoc();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, isAdmin, documentsList]);

  if (!doc) return null;

  const currentIndex = documentsList.findIndex((d) => d.id === doc.id);
  const hasNext = currentIndex >= 0 && currentIndex < documentsList.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNextDoc = () => {
    if (hasNext && onNavigateDoc) {
      onNavigateDoc(documentsList[currentIndex + 1]);
    }
  };

  const handlePrevDoc = () => {
    if (hasPrev && onNavigateDoc) {
      onNavigateDoc(documentsList[currentIndex - 1]);
    }
  };

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setIsSubmitting(true);
    try {
      await onApprove(doc.id);
      toast.success('Document approved');
      if (hasNext) handleNextDoc();
      else onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      toast.error('Rejection reason is mandatory');
      return;
    }

    if (!onReject) return;
    setIsSubmitting(true);
    try {
      await onReject(doc.id, finalReason);
      toast.success('Document rejected');
      setRejecting(false);
      if (hasNext) handleNextDoc();
      else onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = doc.mime_type.startsWith('image/');
  const isPdf = doc.mime_type === 'application/pdf';
  const timestampStr = new Date().toLocaleString('en-IN');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Viewer Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-5xl h-[90vh] bg-slate-900 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800"
        >
          {/* Header Bar */}
          <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
                <FileText size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100 text-base">{doc.file_name}</h3>
                  {doc.version > 1 && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                      v{doc.version} (current)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {doc.category.toUpperCase()} • {(doc.size_bytes / 1024).toFixed(1)} KB • Uploaded by {doc.uploaded_by || 'User'}
                </p>
              </div>
            </div>

            {/* Transform Controls & Close */}
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw size={18} />
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Main Document Content Area with Traceable Watermark */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center p-6 bg-slate-950/60 custom-scrollbar select-none">
            {/* Watermark Overlay for Traceability */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-15 overflow-hidden font-mono text-[11px] text-white space-x-12 leading-relaxed">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="-rotate-45 whitespace-nowrap">
                  CONFIDENTIAL • {userEmail} • {timestampStr}
                </div>
              ))}
            </div>

            {loadingUrl ? (
              <div className="text-center py-20 text-slate-400 font-medium animate-pulse">
                Loading secure document preview...
              </div>
            ) : signedUrl ? (
              isImage ? (
                <div className="transition-all duration-200 flex items-center justify-center">
                  <img
                    src={signedUrl}
                    alt={doc.file_name}
                    style={{
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      maxHeight: '75vh',
                      objectFit: 'contain',
                    }}
                    className="rounded-lg shadow-2xl transition-transform"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${signedUrl}#toolbar=0`}
                  title={doc.file_name}
                  className="w-full h-full min-h-[70vh] rounded-lg border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center py-12 text-slate-300 font-medium">
                  Preview not available for this file type.
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-3 text-brand-400 underline font-bold"
                  >
                    Download File
                  </a>
                </div>
              )
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium">
                Unable to load document preview.
              </div>
            )}

            {/* Navigation Arrows */}
            {hasPrev && (
              <button
                onClick={handlePrevDoc}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700 shadow-xl transition-all z-20"
                title="Previous Document (Left Arrow)"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            {hasNext && (
              <button
                onClick={handleNextDoc}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700 shadow-xl transition-all z-20"
                title="Next Document (Right Arrow)"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Inline Action Bar & Rejection Drawer */}
          {isAdmin && (
            <div className="p-4 px-6 border-t border-slate-800 bg-slate-900 z-20">
              {rejecting ? (
                <form onSubmit={handleRejectSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={14} /> Mandatory Rejection Reason
                    </label>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="text-xs text-slate-400 hover:text-white font-medium"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {CANNED_REJECTION_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setSelectedReason(reason)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                          selectedReason === reason
                            ? 'bg-red-500/20 text-red-300 border-red-500/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedReason('Other')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                        selectedReason === 'Other'
                          ? 'bg-red-500/20 text-red-300 border-red-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Other / Custom
                    </button>
                  </div>

                  {selectedReason === 'Other' && (
                    <input
                      type="text"
                      placeholder="Type custom rejection reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-red-500"
                      required
                    />
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting || (!selectedReason && !customReason)}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">A</kbd> Approve • <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">R</kbd> Reject • <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">→</kbd> Next</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRejecting(true)}
                      disabled={isSubmitting || doc.status === 'rejected'}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={16} /> Reject (R)
                    </button>

                    <button
                      onClick={handleApproveClick}
                      disabled={isSubmitting || doc.status === 'approved'}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Approve (A)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
