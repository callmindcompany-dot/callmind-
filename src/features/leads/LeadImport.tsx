import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Upload, X, FileText, CheckCircle2, 
  AlertCircle, ArrowRight,
  Database, Table, Layout, Zap
} from 'lucide-react';
import CallMindLoader from '@components/CallMindLoader';
import { LeadSource, LeadStatus, LeadFormData } from '../../types/lead';
import { LeadService } from '../../services/leads.service';
import { useCompany } from '../../CompanyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface LeadImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

/**
 * LeadImport Component
 * High-performance CSV ingestion with column mapping preview
 */
export const LeadImport: React.FC<LeadImportProps> = ({ onClose, onImportComplete }) => {
  const { companyId } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data.slice(0, 5));
      },
      error: () => toast.error('Error parsing cryptographic CSV')
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawLeads = results.data as any[];
          const total = rawLeads.length;
          
          const leadsToImport = rawLeads.map((row: any) => ({
            name: row.name || row.Name || row.FullName || 'Unknown Prospect',
            phone: (row.phone || row.Phone || row.Contact || '').toString().replace(/\D/g, ''),
            email: row.email || row.Email || '',
            source: (row.source || row.Source || LeadSource.OTHER) as LeadSource,
            status: LeadStatus.NEW,
            city: row.city || row.City || '',
            state: row.state || row.State || '',
            notes: `Imported via CSV: ${file.name}`,
          })) as LeadFormData[];

          const validLeads = leadsToImport.filter(l => l.name && l.phone.length >= 10);
          if (validLeads.length === 0) throw new Error('No valid intelligence entries found (names/phones missing)');

          const chunkSize = 20;
          for (let i = 0; i < validLeads.length; i += chunkSize) {
            const chunk = validLeads.slice(i, i + chunkSize);
            if (!companyId) throw new Error('Company ID context is missing');
            await LeadService.bulkImport(companyId, chunk);
            setImportProgress(Math.round(((i + chunk.length) / validLeads.length) * 100));
          }

          toast.success(`Pipeline Synchronized: ${validLeads.length} leads ingested`);
          onImportComplete();
          onClose();
        } catch (error: any) {
          toast.error(error.message || 'Data integration failed');
        } finally {
          setIsImporting(false);
          setImportProgress(0);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 fill-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">Bulk Ingestion Engine</h2>
              <p className="text-slate-400 text-sm font-medium">Inject high-volume leads into your CRM pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div 
                key="upload-zone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-slate-100 rounded-[40px] p-16 flex flex-col items-center justify-center gap-6 hover:border-brand-500 hover:bg-brand-50/30 transition-all cursor-pointer group"
              >
                <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[35px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black font-display text-slate-900">Deploy CSV Strategy</p>
                  <p className="text-slate-400 font-medium mt-2">Upload your Lead Matrix (max 10,000 entries)</p>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="preview-zone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                {/* File Summary Card */}
                <div className="flex items-center gap-6 p-6 bg-slate-900 text-white rounded-[30px] shadow-xl">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Database className="w-8 h-8 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold truncate">{file.name}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mt-1">Ready for Mapping System</p>
                  </div>
                  <button onClick={() => setFile(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mapping Intelligence Preview */}
                <div>
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <Table className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mapping Intelligence Preview</h3>
                  </div>
                  <div className="overflow-x-auto rounded-[30px] border border-slate-100 shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                            <th key={key} className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-slate-500">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewData.map((row, i) => (
                          <tr key={i} className="bg-white hover:bg-slate-50/50 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-6 py-4 text-slate-600 font-medium truncate max-w-[120px]">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Safety Guidelines */}
                <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[30px] flex gap-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">Operational Protocol</p>
                    <p className="text-sm text-amber-800 font-medium leading-relaxed">Ensure 'Name' and 'Phone' headers are present. Duplicate contacts will be merged or skipped based on security settings.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Controls */}
        <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col gap-6">
          {isImporting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 px-2">
                <span>Ingestion Progress</span>
                <span className="text-brand-600">{importProgress}%</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress}%` }}
                  className="h-full bg-brand-600 rounded-full shadow-lg shadow-brand-600/30"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-[25px] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
            >
              Cancel Mission
            </button>
            <button 
              onClick={handleImport}
              disabled={!file || isImporting}
              className="flex-[2] py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/30 hover:bg-slate-950 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <CallMindLoader size="xs" />
                  <span>Integrating Data...</span>
                </>
              ) : (
                <>
                  <span>Begin Import Sequence</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
