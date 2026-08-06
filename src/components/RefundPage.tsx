import React, { useState } from 'react';
import {
  Ban,
  CheckCircle,
  CreditCard,
  Printer,
  Globe,
  Save,
  Edit3,
  AlertCircle,
  X,
  TrendingDown,
  AlertTriangle,
  History,
  Clock,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import {
  useLegalDocument,
  usePublishLegalUpdate,
  useDiscardDraft,
  useLegalHistory,
  useLegalAction,
  useEnglishDocument
} from '@/hooks/useLegalPage';
import { Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Shared utilities ────────────────────────────────────────────────────────
const LANG_OPTIONS = ['English', 'Hindi', 'Marathi'] as const;
type Lang = typeof LANG_OPTIONS[number];

const renderContent = (text: string) =>
  text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-base font-black text-gray-900 mt-6 mb-2 font-display border-b border-gray-100 pb-2">{line.slice(3).trim()}</h3>;
    }
    if (line.trim().startsWith('- ')) {
      return <li key={i} className="ml-5 list-disc text-gray-650 mb-1 text-xs font-semibold">{line.replace('- ', '').trim()}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-xs text-gray-650 leading-relaxed mb-3 font-semibold">{line.trim()}</p>;
  });

// ─── Skeleton ────────────────────────────────────────────────────────────────
const ContentSkeleton = () => (
  <div className="animate-pulse space-y-4 p-8">
    <div className="h-4 bg-gray-200 rounded-full w-1/3" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-5/6" />
    <div className="h-4 bg-gray-200 rounded-full w-1/4 mt-6" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-3/4" />
    <div className="h-2 bg-gray-100 rounded-full w-2/3" />
  </div>
);

// ─── Founder Editor ───────────────────────────────────────────────────────────
interface FounderEditorProps {
  editTitle: string;
  setEditTitle: (v: string) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  editVersion: string;
}

