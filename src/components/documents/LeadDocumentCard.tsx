import React, { useState, useEffect } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, Clock, Eye,
  ChevronRight, Download, AlertCircle, ShieldAlert, Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '@/supabaseClient';
import { DocumentItem, DocumentViewerModal } from './DocumentViewerModal';

export interface DocumentRequirementItem {
  id: string;
  company_id: string;
  category: string;
  title: string;
  is_mandatory: boolean;
}

export interface CombinedLeadDocumentRow {
  requirement: DocumentRequirementItem;
  document: DocumentItem | null;
}

interface LeadDocumentCardProps {
  leadId: string;
  leadData: {
    name: string;
    phone?: string;
    email?: string;
    status?: string;
    source?: string;
    value?: number;
    notes?: string;
    created_at?: string;
    custom_fields?: Record<string, any>;
  };
  userEmail: string;
  userRole: string;
  companyId: string;
}

export const LeadDocumentCard: React.FC<LeadDocumentCardProps> = ({
  leadId,
  leadData,
  userEmail,
  userRole,
  companyId,
}) => {
  const [combinedRows, setCombinedRows] = useState<CombinedLeadDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeViewerDoc, setActiveViewerDoc] = useState<DocumentItem | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isAdmin = ['admin', 'founder', 'super_admin'].includes(userRole);
  const isTelecaller = userRole === 'telecaller';

  useEffect(() => {
    fetchLeadDocuments();
  }, [leadId, companyId]);

  const fetchLeadDocuments = async () => {
    setLoading(true);
    try {
      // 1. Fetch requirements for this company
      const { data: reqs, error: reqErr } = await supabase
        .from('document_requirements')
        .select('*')
        .eq('company_id', companyId);

      if (reqErr) throw reqErr;

      // Default standard requirements if none seeded
      const requirements: DocumentRequirementItem[] = reqs && reqs.length > 0 ? reqs : [
        { id: 'req_1', company_id: companyId, category: 'aadhaar', title: 'Aadhaar Card', is_mandatory: true },
        { id: 'req_2', company_id: companyId, category: 'pan', title: 'PAN Card', is_mandatory: true },
        { id: 'req_3', company_id: companyId, category: 'bank_statement', title: 'Bank Statement', is_mandatory: true },
        { id: 'req_4', company_id: companyId, category: 'itr', title: 'ITR Return', is_mandatory: false },
        { id: 'req_5', company_id: companyId, category: 'business_proof', title: 'Business Proof', is_mandatory: false },
      ];

      // 2. Fetch documents uploaded for this lead
      const { data: docs, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .order('version', { ascending: false });

      if (docErr && !isTelecaller) throw docErr;

      const userDocs = docs || [];

      // Combine requirements with latest document version
      const rows: CombinedLeadDocumentRow[] = requirements.map((req) => {
        const matchingDoc = userDocs.find((d) => d.category === req.category) || null;
        return { requirement: req, document: matchingDoc };
      });

      setCombinedRows(rows);
    } catch (err: any) {
      toast.error('Failed to load lead document status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategory(category);
    const toastId = toast.loading(`Presigning ${file.name}...`);

    try {
      // Nothing in the codebase ever writes a 'supabase_token' key, so this
      // read always returned '' and every request below went out with an
      // empty bearer token.
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? '';

      // 1. Presign Upload URL
      const presignRes = await fetch('/v1/documents/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          lead_id: leadId,
          category,
          file_name: file.name,
          size_bytes: file.size,
          mime_type: file.type,
        }),
      });

      const presignData = await presignRes.json();

      if (!presignRes.ok) {
        throw new Error(presignData.error || 'Presign upload rejected');
      }

      // 2. Upload file directly to Cloudflare R2 presigned PUT URL
      toast.loading(`Uploading ${file.name} to storage...`, { id: toastId });
      const r2Res = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!r2Res.ok) {
        throw new Error('R2 cloud storage upload failed');
      }

      // 3. Confirm metadata insertion
      toast.loading('Confirming document registration...', { id: toastId });
      const confirmRes = await fetch('/v1/documents/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          lead_id: leadId,
          category,
          file_name: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          r2_key: presignData.r2_key,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || 'Confirmation failed');
      }

      toast.success('Document uploaded successfully!', { id: toastId });
      fetchLeadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleApproveDoc = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ status: 'approved', reviewed_by: userEmail, reviewed_at: new Date().toISOString() })
      .eq('id', docId);

    if (error) throw error;
    fetchLeadDocuments();
  };

  const handleRejectDoc = async (docId: string, reason: string) => {
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'rejected',
        reviewed_by: userEmail,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', docId);

    if (error) throw error;
    fetchLeadDocuments();
  };

  // Generate Admin PDF Bundle
  const handleDownloadBundle = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Generating lead verification PDF bundle...');

    try {
      const doc = new jsPDF();
      const dateStr = new Date().toISOString().split('T')[0];

      // Page 1: Lead Summary Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('CallMind CRM - Lead Document Verification Bundle', 14, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 28);
      doc.text(`Generated by: ${userEmail}`, 14, 34);

      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      // Lead Details Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Lead Summary', 14, 48);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lead Name: ${leadData.name || 'N/A'}`, 14, 56);
      doc.text(`Phone: ${leadData.phone || 'N/A'}`, 14, 62);
      doc.text(`Email: ${leadData.email || 'N/A'}`, 14, 68);
      doc.text(`Status: ${leadData.status || 'N/A'}`, 14, 74);
      doc.text(`Source: ${leadData.source || 'N/A'}`, 14, 80);
      doc.text(`Deal Value: ₹${(leadData.value || 0).toLocaleString('en-IN')}`, 14, 86);

      // Document Checklist Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Document Checklist Summary', 14, 100);

      let y = 108;
      doc.setFontSize(9);
      doc.text('Category', 14, y);
      doc.text('Status', 70, y);
      doc.text('File Name', 110, y);
      doc.text('Uploaded At', 160, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      combinedRows.forEach((row) => {
        doc.setFont('helvetica', 'normal');
        doc.text(row.requirement.title, 14, y);
        doc.text(row.document?.status || 'Missing', 70, y);
        doc.text((row.document?.file_name || '-').slice(0, 25), 110, y);
        doc.text(row.document?.created_at ? new Date(row.document.created_at).toLocaleDateString() : '-', 160, y);
        y += 7;
      });

      // Sanitise filename
      const safeLeadName = (leadData.name || 'Lead').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeLeadName} - ${dateStr}.pdf`;

      doc.save(filename);

      // Log access audit
      await supabase.from('document_access_log').insert({
        company_id: companyId,
        user_id: userEmail,
        access_type: 'bundle_download',
        ip_address: '127.0.0.1',
      });

      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err: any) {
      toast.error('Failed to generate PDF bundle', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const collectedCount = combinedRows.filter((r) => r.document !== null).length;
  const approvedCount = combinedRows.filter((r) => r.document?.status === 'approved').length;
  const totalCount = combinedRows.length;

  return (
    <div className="my-4">
      {/* Telecaller Status-Only View */}
      {isTelecaller ? (
        <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <FileText size={15} className="text-brand-500" /> Documents Status ({collectedCount}/{totalCount})
            </h4>
          </div>

          <div className="space-y-2">
            {combinedRows.map((row) => {
              const doc = row.document;
              return (
                <div key={row.requirement.id} className="p-3 bg-white rounded-xl border border-gray-150 flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-800">{row.requirement.title}</div>

                  <div>
                    {!doc ? (
                      <label className="px-3 py-1 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1">
                        <Upload size={12} /> {uploadingCategory === row.requirement.category ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e, row.requirement.category)}
                          className="hidden"
                          accept="image/*,application/pdf"
                          disabled={uploadingCategory !== null}
                        />
                      </label>
                    ) : doc.status === 'pending_review' ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
                        Sent • Under review
                      </span>
                    ) : doc.status === 'approved' ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                        Approved
                      </span>
                    ) : doc.status === 'rejected' ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-bold text-red-700 bg-red-50 rounded-full border border-red-200">
                          Rejected — {doc.rejection_reason || 'Unclear'}
                        </span>
                        <label className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-red-700">
                          Re-upload
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, row.requirement.category)}
                            className="hidden"
                            accept="image/*,application/pdf"
                            disabled={uploadingCategory !== null}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Admin Compact One-Line Card that Expands into Drawer */
        <>
          <div
            onClick={() => setDrawerOpen(true)}
            className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-gray-200 shadow-sm cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                📁
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Documents
                  <span className="text-xs font-semibold text-slate-500">
                    {collectedCount}/{totalCount} collected • {approvedCount} approved
                  </span>
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-50 text-brand-600 font-bold text-xs rounded-xl flex items-center gap-1 group-hover:bg-brand-100 transition-colors">
                <Plus size={14} /> Upload / Review
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Full List Drawer */}
          {drawerOpen && (
            <div className="fixed inset-0 z-[250] flex justify-end bg-slate-950/40 backdrop-blur-sm">
              <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-gray-200">
                {/* Header */}
                <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Documents • {leadData.name}</h3>
                    <p className="text-xs text-slate-500">{collectedCount} of {totalCount} requirements collected</p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
                  >
                    ✕
                  </button>
                </div>

                {/* Rows List */}
                <div className="flex-1 overflow-auto p-5 space-y-3 custom-scrollbar">
                  {combinedRows.map((row) => {
                    const doc = row.document;
                    return (
                      <div
                        key={row.requirement.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          doc ? 'bg-white border-gray-200 shadow-sm' : 'bg-slate-50/70 border-dashed border-gray-250 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{row.requirement.title}</span>
                              {row.requirement.is_mandatory && (
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required</span>
                              )}
                            </div>
                            {doc && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {doc.file_name} • {(doc.size_bytes / 1024).toFixed(1)} KB • by {doc.uploaded_by || 'User'}
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          {doc ? (
                            <div className="flex items-center gap-2">
                              {doc.status === 'approved' ? (
                                <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                                  Approved
                                </span>
                              ) : doc.status === 'rejected' ? (
                                <span className="px-2.5 py-1 text-[10px] font-bold text-red-700 bg-red-50 rounded-full border border-red-200">
                                  Rejected
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
                                  Pending Review
                                </span>
                              )}

                              <button
                                onClick={() => setActiveViewerDoc(doc)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1"
                              >
                                <Eye size={14} /> View
                              </button>
                            </div>
                          ) : (
                            <label className="px-3 py-1.5 bg-white text-slate-700 border border-gray-200 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer shadow-sm flex items-center gap-1">
                              <Upload size={13} /> {uploadingCategory === row.requirement.category ? 'Uploading...' : 'Upload'}
                              <input
                                type="file"
                                onChange={(e) => handleFileUpload(e, row.requirement.category)}
                                className="hidden"
                                accept="image/*,application/pdf"
                                disabled={uploadingCategory !== null}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PDF Download Bundle Footer Box */}
                {isAdmin && (
                  <div className="p-5 border-t border-gray-150 bg-slate-50">
                    <button
                      onClick={handleDownloadBundle}
                      disabled={isGeneratingPdf}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Download size={16} /> {isGeneratingPdf ? 'Generating PDF...' : 'Download Document Bundle (PDF)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Modal Viewer */}
          {activeViewerDoc && (
            <DocumentViewerModal
              document={activeViewerDoc}
              documentsList={combinedRows.map((r) => r.document).filter((d: DocumentItem | null): d is DocumentItem => d !== null)}
              userEmail={userEmail}
              isAdmin={isAdmin}
              onClose={() => setActiveViewerDoc(null)}
              onApprove={handleApproveDoc}
              onReject={handleRejectDoc}
              onNavigateDoc={(d) => setActiveViewerDoc(d)}
            />
          )}
        </>
      )}
    </div>
  );
};
