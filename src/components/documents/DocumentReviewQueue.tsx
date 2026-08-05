import React, { useState, useEffect } from 'react';
import {
  FileText, Filter, Search, CheckSquare, Square, CheckCircle,
  XCircle, Eye, Calendar, User, Clock, RefreshCw, AlertCircle, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import { DocumentItem, DocumentViewerModal, CANNED_REJECTION_REASONS } from './DocumentViewerModal';
import { NotificationService } from '../../services/notification.service';

interface DocumentReviewRow extends DocumentItem {
  lead_name?: string;
  telecaller_name?: string;
}

export const DocumentReviewQueue: React.FC<{ userEmail: string; userRole: string }> = ({
  userEmail,
  userRole,
}) => {
  const [documents, setDocuments] = useState<DocumentReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active modal viewer document
  const [activeViewerDoc, setActiveViewerDoc] = useState<DocumentItem | null>(null);

  // Bulk / Inline Rejection Modal State
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const isAdmin = ['admin', 'founder', 'super_admin'].includes(userRole);

  useEffect(() => {
    fetchReviewQueue();
  }, [statusFilter, categoryFilter]);

  const fetchReviewQueue = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          leads (name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted: DocumentReviewRow[] = (data || []).map((row: any) => ({
        ...row,
        lead_name: row.leads?.name || 'Unassigned Lead',
        telecaller_name: row.uploaded_by || 'Unknown Agent',
      }));

      setDocuments(formatted);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error('Failed to load document review queue');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;

      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          status: 'approved',
          reviewed_by: userEmail,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (updateErr) throw updateErr;

      // Insert audit review log
      await supabase.from('document_reviews').insert({
        company_id: doc.company_id,
        document_id: docId,
        action: 'approved',
        performed_by: userEmail,
      });

      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'approved' } : d))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Approval failed');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const toastId = toast.loading(`Approving ${count} selected documents...`);

    try {
      const selectedDocs = documents.filter((d) => selectedIds.has(d.id));

      for (const doc of selectedDocs) {
        await supabase
          .from('documents')
          .update({
            status: 'approved',
            reviewed_by: userEmail,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', doc.id);

        await supabase.from('document_reviews').insert({
          company_id: doc.company_id,
          document_id: doc.id,
          action: 'approved',
          performed_by: userEmail,
        });
      }

      toast.success(`Successfully approved ${count} documents`, { id: toastId });
      fetchReviewQueue();
    } catch (err: any) {
      toast.error('Bulk approval failed', { id: toastId });
    }
  };

  const handleRejectDocument = async (docId: string, reason: string) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;

      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          reviewed_by: userEmail,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', docId);

      if (updateErr) throw updateErr;

      // Insert audit review log
      await supabase.from('document_reviews').insert({
        company_id: doc.company_id,
        document_id: docId,
        action: 'rejected',
        reason,
        performed_by: userEmail,
      });

      // Dispatch notification to uploader telecaller
      if (doc.uploaded_by) {
        await NotificationService.createNotification({
          companyId: doc.company_id,
          userId: doc.uploaded_by,
          type: 'approval_required',
          priority: 'high',
          title: 'Document Rejected',
          body: `Your ${doc.category.toUpperCase()} document was rejected: ${reason}`,
        }).catch((): null => null);
      }

      setDocuments((prev: DocumentReviewRow[]) =>
        prev.map((d: DocumentReviewRow) => (d.id === docId ? { ...d, status: 'rejected', rejection_reason: reason } : d))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Rejection failed');
    }
  };

  const handleInlineRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDocId) return;

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      toast.error('Rejection reason is mandatory');
      return;
    }

    try {
      await handleRejectDocument(rejectingDocId, finalReason);
      toast.success('Document rejected');
      setRejectingDocId(null);
      setSelectedReason('');
      setCustomReason('');
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.file_name.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      (doc.lead_name && doc.lead_name.toLowerCase().includes(q)) ||
      (doc.uploaded_by && doc.uploaded_by.toLowerCase().includes(q))
    );
  });

  const pendingCount = documents.filter((d) => d.status === 'pending_review').length;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-3xl border border-slate-800 my-6 text-slate-400">
        <ShieldAlert size={48} className="mx-auto text-amber-500 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Access Restricted</h3>
        <p className="text-sm">The document review queue is reserved for Administrators and Founders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950 font-display">Document Review Queue</h1>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 font-bold text-xs rounded-full border border-amber-500/20 flex items-center gap-1.5">
              🟡 {pendingCount} pending review
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review and approve KYC and lead verification documents across all sales representatives.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReviewQueue}
            className="p-2.5 rounded-xl bg-white text-slate-600 hover:text-slate-900 border border-gray-200 shadow-sm transition-all"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2"
            >
              <CheckCircle size={16} /> Approve selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="pending_review">Status: Pending Review</option>
              <option value="approved">Status: Approved</option>
              <option value="rejected">Status: Rejected</option>
              <option value="all">Status: All</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Category: All</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="pan">PAN Card</option>
            <option value="bank_statement">Bank Statement</option>
            <option value="itr">ITR Return</option>
            <option value="business_proof">Business Proof</option>
            <option value="general">General Uploads</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search document, lead or agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 text-slate-800 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 font-medium"
          />
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
            Loading document queue...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-base">No documents found</p>
            <p className="text-xs text-slate-400">No uploads match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-gray-150">
                <tr>
                  <th className="p-4 pl-6 w-10">
                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-700">
                      {selectedIds.size === filteredDocs.length ? <CheckSquare size={16} className="text-brand-600" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="p-4">Document / Category</th>
                  <th className="p-4">Lead Name</th>
                  <th className="p-4">Uploaded By</th>
                  <th className="p-4">Uploaded Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr key={doc.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-brand-50/50' : ''}`}>
                      <td className="p-4 pl-6">
                        <button onClick={() => handleToggleSelect(doc.id)} className="text-slate-400 hover:text-slate-700">
                          {isSelected ? <CheckSquare size={16} className="text-brand-600" /> : <Square size={16} />}
                        </button>
                      </td>

                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-brand-500 shrink-0" />
                          <div>
                            <div className="text-slate-900 font-bold">{doc.file_name}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">{doc.category}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-slate-800">{doc.lead_name}</td>

                      <td className="p-4 text-slate-600">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-slate-400" /> {doc.telecaller_name}
                        </span>
                      </td>

                      <td className="p-4 text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock size={12} className="text-slate-400" /> {new Date(doc.created_at || '').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="p-4">
                        {doc.status === 'pending_review' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                            Pending Review
                          </span>
                        )}
                        {doc.status === 'approved' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                            Approved
                          </span>
                        )}
                        {doc.status === 'rejected' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 rounded-full" title={doc.rejection_reason || ''}>
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActiveViewerDoc(doc)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                            title="View Document"
                          >
                            <Eye size={14} /> View
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await handleApproveDocument(doc.id);
                                toast.success('Approved');
                              } catch (err: any) {
                                toast.error(err.message);
                              }
                            }}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                            title="Approve Document"
                          >
                            <CheckCircle size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setRejectingDocId(doc.id);
                              setSelectedReason('');
                              setCustomReason('');
                            }}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                            title="Reject Document"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Rejection Dialog */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-200 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertCircle className="text-red-500" size={18} /> Select Mandatory Rejection Reason
            </h3>

            <form onSubmit={handleInlineRejectSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {CANNED_REJECTION_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                      selectedReason === r
                        ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                        : 'bg-slate-50 text-slate-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedReason('Other')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    selectedReason === 'Other'
                      ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  Other / Custom
                </button>
              </div>

              {selectedReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom rejection reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-red-500"
                  required
                />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingDocId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedReason && !customReason}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Document Viewer Modal */}
      {activeViewerDoc && (
        <DocumentViewerModal
          document={activeViewerDoc}
          documentsList={filteredDocs}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onClose={() => setActiveViewerDoc(null)}
          onApprove={handleApproveDocument}
          onReject={handleRejectDocument}
          onNavigateDoc={(nextDoc) => setActiveViewerDoc(nextDoc)}
        />
      )}
    </div>
  );
};