const FounderEditor = ({ editTitle, setEditTitle, editContent, setEditContent, editVersion }: FounderEditorProps) => {
  const [editTab, setEditTab] = useState<'edit' | 'preview'>('edit');

  return (
    <div className="space-y-4 text-xs font-semibold no-print">
      <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Title</label>
        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold" />
      </div>
      <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Version (Auto-Incremented on Publish)</label>
        <input type="text" value={editVersion} disabled className="w-full p-2.5 bg-gray-100 border border-gray-150 rounded-xl outline-none text-gray-400 font-semibold cursor-not-allowed" />
      </div>
      <div>
        <div className="flex gap-0 border border-gray-150 rounded-t-xl overflow-hidden">
          <button onClick={() => setEditTab('edit')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${editTab === 'edit' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <Edit3 size={12} /> Edit
          </button>
          <button onClick={() => setEditTab('preview')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${editTab === 'preview' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <Eye size={12} /> Preview
          </button>
        </div>
        {editTab === 'edit' ? (
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={14} placeholder="## Section Title&#10;&#10;Write in markdown..." className="w-full p-3 bg-gray-50 border border-gray-150 border-t-0 rounded-b-xl focus:border-brand-500 outline-none font-mono text-xs leading-relaxed resize-y" />
        ) : (
          <div className="w-full p-4 bg-white border border-gray-150 border-t-0 rounded-b-xl min-h-[280px] prose max-w-full overflow-auto">
            {editContent ? renderContent(editContent) : <p className="text-gray-300 italic text-xs">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const RefundPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();

  const [language, setLanguage] = useState<Lang>('English');
  const [isFounderMode, setIsFounderMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const { data: document, isLoading, isError } = useLegalDocument('refund', language, isFounderMode);
  const { data: englishDoc } = useEnglishDocument('refund');
  const publishMutation = usePublishLegalUpdate();
  const discardMutation = useDiscardDraft();
  const { data: historyList = [] } = useLegalHistory('refund', language);
  const legalActionMutation = useLegalAction();

  // T5: Translation sync warning
  const isTranslationOutdated = language !== 'English'
    && !!englishDoc?.updated_at
    && !!document?.updated_at
    && new Date(englishDoc.updated_at) > new Date(document.updated_at);

  // T1: Version tooltip
  const latestHistory = historyList[0];
  const versionTooltip = latestHistory
    ? `Edited: ${new Date(latestHistory.edited_at).toLocaleString()}`
    : `Published: ${document?.published_at ? new Date(document.published_at).toLocaleString() : 'Unknown'}`;

  const handlePrint = () => window.print();

  const handleStartEdit = () => {
    if (!document) return;
    setEditTitle(document.title);
    setEditContent(document.content);
    setEditVersion(document.version);
    setIsEditing(true);
  };

  const handleSavePublish = async (status: 'draft' | 'published') => {
    try {
      await publishMutation.mutateAsync({ slug: 'refund', language, title: editTitle, content: editContent, status, editedBy: user?.id || user?.uid || null });
      toast.success(status === 'published' ? 'Refund policy published!' : 'Draft saved!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await discardMutation.mutateAsync({ slug: 'refund', language });
      toast.success('Draft discarded!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleConfirmCancellation = async () => {
    setIsCancelModalOpen(false);
    const toastId = toast.loading('Processing cancellation...');
    try {
      if (!companyId) throw new Error('Company ID is missing');
      await legalActionMutation.mutateAsync({ action: 'cancel-subscription', userId: user?.id || user?.uid || '', companyId });
      toast.success('Subscription cancelled successfully.', { id: toastId });
      navigate('/dashboard/billing?action=cancel');
    } catch (err: unknown) {
      toast.error('Cancellation failed: ' + (err instanceof Error ? err.message : 'Unknown error'), { id: toastId });
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-32 space-y-8 animate-in fade-in duration-300 print:pb-0 print:space-y-4 print:max-w-full">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>

      {/* ── Header toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-6 no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
            <Ban className="text-brand-600" size={26} /> Refund & Cancellation
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Review cancel guidelines, billing cycle constraints, and dynamic parameter costs.</p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-[10px] font-black uppercase text-gray-400">Founder Edit</span>
            <button onClick={() => setIsFounderMode(!isFounderMode)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors btn-tactile ${isFounderMode ? 'bg-brand-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isFounderMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* T5: Language selector with outdated badge */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-150 text-xs font-bold text-gray-700">
            <Globe size={13} className="text-gray-400" />
            <select value={language} onChange={e => setLanguage(e.target.value as Lang)} className="bg-transparent border-none outline-none font-bold">
              {LANG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {isTranslationOutdated && (
              <span className="flex items-center gap-0.5 text-amber-600 text-[9px] font-black uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="English updated more recently. Translation may be outdated.">
                <AlertTriangle size={9} /> Outdated
              </span>
            )}
          </div>

          <button onClick={handlePrint} className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-650 px-4 py-2 rounded-xl font-bold text-xs border border-gray-150 transition-all btn-tactile">
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <>
          {/* T6: Hero banner skeleton */}
          <div className="animate-pulse bg-gray-200 rounded-[2rem] h-44 no-print" />
          <div className="bg-white rounded-[2rem] border border-gray-150 shadow-xs no-print">
            <ContentSkeleton />
          </div>
        </>
      ) : isError ? (
        <div className="text-center py-12 space-y-3.5 bg-white border border-gray-150 rounded-[2rem] no-print">
          <AlertCircle size={28} className="text-red-500 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">Failed to load refund policy.</p>
        </div>
      ) : !document ? (
        <div className="text-center py-12 bg-amber-50 border border-amber-100 rounded-[2rem] space-y-2 no-print">
          <AlertCircle size={24} className="text-amber-500 mx-auto" />
          <p className="text-xs text-amber-700 font-bold">Refund document not yet published in {language}.</p>
          {language !== 'English' && <p className="text-[10px] text-amber-600 font-semibold">Showing English fallback — translation not yet available.</p>}
        </div>
      ) : (
        <div className="print-full-width space-y-8">

          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:p-0 print:border-none print:shadow-none"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 print:hidden">
              <Ban size={150} className="text-white" />
            </div>
            <div className="relative z-10 text-center md:text-left print:text-black">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-baseline gap-3 justify-center md:justify-start print:text-black">
                No <span className="text-2xl md:text-3xl text-red-400 font-bold tracking-normal uppercase print:text-black">Refund Policy</span>
              </h2>
              <p className="text-gray-400 font-medium text-xs mt-3 max-w-xl print:text-gray-600">
                CallMind SaaS subscriptions are strictly non-refundable. All sales are final. Please evaluate your team's requirements during the 7-day free trial before purchasing.
              </p>
            </div>
            <div className="relative z-10 shrink-0 print:hidden">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                <CheckCircle size={32} className="text-green-400" />
              </div>
            </div>
          </motion.div>

          {/* T6: Language fallback notice */}
          {language !== 'English' && document.language === 'English' && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold no-print">
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              Showing English fallback — {language} translation not yet available.
            </div>
          )}

          {/* Policy Details card */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-150 shadow-xs print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6 no-print">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <CreditCard size={18} className="text-brand-600" /> Policy Details
                </h3>
                {/* T1: Version tooltip */}
                <span title={versionTooltip} className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block cursor-help flex items-center gap-1">
                  {document.status === 'draft' ? '(Draft) ' : ''}Version {document.version}
                  {document.published_at && ` • ${new Date(document.published_at).toLocaleDateString()}`}
                  <Clock size={8} className="inline ml-0.5" />
                </span>
              </div>

              {isFounderMode && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSavePublish('published')} className="flex items-center gap-1 text-xs font-black uppercase text-brand-650 hover:bg-brand-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-brand-100 transition-all btn-tactile">
                        <Save size={13} /> Publish
                      </button>
                      <button onClick={() => handleSavePublish('draft')} className="flex items-center gap-1 text-xs font-black uppercase text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all btn-tactile">
                        <Save size={13} /> Save Draft
                      </button>
                      <button onClick={handleDiscardDraft} className="flex items-center gap-1 text-xs font-black uppercase text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-all btn-tactile">
                        <AlertCircle size={13} /> Discard
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleStartEdit} className="flex items-center gap-1 text-xs font-black uppercase text-brand-650 hover:bg-brand-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-brand-100 transition-all btn-tactile">
                        <Edit3 size={13} /> Edit
                      </button>
                      <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1 text-xs font-black uppercase text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all btn-tactile">
                        <Lock size={13} /> History
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* T4: Edit/Preview tabs */}
            {isEditing ? (
              <FounderEditor editTitle={editTitle} setEditTitle={setEditTitle} editContent={editContent} setEditContent={setEditContent} editVersion={editVersion} />
            ) : (
              <div className="prose max-w-full">{renderContent(document.content)}</div>
            )}
          </div>

          {/* Cancel subscription CTA */}
          <div className="flex justify-center border-t border-gray-150 pt-8 no-print">
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-6 py-3.5 bg-transparent border border-gray-250 text-gray-500 font-black rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all uppercase tracking-wider text-xs shadow-xs btn-tactile flex items-center gap-1.5"
            >
              <Ban size={15} /> Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel Subscription Modal ── */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCancelModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-6">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Ban size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-gray-900">Are you absolutely sure?</h3>
                <p className="text-xs text-gray-400 font-semibold leading-relaxed px-2">
                  Cancelling your CallMind subscription will freeze all active telecalling routes, agent prompts, and bulk sequence intervals at the end of the current billing cycle.
                </p>
              </div>
              <div className="flex gap-3 text-xs font-black uppercase tracking-wider pt-2">
                <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-650 transition-colors btn-tactile border border-gray-150">
                  Keep Subscription
                </button>
                <button onClick={handleConfirmCancellation} disabled={legalActionMutation.isPending} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl transition-colors btn-tactile flex items-center justify-center gap-1.5">
                  <TrendingDown size={14} /> {legalActionMutation.isPending ? 'Processing...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Version History Modal ── */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHistoryOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5"><History size={14} /> Version History</h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 text-xs">
                {historyList.length > 0 ? historyList.map(hist => (
                  <div key={hist.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-150">
                    <div className="text-left">
                      <span className="font-black text-gray-900 block">Version {hist.version}</span>
                      <span className="text-[10px] text-gray-400 font-semibold">{new Date(hist.edited_at).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditContent(hist.content);
                        if (!isEditing) { setEditTitle(document?.title || ''); setEditVersion(hist.version.toString()); setIsEditing(true); }
                        setIsHistoryOpen(false);
                        toast.success(`Loaded Version ${hist.version} into editor!`);
                      }}
                      className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-650 rounded-lg font-black uppercase text-[10px] tracking-wider btn-tactile"
                    >
                      Restore
                    </button>
                  </div>
                )) : <p className="text-center py-6 text-gray-400 italic font-semibold">No version history found.</p>}
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="w-full py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl font-bold btn-tactile">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
