import React, { useState } from 'react';
import {
  ShieldCheck,
  PhoneOff,
  Lock,
  Eye,
  Database,
  Printer,
  Globe,
  Save,
  Edit3,
  AlertCircle,
  FileDown,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  History,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { LegalPage } from '@/types/legal';
import { toast } from 'react-hot-toast';

// ─── Shared utilities ────────────────────────────────────────────────────────
const LANG_OPTIONS = ['English', 'Hindi', 'Marathi'] as const;
type Lang = typeof LANG_OPTIONS[number];

/** Render basic markdown to React nodes */
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
    <div className="h-2 bg-gray-100 rounded-full w-4/5" />
    <div className="h-4 bg-gray-200 rounded-full w-1/4 mt-6" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-3/4" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-2/3" />
  </div>
);

// ─── Founder Inline Editor ───────────────────────────────────────────────────
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
      {/* Title */}
      <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Title</label>
        <input
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold"
        />
      </div>

      {/* Version (readonly) */}
      <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Version (Auto-Incremented on Publish)</label>
        <input
          type="text"
          value={editVersion}
          disabled
          className="w-full p-2.5 bg-gray-100 border border-gray-150 rounded-xl outline-none text-gray-400 font-semibold cursor-not-allowed"
        />
      </div>

      {/* Edit / Preview Tabs */}
      <div className="space-y-0">
        <div className="flex gap-0 border border-gray-150 rounded-t-xl overflow-hidden">
          <button
            onClick={() => setEditTab('edit')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${editTab === 'edit' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            onClick={() => setEditTab('preview')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${editTab === 'preview' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            <Eye size={12} /> Preview
          </button>
        </div>

        {editTab === 'edit' ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={14}
            placeholder="## Section Title&#10;&#10;Write content in markdown..."
            className="w-full p-3 bg-gray-50 border border-gray-150 border-t-0 rounded-b-xl focus:border-brand-500 outline-none font-mono text-xs leading-relaxed resize-y"
          />
        ) : (
          <div className="w-full p-4 bg-white border border-gray-150 border-t-0 rounded-b-xl min-h-[280px] prose max-w-full overflow-auto">
            {editContent ? renderContent(editContent) : (
              <p className="text-gray-300 italic text-xs">Nothing to preview yet. Switch to Edit tab and write content.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PrivacyPage = () => {
  const { user, profile } = useAuth();
  const { companyId } = useCompany();

  const [language, setLanguage] = useState<Lang>('English');
  const [isFounderMode, setIsFounderMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // GDPR state
  const [isDataRequestOpen, setIsDataRequestOpen] = useState(false);
  const [isDataPurgeOpen, setIsDataPurgeOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeProgress, setPurgeProgress] = useState(0);

  const { data: document, isLoading, isError } = useLegalDocument('privacy', language, isFounderMode);
  const { data: englishDoc } = useEnglishDocument('privacy');
  const publishMutation = usePublishLegalUpdate();
  const discardMutation = useDiscardDraft();
  const { data: historyList = [] } = useLegalHistory('privacy', language);
  const legalActionMutation = useLegalAction();

  // T5: Translation sync warning — show badge if English was updated more recently
  const isTranslationOutdated = language !== 'English'
    && !!englishDoc?.updated_at
    && !!document?.updated_at
    && new Date(englishDoc.updated_at) > new Date(document.updated_at);

  // T1: Latest history entry for version tooltip
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
      await publishMutation.mutateAsync({ slug: 'privacy', language, title: editTitle, content: editContent, status, editedBy: user?.id || user?.uid || null });
      toast.success(status === 'published' ? 'Privacy policy published!' : 'Draft saved!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Publishing error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await discardMutation.mutateAsync({ slug: 'privacy', language });
      toast.success('Draft discarded!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Discard error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // T2: Capture downloadUrl and open it
  const handleRequestData = async () => {
    if (!user) return;
    setIsDataRequestOpen(false);
    const toastId = toast.loading('Compiling your data...');
    try {
      const result = await legalActionMutation.mutateAsync({
        action: 'export-data',
        userId: user.id || user.uid,
        companyId: profile?.companyId || null
      });
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success('Data export ready — download started!', { id: toastId });
      } else {
        toast.success('Export queued — check your email within 24h.', { id: toastId });
      }
    } catch (err: unknown) {
      toast.error('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'), { id: toastId });
    }
  };

  const handlePurgeData = async () => {
    if (purgeConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setIsPurging(true);
    setPurgeProgress(5);

    const progressInterval = setInterval(() => {
      setPurgeProgress(prev => prev >= 90 ? prev : prev + Math.floor(Math.random() * 10) + 2);
    }, 300);

    try {
      await legalActionMutation.mutateAsync({
        action: 'purge-data',
        userId: user?.id || user?.uid || '',
        companyId: profile?.companyId || null
      });
      clearInterval(progressInterval);
      setPurgeProgress(100);
      setTimeout(() => {
        setIsPurging(false);
        setPurgeProgress(0);
        setIsDataPurgeOpen(false);
        setPurgeConfirmText('');
        toast.success('All data permanently deleted.');
      }, 600);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsPurging(false);
      setPurgeProgress(0);
      toast.error('Purge failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32 space-y-8 animate-in fade-in duration-300 print:pb-0 print:space-y-4 print:max-w-full">

      {/* @media print styles */}
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
            <ShieldCheck className="text-brand-600" size={26} /> Data Privacy
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Review data subject rights, compliance directives, and encryption structures.</p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Founder mode toggle */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-[10px] font-black uppercase text-gray-400">Founder Edit</span>
            <button
              onClick={() => setIsFounderMode(!isFounderMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors btn-tactile ${isFounderMode ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isFounderMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* T5: Language selector + outdated badge */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-150 text-xs font-bold text-gray-700">
            <Globe size={13} className="text-gray-400" />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Lang)}
              className="bg-transparent border-none outline-none font-bold"
            >
              {LANG_OPTIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {isTranslationOutdated && (
              <span className="flex items-center gap-0.5 text-amber-600 text-[9px] font-black uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="English version was updated more recently. Translation may be outdated.">
                <AlertTriangle size={9} /> Outdated
              </span>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-650 px-4 py-2 rounded-xl font-bold text-xs border border-gray-150 transition-all btn-tactile"
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="bg-white rounded-[2rem] border border-gray-150 shadow-xs no-print">
          <ContentSkeleton />
        </div>
      ) : isError ? (
        <div className="text-center py-12 space-y-3.5 bg-white border border-gray-150 rounded-[2rem] no-print">
          <AlertCircle size={28} className="text-red-500 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">Failed to load privacy policy.</p>
        </div>
      ) : !document ? (
        <div className="text-center py-12 space-y-3 bg-amber-50 border border-amber-100 rounded-[2rem] no-print">
          <AlertCircle size={24} className="text-amber-500 mx-auto" />
          <p className="text-xs text-amber-700 font-bold">Privacy document not yet published in {language}.</p>
          {language !== 'English' && <p className="text-[10px] text-amber-600 font-semibold">Showing English fallback — translation not yet available.</p>}
        </div>
      ) : (
        <div className="print-full-width space-y-8">

          {/* T6: Language fallback notice */}
          {language !== 'English' && document.language === 'English' && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold no-print">
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              Showing English fallback — {language} translation not yet available.
            </div>
          )}

          {/* Main content card */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-150 shadow-xs print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6 no-print">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck size={18} className="text-brand-600" /> Compliance & Isolation Guidelines
                </h3>
                {/* T1: Version tooltip */}
                <span
                  title={versionTooltip}
                  className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block cursor-help flex items-center gap-1"
                >
                  {document.status === 'draft' ? '(Draft) ' : ''}
                  Version {document.version}
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
                        <Trash2 size={13} /> Discard
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleStartEdit} className="flex items-center gap-1 text-xs font-black uppercase text-brand-650 hover:bg-brand-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-brand-100 transition-all btn-tactile">
                        <Edit3 size={13} /> Edit
                      </button>
                      <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1 text-xs font-black uppercase text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all btn-tactile">
                        <History size={13} /> History
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* T4: Markdown editor with Edit/Preview tabs */}
            {isEditing ? (
              <FounderEditor
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                editContent={editContent}
                setEditContent={setEditContent}
                editVersion={editVersion}
              />
            ) : (
              <div className="prose max-w-full">{renderContent(document.content)}</div>
            )}
          </div>

          {/* GDPR / DPDP Action Center */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs space-y-4 no-print">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">GDPR & DPDP Data Request Portal</h3>
            <p className="text-[11px] text-gray-400 font-semibold">In accordance with DPDP regulations, users reserve the right to export metadata or purge company logs.</p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs font-black uppercase tracking-wider">
              <button
                onClick={() => setIsDataRequestOpen(true)}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 btn-tactile"
              >
                <FileDown size={14} /> Request My Data
              </button>
              <button
                onClick={() => setIsDataPurgeOpen(true)}
                className="flex-1 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 btn-tactile"
              >
                <Trash2 size={14} /> Request Data Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Data Modal ── */}
      <AnimatePresence>
        {isDataRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDataRequestOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto">
                <FileDown size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Compile Account Data</h3>
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed px-1">
                  We will assemble all call transcriptions, CRM configurations, and lead lists into a secure CSV. A signed download link will open immediately, or be emailed to <b>{user?.email || 'your email'}</b>.
                </p>
              </div>
              <div className="flex items-center gap-1 justify-center text-[9px] text-brand-600 font-bold">
                <ExternalLink size={10} /> Download link opens in a new tab (valid 15 min)
              </div>
              <div className="flex gap-2.5 text-[10px] font-black uppercase pt-2">
                <button onClick={() => setIsDataRequestOpen(false)} className="flex-1 py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl btn-tactile">Cancel</button>
                <button onClick={handleRequestData} disabled={legalActionMutation.isPending} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl btn-tactile disabled:bg-gray-300">
                  {legalActionMutation.isPending ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Purge Data Modal ── */}
      <AnimatePresence>
        {isDataPurgeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isPurging && setIsDataPurgeOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Trash2 size={22} className={isPurging ? 'animate-spin' : ''} />
              </div>
              {isPurging ? (
                <div className="space-y-4 py-2">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Purging Data Pipeline...</h3>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${purgeProgress}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400">{purgeProgress}% Complete</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">Confirm Total Pipeline Purge</h3>
                    <p className="text-[11px] text-gray-455 font-semibold leading-relaxed px-1">
                      <b>Warning:</b> This will erase all sequences, call records, analytics, and client lists permanently. This action is <b>irreversible</b>.
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type "DELETE" to confirm</label>
                    <input
                      type="text"
                      value={purgeConfirmText}
                      onChange={e => setPurgeConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full p-2 bg-gray-50 border border-gray-150 rounded-xl focus:border-red-500 outline-none text-center font-bold text-xs uppercase text-red-600"
                    />
                  </div>
                  <div className="flex gap-2.5 text-[10px] font-black uppercase pt-2">
                    <button onClick={() => { setIsDataPurgeOpen(false); setPurgeConfirmText(''); }} className="flex-1 py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl btn-tactile">Cancel</button>
                    <button onClick={handlePurgeData} disabled={purgeConfirmText !== 'DELETE'} className="flex-1 py-2.5 bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl btn-tactile">Confirm Purge</button>
                  </div>
                </>
              )}
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
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 text-xs">
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
