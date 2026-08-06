import React, { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Printer,
  Globe,
  Check,
  Edit3,
  Save,
  AlertCircle,
  FileCheck2,
  Lock,
  X,
  History,
  Clock,
  Eye,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import {
  useLegalDocument,
  usePublishLegalUpdate,
  useUserAcceptance,
  useAcceptTerms,
  useDiscardDraft,
  useLegalHistory,
  useEnglishDocument
} from '@/hooks/useLegalPage';
import { toast } from 'react-hot-toast';

// ─── Shared utilities ────────────────────────────────────────────────────────
const LANG_OPTIONS = ['English', 'Hindi', 'Marathi'] as const;
type Lang = typeof LANG_OPTIONS[number];

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const renderContent = (text: string) =>
  text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      const headingText = line.slice(3).trim();
      return <h3 key={i} id={slugify(headingText)} className="text-lg md:text-xl font-black text-gray-900 mt-8 mb-3 scroll-mt-24 font-display border-b border-gray-100 pb-2">{headingText}</h3>;
    }
    if (line.startsWith('### ')) {
      const headingText = line.slice(4).trim();
      return <h4 key={i} id={slugify(headingText)} className="text-sm font-bold text-gray-800 mt-6 mb-2 scroll-mt-24">{headingText}</h4>;
    }
    if (line.trim().startsWith('- ')) {
      return <li key={i} className="ml-5 list-disc text-gray-600 mb-1.5 text-xs font-semibold">{line.replace('- ', '').trim()}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-xs text-gray-650 leading-relaxed mb-3.5 font-semibold">{line.trim()}</p>;
  });

// ─── Skeleton ────────────────────────────────────────────────────────────────
const ContentSkeleton = () => (
  <div className="animate-pulse space-y-4 p-8">
    <div className="h-5 bg-gray-200 rounded-full w-1/2" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-5/6" />
    <div className="h-2 bg-gray-100 rounded-full w-4/5" />
    <div className="h-5 bg-gray-200 rounded-full w-1/3 mt-6" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-2 bg-gray-100 rounded-full w-3/4" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
    <div className="h-5 bg-gray-200 rounded-full w-2/5 mt-6" />
    <div className="h-2 bg-gray-100 rounded-full w-2/3" />
    <div className="h-2 bg-gray-100 rounded-full w-full" />
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
    <div className="space-y-4 no-print text-xs font-semibold">
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
export const TermsPage = () => {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const [language, setLanguage] = useState<Lang>('English');
  const [isFounderMode, setIsFounderMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [acceptChecked, setAcceptChecked] = useState(false);
  // T6: Mobile TOC toggle
  const [isTocOpen, setIsTocOpen] = useState(false);

  const { data: document, isLoading, isError } = useLegalDocument('terms', language, isFounderMode);
  const { data: acceptanceRow, refetch: refetchAcceptance } = useUserAcceptance('terms', user?.uid || null, document?.version);
  const { data: englishDoc } = useEnglishDocument('terms');

  const acceptTermsMutation = useAcceptTerms();
  const publishMutation = usePublishLegalUpdate();
  const discardMutation = useDiscardDraft();
  const { data: historyList = [] } = useLegalHistory('terms', language);

  const hasAccepted = !!acceptanceRow;
  const acceptedDate = acceptanceRow?.accepted_at ? new Date(acceptanceRow.accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

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

  // Parse headings for TOC
  const headings = useMemo(() => {
    if (!document?.content) return [];
    return document.content.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3).trim());
  }, [document]);

  const handlePrint = () => window.print();

  const handleAcceptSubmit = async () => {
    if (!user || !document) return;
    try {
      await acceptTermsMutation.mutateAsync({ userId: user.uid, companyId, pageSlug: 'terms', version: document.version, language });
      toast.success('Terms of service accepted!');
      refetchAcceptance();
      setAcceptChecked(false);
    } catch (err: unknown) {
      toast.error('Failed to accept: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleStartEdit = () => {
    if (!document) return;
    setEditTitle(document.title);
    setEditContent(document.content);
    setEditVersion(document.version);
    setIsEditing(true);
  };

  const handleSavePublish = async (status: 'draft' | 'published') => {
    try {
      await publishMutation.mutateAsync({ slug: 'terms', language, title: editTitle, content: editContent, status, editedBy: user?.id || user?.uid || null });
      toast.success(status === 'published' ? 'Terms published!' : 'Draft saved!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await discardMutation.mutateAsync({ slug: 'terms', language });
      toast.success('Draft discarded!');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-32 space-y-8 animate-in fade-in duration-300 print:pb-0 print:space-y-4 print:max-w-full">
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
            <FileText className="text-brand-600" size={26} /> Terms of Service
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Review CallMind CRM operational guidelines and telecom calling regulations.</p>
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

      {/* T3: Acceptance Status Banner */}
      {!isLoading && !isError && document && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs no-print ${
            hasAccepted ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {hasAccepted
              ? <FileCheck2 size={16} className="text-emerald-600 shrink-0" />
              : <AlertCircle size={16} className="text-amber-600 animate-pulse shrink-0" />
            }
            <span>
              {hasAccepted
                ? `You accepted Terms v${document.version}${acceptedDate ? ` on ${acceptedDate}` : ''}.`
                : `Terms updated to v${document.version}. Please review and accept to keep your dialing privileges active.`
              }
            </span>
          </div>
          {!hasAccepted && (
            <button onClick={handleAcceptSubmit} className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-black uppercase text-[10px] tracking-wider hover:bg-amber-700 transition-colors btn-tactile">
              Accept Now
            </button>
          )}
        </motion.div>
      )}

      {/* ── Main layout ── */}
      <div className="flex flex-col md:flex-row gap-10 relative items-start">

        {/* ── TOC Sidebar (desktop) ── */}
        {headings.length > 0 && (
          <>
            {/* T6: Mobile TOC collapsible dropdown */}
            <div className="md:hidden no-print">
              <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-150 rounded-xl text-xs font-bold text-gray-700"
              >
                <span className="flex items-center gap-1.5"><List size={14} /> On This Page</span>
                <ChevronDown size={14} className={`transition-transform ${isTocOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isTocOpen && (
                  <motion.nav
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white border border-gray-100 border-t-0 rounded-b-xl"
                  >
                    {headings.map(h => (
                      <a
                        key={h}
                        href={`#${slugify(h)}`}
                        onClick={() => setIsTocOpen(false)}
                        className="flex items-center justify-between p-3 text-[11px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-t border-gray-50"
                      >
                        <span className="truncate">{h}</span>
                        <ChevronRight size={12} className="text-gray-300 shrink-0" />
                      </a>
                    ))}
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop sticky TOC */}
            <div className="md:w-56 shrink-0 top-32 sticky hidden md:block no-print text-xs font-semibold">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">On this page</h4>
              <nav className="space-y-1">
                {headings.map(h => (
                  <a key={h} href={`#${slugify(h)}`} className="flex items-center justify-between p-2.5 rounded-lg text-gray-550 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <span className="truncate">{h}</span>
                    <ChevronRight size={13} className="text-gray-300 shrink-0" />
                  </a>
                ))}
              </nav>
            </div>
          </>
        )}

        {/* ── Document content ── */}
        <div className="flex-1 print-full-width w-full space-y-6">

          {isLoading ? (
            <div className="bg-white rounded-[2rem] border border-gray-150 shadow-xs no-print">
              <ContentSkeleton />
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-3.5 bg-white border border-gray-150 rounded-[2rem] no-print">
              <AlertCircle size={28} className="text-red-500 mx-auto" />
              <p className="text-xs text-gray-400 font-bold">Failed to load Terms of Service.</p>
            </div>
          ) : !document ? (
            <div className="text-center py-12 bg-amber-50 border border-amber-100 rounded-[2rem] space-y-2 no-print">
              <AlertCircle size={24} className="text-amber-500 mx-auto" />
              <p className="text-xs text-amber-700 font-bold">Terms not yet published in {language}.</p>
              {language !== 'English' && <p className="text-[10px] text-amber-600 font-semibold">Showing English fallback — translation not yet available.</p>}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-[2rem] border border-gray-150 shadow-xs print:border-none print:shadow-none print:p-0">

              {/* T6: Language fallback notice */}
              {language !== 'English' && document.language === 'English' && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold mb-4 no-print">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                  Showing English fallback — {language} translation not yet available.
                </div>
              )}

              {/* Content header */}
              <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900 font-display">{document.title}</h2>
                  {/* T1: Version tooltip */}
                  <span title={versionTooltip} className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block cursor-help flex items-center gap-1">
                    {document.status === 'draft' ? '(Draft) ' : ''}Version {document.version}
                    {document.published_at && ` • ${new Date(document.published_at).toLocaleDateString()}`}
                    <Clock size={8} className="inline ml-0.5" />
                  </span>
                </div>

                {isFounderMode && (
                  <div className="flex items-center gap-2 no-print">
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

              {/* Carrier cost warning */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4 mb-8 text-xs leading-relaxed no-print">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div className="font-semibold">
                  <h4 className="font-black text-amber-900 mb-1">Carrier Calling Costs Warning</h4>
                  <p className="text-amber-800">CallMind provides software automation. Outbound calling costs depend on your telecom provider SIM packages (Jio, Airtel). Unlimited caller configurations recommended.</p>
                </div>
              </div>

              {/* T4: Edit/Preview editor */}
              {isEditing ? (
                <FounderEditor editTitle={editTitle} setEditTitle={setEditTitle} editContent={editContent} setEditContent={setEditContent} editVersion={editVersion} />
              ) : (
                <div className="prose max-w-full">{renderContent(document.content)}</div>
              )}
            </motion.div>
          )}

          {/* T3: Acceptance checkbox panel */}
          {!isLoading && !isError && document && !hasAccepted && (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold no-print">
              <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 hover:text-gray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={acceptChecked}
                  onChange={e => setAcceptChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span>I have read and explicitly agree to the Terms of Service & CallMind System guidelines.</span>
              </label>
              <button
                onClick={handleAcceptSubmit}
                disabled={!acceptChecked || acceptTermsMutation.isPending}
                className="shrink-0 px-6 py-3 bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile flex items-center gap-1.5"
              >
                <Check size={13} /> Confirm Agreement
              </button>
            </div>
          )}
        </div>
      </div>

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
