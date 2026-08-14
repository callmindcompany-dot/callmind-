/**
 * SmartImportModal.tsx  –  CallMind CRM · India's Best Lead Import Tool
 *
 * 3-step wizard: Upload → Map Columns → Review & Import
 *
 * Features:
 *   • 34 standard CRM fields + dynamic custom fields
 *   • Searchable combobox mapping dropdown (MappingSelect)
 *   • Data-pattern detection (phone / email / date / score)
 *   • Multi-phone conflict resolution (best column stays as 'phone')
 *   • Real Gemini AI cross-check with per-row Accept / Ignore
 *   • Remove / Undo / Restore columns
 *   • Save-All-Unmapped-to-Notes shortcut
 *   • Save & Load mapping presets (localStorage)
 *   • Targeted dedup (query only CSV phones)
 *   • Chunked bulk insert + update with live progress
 *   • Post-import error report + Retry Failed Rows
 *   • Sample CSV download
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Sparkles, Wand2, Database, AlertCircle, CheckCircle2,
  FileSpreadsheet, Download, RefreshCw, ArrowRight, ArrowLeft,
  Check, Zap, FileWarning, Info, ChevronDown, RotateCcw,
  Save, Bookmark, Trash2, Search,
} from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { toast } from 'react-hot-toast';
import { parsePlanLimitError } from '@/lib/planErrors';
import { bucketImportRows, DuplicatePolicy } from '@/lib/importBuckets';
import { trackTrialEvent } from '@/utils/trialTracking';
import { runAiMapper, type AICorrection } from '@/utils/aiMapper';
import { detectColumnPattern, pickBestPhoneColumn } from '@/utils/fieldPatterns';
import CallMindLoader from './CallMindLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedRow  = Record<string, string>;
type DupPolicy  = 'skip' | 'overwrite' | 'merge';
type WizardStep = 'upload' | 'map' | 'review';

interface CustomField      { id: string; label: string; }
interface CrmField         { key: string; label: string; }
interface CrmFieldGroup    { label: string; fields: CrmField[]; }

interface ValidatedRow {
  row: ParsedRow;
  isValid: boolean;
  errors: string[];
  cleanedName: string;
  cleanedPhone: string;
}

interface FailedRow {
  rowIndex: number;
  row: ParsedRow;
  errors: string[];
}

interface ImportStats {
  success: number;
  failed: number;
  skipped: number;
  updated: number;
  total: number;
}

interface ImportProgressDetail {
  current: number;
  total: number;
  status: string;
}

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

const PRESETS_KEY  = 'callmind_import_presets';
const CHUNK_SIZE   = 50;
const DEDUP_BATCH  = 500;

// ─── CRM Field Catalogue (34 standard fields) ─────────────────────────────────

const CRM_FIELD_GROUPS: CrmFieldGroup[] = [
  {
    label: 'Standard CRM Fields',
    fields: [
      { key: 'name',              label: 'Full Name / Customer Name'   },
      { key: 'phone',             label: 'Phone Number / Mobile'        },
      { key: 'email',             label: 'Email Address'                },
      { key: 'altPhone',          label: 'Alternate Phone Number'       },
      { key: 'altEmail',          label: 'Alternate Email'              },
      { key: 'status',            label: 'Lead Status'                  },
      { key: 'source',            label: 'Lead Source / Channel'        },
      { key: 'priority',          label: 'Lead Priority'                },
      { key: 'notes',             label: 'Notes / Remarks'              },
      { key: 'comment',           label: 'Comments'                     },
      { key: 'language',          label: 'Language'                     },
      { key: 'dnd_status',        label: 'DND / Do Not Call'           },
      { key: 'score',             label: 'Lead Score'                   },
      { key: 'score_points',      label: 'Score Points'                 },
      { key: 'sentiment',         label: 'Sentiment'                    },
      { key: 'city',              label: 'City / Town'                  },
      { key: 'state',             label: 'State / Province'             },
      { key: 'region',            label: 'Region / Zone / Area'        },
      { key: 'address',           label: 'Full Address'                 },
      { key: 'street',            label: 'Street Address'               },
      { key: 'postalCode',        label: 'Pincode / Zip Code'          },
      { key: 'country',           label: 'Country'                      },
      { key: 'assigned_to',       label: 'Assigned Agent / Owner'      },
      { key: 'last_contact_at', label: 'Last Contacted Date'          },
      { key: 'created_at',        label: 'Lead Created Date'            },
      { key: 'firstName',         label: 'First Name'                   },
      { key: 'lastName',          label: 'Last Name'                    },
      { key: 'companyName',       label: 'Company / Organization'       },
      { key: 'designation',       label: 'Job Title / Designation'      },
      { key: 'industry',          label: 'Industry / Sector'            },
      { key: 'website',           label: 'Website / URL'                },
      { key: 'turnover',          label: 'Annual Turnover / Revenue'    },
      { key: 'estimatedBudget',   label: 'Estimated Budget'             },
      { key: 'gstin',             label: 'GSTIN / GST Number'          },
    ],
  },
];

/** Columns that map directly to leads table; others go to custom_data */
const DIRECT_DB_COLUMNS = new Set([
  'name', 'phone', 'email', 'status', 'source', 'priority',
  'city', 'state', 'address', 'comment', 'notes', 'language',
  'region', 'dnd_status', 'score', 'score_points', 'sentiment',
  'assigned_to', 'last_contact_at', 'created_at',
]);

const ALL_STANDARD_KEYS = CRM_FIELD_GROUPS[0].fields.map(f => f.key);

// ─── Heuristic auto-mapper (English only) ─────────────────────────────────────

function heuristicMap(header: string): string {
  const l = header.toLowerCase().trim();

  if (/^(first\s*name|fname|given\s*name)$/.test(l))                                                       return 'firstName';
  if (/^(last\s*name|lname|surname|family\s*name)$/.test(l))                                               return 'lastName';
  if (/^(full\s*name|name|customer\s*name|client\s*name|lead\s*name|contact\s*name|person\s*name)$/.test(l)) return 'name';

  if (/^(alternate\s*phone|alt\s*phone|secondary\s*phone|other\s*phone|phone\s*2|mobile\s*2|ph\s*2)$/.test(l)) return 'altPhone';
  if (/^(alternate\s*email|alt\s*email|email\s*2|secondary\s*email)$/.test(l))                              return 'altEmail';

  if (/^(phone|mobile|cell|contact\s*number|phone\s*number|mobile\s*number|telephone|tel|primary\s*phone|whatsapp|ph\.?|mob\.?)$/.test(l)) return 'phone';
  if (/^(email|e-?mail|mail\s*id|email\s*address|e-?mail\s*address|email\s*id)$/.test(l))                  return 'email';

  if (/^(city|town|city\s*name)$/.test(l))                                                                  return 'city';
  if (/^(state|province|state\s*name)$/.test(l))                                                            return 'state';
  if (/^(region|zone|area)$/.test(l))                                                                       return 'region';
  if (/^(address|full\s*address|postal\s*address)$/.test(l))                                                return 'address';
  if (/^(street|street\s*address|street\s*name)$/.test(l))                                                  return 'street';
  if (/^(pincode|pin\s*code|zip\s*code|postal\s*code|zip|pin)$/.test(l))                                   return 'postalCode';
  if (/^(country)$/.test(l))                                                                                return 'country';

  if (/^(source|channel|lead\s*source|campaign|utm_source|origin|medium)$/.test(l))                        return 'source';
  if (/^(status|lead\s*status|stage)$/.test(l))                                                             return 'status';
  if (/^(priority|grade|segment|urgency)$/.test(l))                                                         return 'priority';
  if (/^(notes|remarks|description|message)$/.test(l))                                                      return 'notes';
  if (/^(comment|comments)$/.test(l))                                                                       return 'comment';
  if (/^(language|lang|preferred\s*language)$/.test(l))                                                     return 'language';
  if (/^(dnd|dnd\s*status|dnc|do\s*not\s*call|do\s*not\s*disturb)$/.test(l))                              return 'dnd_status';
  if (/^(score|lead\s*score|quality)$/.test(l))                                                             return 'score';
  if (/^(score\s*points|points)$/.test(l))                                                                  return 'score_points';
  if (/^(sentiment|mood)$/.test(l))                                                                         return 'sentiment';
  if (/^(assigned|owner|agent|handler|assigned\s*to)$/.test(l))                                             return 'assigned_to';
  if (/^(last\s*contacted|last\s*contact\s*date|contacted\s*at|last\s*call)$/.test(l))                     return 'last_contact_at';

  if (/^(company|organisation|organization|business\s*name|firm|company\s*name)$/.test(l))                  return 'companyName';
  if (/^(industry|sector|vertical)$/.test(l))                                                               return 'industry';
  if (/^(designation|title|role|job\s*title|position)$/.test(l))                                            return 'designation';
  if (/^(turnover|revenue|annual\s*turnover|annual\s*revenue)$/.test(l))                                    return 'turnover';
  if (/^(website|url|site|web)$/.test(l))                                                                   return 'website';
  if (/^(gst|gstin|gst\s*number|tax\s*id)$/.test(l))                                                      return 'gstin';
  if (/^(budget|price|cost|deal\s*value|estimated\s*budget)$/.test(l))                                      return 'estimatedBudget';

  return 'customData';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function downloadCsv(headers: string[], rows: ParsedRow[], filename: string): void {
  const lines = [
    headers.map(h => JSON.stringify(h)).join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── MappingSelect — searchable combobox ──────────────────────────────────────

interface MappingSelectProps {
  header: string;
  value: string;
  onChange: (value: string) => void;
  crmGroups: CrmFieldGroup[];
  customFields: CustomField[];
  hasSuggestion: boolean;
  wasAccepted: boolean;
}

const MappingSelect = React.memo(function MappingSelect({
  value,
  onChange,
  crmGroups,
  customFields,
  hasSuggestion,
  wasAccepted,
}: MappingSelectProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const wrapRef             = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const q = query.toLowerCase();

  const filteredStd = crmGroups[0].fields.filter(
    f => !q || f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
  );
  const filteredCustom = customFields.filter(
    cf => !q || cf.label.toLowerCase().includes(q) || cf.id.toLowerCase().includes(q),
  );

  const getLabel = (key: string): string => {
    if (key === '__skip__')    return '🚫 Do Not Import';
    if (key === 'customData')  return '📁 Save to Custom Notes';
    const std = crmGroups[0].fields.find(f => f.key === key);
    if (std) return std.label.split('/')[0].trim();
    const cf = customFields.find(c => c.id === key);
    if (cf) return `✨ ${cf.label}`;
    return key;
  };

  const pick = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const borderCls =
    wasAccepted   ? 'border-green-400 bg-green-50/40   text-green-800'  :
    hasSuggestion ? 'border-amber-300  bg-amber-50/40   text-amber-800'  :
    value === '__skip__'   ? 'border-gray-200  bg-gray-50      text-gray-400'   :
    value === 'customData' ? 'border-gray-200  bg-white        text-gray-500'   :
                             'border-blue-400  bg-blue-50/20   text-blue-800';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-1 px-3 py-2 border-2 rounded-xl text-[11px] font-bold outline-none transition-all ${borderCls}`}
      >
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[220px]">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={11} className="text-gray-300 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search fields…"
              className="flex-1 text-xs outline-none bg-transparent placeholder:text-gray-300"
            />
          </div>

          <div className="max-h-52 overflow-y-auto custom-scrollbar py-1">
            {/* Special options */}
            {(!q || 'notes custom save'.includes(q)) && (
              <button
                type="button"
                onClick={() => pick('customData')}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-blue-50 transition-colors ${value === 'customData' ? 'text-blue-600 font-bold' : 'text-gray-600'}`}
              >
                📁 Save to Custom Notes
              </button>
            )}
            {(!q || 'skip ignore'.includes(q)) && (
              <button
                type="button"
                onClick={() => pick('__skip__')}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-red-50 transition-colors ${value === '__skip__' ? 'text-red-500 font-bold' : 'text-gray-600'}`}
              >
                🚫 Do Not Import
              </button>
            )}

            {/* Standard CRM fields */}
            {filteredStd.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                  Standard CRM Fields
                </div>
                {filteredStd.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => pick(f.key)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-blue-50 transition-colors ${value === f.key ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </>
            )}

            {/* Custom fields */}
            {filteredCustom.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                  Your Custom Fields
                </div>
                {filteredCustom.map(cf => (
                  <button
                    key={cf.id}
                    type="button"
                    onClick={() => pick(cf.id)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-violet-50 transition-colors ${value === cf.id ? 'text-violet-600 font-bold bg-violet-50' : 'text-gray-700'}`}
                  >
                    ✨ {cf.label}
                  </button>
                ))}
              </>
            )}

            {/* Create new custom field */}
            {(!q || 'create new custom field'.includes(q)) && (
              <button
                type="button"
                onClick={() => pick('create_new_custom')}
                className="w-full text-left px-3 py-2 text-[11px] font-bold text-blue-500 hover:bg-blue-50 transition-colors border-t border-gray-50 mt-1"
              >
                ➕ Create New Custom Field…
              </button>
            )}

            {filteredStd.length === 0 && filteredCustom.length === 0 && q && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">No fields match "{query}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const SmartImportModal = ({ isOpen, onClose, companyId }: SmartImportModalProps) => {
  const { user } = useAuth();
  const plan = usePlan();

  // ── Wizard step
  const [step, setStep] = useState<WizardStep>('upload');

  // ── File & parsed data
  const [file, setFile]               = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData]   = useState<ParsedRow[]>([]);

  // ── Column mapping
  const [mapping, setMapping]         = useState<Record<string, string>>({});
  const [removedHeaders, setRemovedHeaders] = useState<Set<string>>(new Set());

  // ── AI cross-check
  const [aiCorrections, setAiCorrections]         = useState<AICorrection[]>([]);
  const [dismissedCorrections, setDismissedCorrections] = useState<Set<string>>(new Set());
  const [acceptedCorrections, setAcceptedCorrections]   = useState<Set<string>>(new Set());
  const [isAiLoading, setIsAiLoading]             = useState(false);

  // ── Validation
  const [validatedRows, setValidatedRows]     = useState<ValidatedRow[]>([]);
  const [validationStats, setValidationStats] = useState({ total: 0, valid: 0, invalid: 0 });

  // ── Custom fields from DB
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // ── Presets (localStorage)
  const [presets, setPresets] = useState<Record<string, Record<string, string>>>({});

  // ── Import state
  const [dupPolicy, setDupPolicy]         = useState<DupPolicy>('skip');
  const [isImporting, setIsImporting]     = useState(false);
  const [progressDetail, setProgressDetail] = useState<ImportProgressDetail>({ current: 0, total: 0, status: '' });
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats]     = useState<ImportStats>({ success: 0, failed: 0, skipped: 0, updated: 0, total: 0 });
  const [failedRows, setFailedRows]       = useState<FailedRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the complete list of valid field keys (used by AI mapper)
  const allFieldKeys = [...ALL_STANDARD_KEYS, ...customFields.map(cf => cf.id), 'customData', '__skip__'];

  // ── Fetch custom fields from Supabase ──────────────────────────────────────

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('custom_field_definitions')
      .select('field_key, field_label')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          setCustomFields(
            data.map(f => ({ id: String(f.field_key), label: String(f.field_label) })),
          );
        }
      });
  }, [companyId]);

  // ── Load presets from localStorage ────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) setPresets(JSON.parse(raw) as Record<string, Record<string, string>>);
    } catch { /* ignore */ }
  }, []);

  // ── Reset all state ───────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedHeaders([]);
    setParsedData([]);
    setMapping({});
    setRemovedHeaders(new Set());
    setAiCorrections([]);
    setDismissedCorrections(new Set());
    setAcceptedCorrections(new Set());
    setIsAiLoading(false);
    setValidatedRows([]);
    setValidationStats({ total: 0, valid: 0, invalid: 0 });
    setDupPolicy('skip');
    setIsImporting(false);
    setProgressDetail({ current: 0, total: 0, status: '' });
    setImportComplete(false);
    setImportStats({ success: 0, failed: 0, skipped: 0, updated: 0, total: 0 });
    setFailedRows([]);
  }, []);

  // ── File processing ───────────────────────────────────────────────────────

  const processFile = (f: File) => {
    setFile(f);
    const ext = f.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse<ParsedRow>(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) setupParsedData(results.meta.fields, results.data as ParsedRow[]);
        },
      });
    } else {
      alert('Excel imports are temporarily unavailable for security. Please export the file as CSV and upload the CSV file.');
    }
  };

  const setupParsedData = (headers: string[], rows: ParsedRow[]) => {
    setParsedHeaders(headers);
    setParsedData(rows);

    // 1. Heuristic mapping
    const initialMap: Record<string, string> = {};
    headers.forEach(h => { initialMap[h] = heuristicMap(h); });

    // 2. Multi-phone conflict resolution
    const winnerCol = pickBestPhoneColumn(headers, rows, initialMap);
    if (winnerCol !== null) {
      headers.forEach(h => {
        if (initialMap[h] === 'phone' && h !== winnerCol) {
          initialMap[h] = 'altPhone';
        }
      });
    }

    // 3. Data-pattern detection for still-unmapped columns
    const phoneAlreadyMapped = Object.values(initialMap).includes('phone');
    headers.forEach(h => {
      if (initialMap[h] === 'customData') {
        const samples = rows.slice(0, 5).map(r => String(r[h] ?? '').trim()).filter(Boolean);
        const detected = detectColumnPattern(samples, phoneAlreadyMapped);
        if (detected) initialMap[h] = detected;
      }
    });

    setMapping(initialMap);
    setRemovedHeaders(new Set());
    setAiCorrections([]);
    setDismissedCorrections(new Set());
    setAcceptedCorrections(new Set());
    runValidationEngine(rows, initialMap);
    setStep('map');
  };

  // ── Validation engine ─────────────────────────────────────────────────────

  const runValidationEngine = useCallback((rows: ParsedRow[], currentMapping: Record<string, string>) => {
    let valid = 0; let invalid = 0;

    const validated: ValidatedRow[] = rows.map(row => {
      const errors: string[] = [];
      let phone = ''; let name = ''; let firstName = ''; let lastName = ''; let email = '';

      for (const [header, val] of Object.entries(row)) {
        const field = currentMapping[header];
        const v     = String(val).trim();
        if (!v || !field || field === '__skip__') continue;
        if (field === 'phone')     phone     = v;
        if (field === 'name')      name      = v;
        if (field === 'firstName') firstName = v;
        if (field === 'lastName')  lastName  = v;
        if (field === 'email')     email     = v;
      }

      const computedName = name || [firstName, lastName].filter(Boolean).join(' ').trim();
      const cleanedPhone = phone.replace(/[^\d+]/g, '');

      if (!computedName)                                              errors.push('Missing Name');
      if (!cleanedPhone || cleanedPhone.length < 8)                  errors.push('Invalid / Missing Phone');
      if (email && (!email.includes('@') || !email.includes('.')))   errors.push('Malformed Email');

      const isValid = errors.length === 0;
      isValid ? valid++ : invalid++;
      return { row, isValid, errors, cleanedName: computedName || 'Unknown Lead', cleanedPhone };
    });

    setValidatedRows(validated);
    setValidationStats({ total: rows.length, valid, invalid });
  }, []);

  // ── Mapping change ─────────────────────────────────────────────────────────

  const handleMappingChange = (header: string, value: string) => {
    if (value === 'create_new_custom') {
      const label = window.prompt('Enter Custom Field Label (e.g. GSTIN, Car Model, Budget Range):');
      if (label) {
        const id = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        setCustomFields(prev => [...prev, { id, label }]);
        const updated = { ...mapping, [header]: id };
        setMapping(updated);
        runValidationEngine(parsedData, updated);
      }
      return;
    }
    const updated = { ...mapping, [header]: value };
    setMapping(updated);
    // Clear pending AI correction for this column if user overrides manually
    setAiCorrections(prev => prev.filter(c => c.column !== header));
    setDismissedCorrections(prev => { const n = new Set(prev); n.delete(header); return n; });
    setAcceptedCorrections(prev => { const n = new Set(prev); n.delete(header); return n; });
    runValidationEngine(parsedData, updated);
  };

  // ── Remove / Restore column ───────────────────────────────────────────────

  const handleRemoveColumn = (header: string) => {
    setRemovedHeaders(prev => new Set([...prev, header]));
    handleMappingChange(header, '__skip__');
  };

  const handleRestoreColumn = (header: string) => {
    setRemovedHeaders(prev => { const n = new Set(prev); n.delete(header); return n; });
    const restored = heuristicMap(header);
    handleMappingChange(header, restored);
  };

  const handleUndoAllRemoved = () => {
    const restored = { ...mapping };
    removedHeaders.forEach(h => { restored[h] = heuristicMap(h); });
    setMapping(restored);
    setRemovedHeaders(new Set());
    runValidationEngine(parsedData, restored);
  };

  // ── Save-All-Unmapped-to-Notes ────────────────────────────────────────────

  const handleSaveAllUnmappedToNotes = () => {
    const updated = { ...mapping };
    parsedHeaders.forEach(h => {
      if (updated[h] === 'customData') updated[h] = 'notes';
    });
    setMapping(updated);
    runValidationEngine(parsedData, updated);
  };

  // ── Preset save / load ────────────────────────────────────────────────────

  const handleSavePreset = () => {
    const name = window.prompt('Enter a name for this mapping preset:');
    if (!name) return;
    const updated = { ...presets, [name]: { ...mapping } };
    setPresets(updated);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets[name];
    if (!preset) return;
    setMapping(preset);
    setRemovedHeaders(new Set());
    runValidationEngine(parsedData, preset);
  };

  const handleDeletePreset = (name: string) => {
    const updated = { ...presets };
    delete updated[name];
    setPresets(updated);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // ── AI Cross-Check ────────────────────────────────────────────────────────

  const runAiCheck = async () => {
    setIsAiLoading(true);
    setAiCorrections([]);
    setDismissedCorrections(new Set());
    setAcceptedCorrections(new Set());

    try {
      const corrections = await runAiMapper({
        headers: parsedHeaders,
        parsedData,
        mapping,
        allFieldKeys,
      });
      setAiCorrections(corrections);
    } catch { /* silently ignore */ }
    finally { setIsAiLoading(false); }
  };

  const acceptAiCorrection = (correction: AICorrection) => {
    const updated = { ...mapping, [correction.column]: correction.suggested };
    setMapping(updated);
    setAcceptedCorrections(prev => new Set([...prev, correction.column]));
    setAiCorrections(prev => prev.filter(c => c.column !== correction.column));
    runValidationEngine(parsedData, updated);
  };

  const dismissAiCorrection = (column: string) => {
    setDismissedCorrections(prev => new Set([...prev, column]));
    setAiCorrections(prev => prev.filter(c => c.column !== column));
  };

  // ── Sample template download ──────────────────────────────────────────────

  const downloadSampleTemplate = () => {
    const stdHeaders = CRM_FIELD_GROUPS[0].fields.map(f => f.label.split('/')[0].trim());
    const cfHeaders  = customFields.map(cf => cf.label);
    const headers    = [...stdHeaders, ...cfHeaders];

    const sampleRow  = [
      'Rahul Sharma', '9876543210', 'rahul@example.com',
      'Alternate Mobile', 'rahul2@example.com',
      'New', 'Google Ads', 'High',
      'Interested in premium plan', 'Follow up needed',
      'English', 'No', '75', '80', 'Positive',
      'Mumbai', 'Maharashtra', 'West', '123 MG Road', 'Andheri East',
      '400069', 'India', '', '', '',
      'Rahul', 'Sharma', 'Example Corp', 'Sales Manager',
      'Information Technology', 'https://example.com',
      '5 Crore', '2 Lakh', '22AABCU9603R1ZX',
      ...customFields.map(() => ''),
    ];

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      sampleRow.slice(0, headers.length).map(v => `"${v}"`).join(','),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'callmind_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Lead payload builder ──────────────────────────────────────────────────

  const buildLeadPayload = (item: ValidatedRow): Record<string, unknown> => {
    const customFieldKeys  = new Set(customFields.map(cf => cf.id));
    const customData: Record<string, string>   = { importedAt: new Date().toISOString() };
    const customFieldsData: Record<string, string> = {};

    const payload: Record<string, unknown> = {
      company_id: companyId,
      name:       item.cleanedName,
      phone:      item.cleanedPhone,
      status:     'New',
      source:     'Import',
      priority:   'Medium',
    };

    const userId =
      (user as { id?: string; uid?: string } | null)?.id ??
      (user as { id?: string; uid?: string } | null)?.uid;
    if (userId) payload.assigned_to = userId;

    for (const [header, val] of Object.entries(item.row)) {
      const target = mapping[header];
      if (!target || target === '__skip__' || target === 'name' || target === 'phone') continue;
      const v = String(val).trim();
      if (!v) continue;

      if (target === 'firstName') {
        const parts = String(payload.name).split(' ');
        payload.name = [v, ...parts.slice(1)].join(' ').trim();
      } else if (target === 'lastName') {
        payload.name = `${String(payload.name)} ${v}`.trim();
      } else if (target === 'customData') {
        customData[header] = v;
      } else if (customFieldKeys.has(target)) {
        customFieldsData[target] = v;
      } else if (DIRECT_DB_COLUMNS.has(target)) {
        payload[target] = v;
      } else {
        // companyName, designation, gstin, website, etc. → custom_data
        customData[target] = v;
      }
    }

    payload.custom_data   = customData;
    payload.custom_fields = customFieldsData;
    return payload;
  };

  // ── Main import handler ───────────────────────────────────────────────────

  const handleImport = async (retryRows?: ValidatedRow[]) => {
    if (!companyId) return;
    setIsImporting(true);
    setProgressDetail({ current: 0, total: 0, status: 'Preparing…' });
    setImportComplete(false);

    const isMockMode =
      !import.meta.env.VITE_SUPABASE_URL ||
      (import.meta.env.VITE_SUPABASE_URL as string).includes('placeholder');

    const rowsToProcess = retryRows ?? validatedRows.filter(r => r.isValid);
    const total = rowsToProcess.length;

    // Pre-flight the plan limits before uploading anything.
    //
    // The database enforces both of these too, and its lead-limit trigger is
    // statement-level so an over-limit chunk rolls back whole rather than
    // half-importing. But finding out after pushing ten thousand rows is a
    // miserable way to learn you are on the wrong plan, so check here first.
    if (!plan.can('bulkImport')) {
      setIsImporting(false);
      toast.error(`Bulk import is not included in the ${plan.plan.name} plan. Upgrade to import a file.`);
      return;
    }

    const importCap = plan.limit('bulkImport');
    if (total > importCap) {
      setIsImporting(false);
      toast.error(
        `Your plan allows ${importCap.toLocaleString('en-IN')} rows per import; this file has ${total.toLocaleString('en-IN')}.`,
      );
      return;
    }

    const leadHeadroom = plan.remaining('leads');
    if (total > leadHeadroom) {
      setIsImporting(false);
      toast.error(
        `This import would exceed your lead limit. You have room for ${leadHeadroom.toLocaleString('en-IN')} more leads.`,
      );
      return;
    }

    let success = 0; let failed = 0; let skipped = 0; let updated = 0;
    const newFailedRows: FailedRow[] = [];

    // ── Mock mode ──────────────────────────────────────────────────────────
    if (isMockMode) {
      const existing: Record<string, unknown>[] = JSON.parse(
        localStorage.getItem('mock_leads') || '[]',
      );
      const existingPhones = new Set(existing.map(l => String(l.phone)));
      const newLeads: Record<string, unknown>[] = [];

      rowsToProcess.forEach((item, idx) => {
        if (existingPhones.has(item.cleanedPhone) && dupPolicy === 'skip') { skipped++; return; }
        newLeads.push({ id: `mock_${Date.now()}_${idx}`, ...buildLeadPayload(item) });
        success++;
        setProgressDetail({ current: idx + 1, total, status: 'Importing…' });
      });

      localStorage.setItem('mock_leads', JSON.stringify([...newLeads, ...existing]));
      window.dispatchEvent(new Event('storage_update'));
      setImportStats({ success, failed, skipped, updated, total });
      setFailedRows([]);
      setImportComplete(true);
      setIsImporting(false);
      return;
    }

    // ── Supabase live mode ─────────────────────────────────────────────────
    try {
      // 1. Targeted dedup (batch 500 phones at a time)
      const csvPhones = [...new Set(rowsToProcess.map(r => r.cleanedPhone).filter(Boolean))];
      const existingPhoneMap = new Map<string, {
        id: string;
        custom_data: Record<string, unknown>;
        custom_fields: Record<string, unknown>;
      }>();

      setProgressDetail({ current: 0, total, status: 'Checking duplicates…' });

      for (let i = 0; i < csvPhones.length; i += DEDUP_BATCH) {
        const batch = csvPhones.slice(i, i + DEDUP_BATCH);
        const { data, error: dedupError } = await supabase
          .from('leads')
          .select('id, phone, custom_data, custom_fields')
          .eq('company_id', companyId)
          .in('phone', batch)
          .eq('is_deleted', false);

        // The error used to be discarded. A failed lookup leaves the map empty,
        // which makes every row look new -- so "skip duplicates" would insert
        // the duplicates and "overwrite" would create second copies instead of
        // updating. Silently, and only on the batches that failed.
        if (dedupError) {
          throw new Error(
            `Could not check for existing leads, so the import was stopped before writing anything: ${dedupError.message}`,
          );
        }

        (data || []).forEach(lead => {
          if (lead.phone) {
            const cleaned = String(lead.phone).replace(/[^\d+]/g, '');
            existingPhoneMap.set(cleaned, {
              id:            String(lead.id),
              custom_data:   (lead.custom_data   as Record<string, unknown>) ?? {},
              custom_fields: (lead.custom_fields as Record<string, unknown>) ?? {},
            });
          }
        });
      }

      // 2. Bucket into inserts / updates / skips.
      //
      // In src/lib/importBuckets.ts so it can be tested on its own: each bucket
      // has to carry the index of the row it came from, and getting that wrong
      // is invisible in the counts.
      const buckets = bucketImportRows(
        rowsToProcess,
        existingPhoneMap,
        dupPolicy as DuplicatePolicy,
        buildLeadPayload,
      );
      const { inserts, updates } = buckets;
      skipped += buckets.skipped;

      const totalOps = inserts.length + updates.length;
      let completedOps = 0;
      const tick = (count = 1) => {
        completedOps += count;
        setProgressDetail({
          current: completedOps,
          total:   totalOps,
          status:  'Importing…',
        });
      };

      // 3. Chunked inserts
      for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
        const chunk = inserts.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('leads').insert(chunk.map(c => c.payload));
        if (error) {
          // The lead-limit trigger is statement-level, so an over-limit chunk
          // rolls back whole -- every row in it failed, not just one.
          chunk.forEach(({ sourceIndex }) => {
            newFailedRows.push({
              rowIndex: sourceIndex,
              row: rowsToProcess[sourceIndex]?.row ?? {},
              errors: [error.message],
            });
            failed++;
          });
        } else {
          success += chunk.length;
        }
        tick(chunk.length);
      }

      // 4. Chunked updates (Promise.allSettled per chunk)
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map(item => supabase.from('leads').update(item.payload).eq('id', item.id)),
        );
        results.forEach((result, j) => {
          const err =
            result.status === 'rejected'
              ? String((result as PromiseRejectedResult).reason)
              : (result as PromiseFulfilledResult<{ error: { message: string } | null }>).value.error?.message;
          if (err) {
            // `row: {}` here meant a failed update produced a blank line in the
            // error report and nothing for Retry to work with.
            const { sourceIndex } = chunk[j];
            newFailedRows.push({
              rowIndex: sourceIndex,
              row: rowsToProcess[sourceIndex]?.row ?? {},
              errors: [err],
            });
            failed++;
          } else {
            updated++;
          }
        });
        tick(chunk.length);
      }

      // 5. Analytics
      const userId =
        (user as { id?: string; uid?: string } | null)?.id ??
        (user as { id?: string; uid?: string } | null)?.uid;
      if (success > 0 && userId) {
        trackTrialEvent(companyId, userId, 'lead_imported', { leadsCount: success });
      }

      setImportStats({ success, failed, skipped, updated, total });
      setFailedRows(newFailedRows);
      setImportComplete(true);
    } catch (err) {
      // The message was thrown away behind a generic alert, so a plan-limit
      // rejection, an RLS denial and a dropped connection all read the same.
      console.error('[Import Error]', err);
      const message = err instanceof Error ? err.message : String(err);
      const planLimit = parsePlanLimitError(err);
      toast.error(planLimit ? planLimit.message : `Import failed: ${message}`, { duration: 8000 });

      // Whatever landed before the failure is real and already in the database.
      // Reporting zero would tell the user to import the file again.
      if (success > 0 || updated > 0 || failed > 0) {
        setImportStats({ success, failed, skipped, updated, total });
        setFailedRows(newFailedRows);
        setImportComplete(true);
      }
    } finally {
      setIsImporting(false);
    }
  };

  // ── Error report / Retry ──────────────────────────────────────────────────

  const downloadErrorReport = () => {
    const headers = [...parsedHeaders, '__errors__'];
    const rows = failedRows.map(fr => ({ ...fr.row, '__errors__': fr.errors.join('; ') }));
    downloadCsv(headers, rows, 'callmind_import_errors.csv');
  };

  const retryFailedRows = async () => {
    if (!failedRows.length) return;
    const retryValidated: ValidatedRow[] = failedRows.map(fr => {
      let phone = ''; let name = '';
      for (const [header, val] of Object.entries(fr.row)) {
        const field = mapping[header];
        if (field === 'phone') phone = String(val).replace(/[^\d+]/g, '');
        if (field === 'name')  name  = String(val).trim();
      }
      return { row: fr.row, isValid: true, errors: [] as string[], cleanedName: name || 'Unknown', cleanedPhone: phone };
    });
    setImportComplete(false);
    setProgressDetail({ current: 0, total: 0, status: '' });
    setImportStats({ success: 0, failed: 0, skipped: 0, updated: 0, total: 0 });
    setFailedRows([]);
    await handleImport(retryValidated);
  };

  // ── Label helper ──────────────────────────────────────────────────────────

  const getFieldLabel = (key: string): string => {
    if (key === '__skip__')    return 'Do Not Import';
    if (key === 'customData')  return 'Custom Notes';
    const std = CRM_FIELD_GROUPS[0].fields.find(f => f.key === key);
    if (std) return std.label.split('/')[0].trim();
    const cf  = customFields.find(c => c.id === key);
    if (cf) return cf.label;
    return key;
  };

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const stepOrder: WizardStep[]              = ['upload', 'map', 'review'];
  const stepLabels: Record<WizardStep, string> = { upload: 'Upload', map: 'Map Columns', review: 'Review & Import' };
  const currentStepIndex = stepOrder.indexOf(step);

  const activeHeaders    = parsedHeaders.filter(h => !removedHeaders.has(h));
  const removedCount     = removedHeaders.size;
  const pendingAiCount   = aiCorrections.filter(c => !dismissedCorrections.has(c.column)).length;
  const progressPercent  = progressDetail.total > 0 ? Math.round((progressDetail.current / progressDetail.total) * 100) : 0;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => { if (!isImporting) { resetState(); onClose(); } }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100 bg-white/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-tight">Smart Import</h2>
              <p className="text-[11px] font-semibold text-gray-400">India's Best CRM Lead Import Engine</p>
            </div>
          </div>

          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-1">
            {stepOrder.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  s === step                ? 'bg-blue-600 text-white'      :
                  i < currentStepIndex     ? 'bg-green-100 text-green-700'  :
                                             'bg-gray-100 text-gray-400'
                }`}>
                  {i < currentStepIndex ? <Check size={9} /> : <span className="text-[10px] opacity-70">{i + 1}</span>}
                  <span>{stepLabels[s]}</span>
                </div>
                {i < stepOrder.length - 1 && <div className="w-2 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>

          <button
            onClick={() => { if (!isImporting) { resetState(); onClose(); } }}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════════════════════════
                STEP 1 · Upload
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
                className="p-6 sm:p-8 space-y-5"
              >
                {/* Drop zone */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-56 border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-blue-50/30 hover:border-blue-400 transition-all rounded-2xl flex flex-col items-center justify-center cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
                  />
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="w-16 h-16 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"
                  >
                    <Upload size={26} />
                  </motion.div>
                  <h3 className="text-lg font-black text-gray-800">Upload CSV File</h3>
                  <p className="text-sm text-gray-400 font-medium mt-1.5">Drag & drop or click to browse · .csv</p>
                  <p className="text-xs text-gray-300 mt-1">Up to 10,000 rows supported</p>
                </div>

                {/* Download sample */}
                <div className="text-center">
                  <button onClick={downloadSampleTemplate} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                    <Download size={13} /> Download Sample Import Template
                  </button>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    Supports <strong>34 standard CRM fields</strong> (name, phone, DND, score, language, GSTIN, etc.)
                    + unlimited custom fields. <strong>Phone + Name are required.</strong> Multi-phone columns
                    are automatically resolved — the best column is kept as primary phone.
                  </p>
                </div>

                {/* Presets */}
                {Object.keys(presets).length > 0 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Bookmark size={10} /> Saved Mapping Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(presets).map(name => (
                        <div key={name} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                          <span className="text-[11px] font-bold text-gray-700">{name}</span>
                          <button
                            onClick={() => handleLoadPreset(name)}
                            className="text-[10px] text-blue-500 font-bold hover:underline ml-1"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeletePreset(name)}
                            className="text-gray-300 hover:text-red-400 ml-1"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2 · Map Columns
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
                className="p-6 sm:p-8 space-y-4"
              >
                {/* File badge */}
                {file && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <FileSpreadsheet size={13} className="text-blue-400" />
                    <span className="font-bold text-gray-700 truncate max-w-xs">{file.name}</span>
                    <span className="text-gray-300">·</span>
                    <span>{parsedData.length} rows · {parsedHeaders.length} columns</span>
                  </div>
                )}

                {/* Removed banner */}
                {removedCount > 0 && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-bold text-amber-700">
                      {removedCount} column{removedCount > 1 ? 's' : ''} marked "Do Not Import"
                    </span>
                    <button
                      onClick={handleUndoAllRemoved}
                      className="flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <RotateCcw size={10} /> Undo All
                    </button>
                  </div>
                )}

                {/* AI Banner */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5" />
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-sm flex items-center gap-2 mb-0.5">
                        <Zap size={14} className="text-yellow-300" /> AI Cross-Check Mapping
                      </h3>
                      <p className="text-blue-100 text-xs font-medium">
                        {pendingAiCount > 0
                          ? `${pendingAiCount} AI correction${pendingAiCount > 1 ? 's' : ''} waiting — review highlighted rows ↓`
                          : 'Heuristic + pattern detection complete · Run AI Check to verify with Gemini'}
                      </p>
                    </div>
                    <button
                      onClick={runAiCheck}
                      disabled={isAiLoading}
                      className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-black text-xs hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      {isAiLoading ? <><CallMindLoader size="xs" /> Analyzing…</> : <><Wand2 size={13} /> Run AI Check</>}
                    </button>
                  </div>
                </div>

                {/* AI corrections alert */}
                {pendingAiCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Sparkles size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 font-semibold">
                      Gemini found <strong>{pendingAiCount}</strong> potential mapping improvement{pendingAiCount > 1 ? 's' : ''}.
                      Review each highlighted row below — accept or ignore individually.
                    </p>
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveAllUnmappedToNotes}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Save size={10} /> Save All Unmapped → Notes
                  </button>
                  <button
                    onClick={handleSavePreset}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <Bookmark size={10} /> Save as Preset
                  </button>
                  {Object.keys(presets).length > 0 && (
                    <select
                      onChange={e => { if (e.target.value) { handleLoadPreset(e.target.value); e.target.value = ''; } }}
                      defaultValue=""
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[11px] font-bold outline-none cursor-pointer"
                    >
                      <option value="" disabled>Load Preset…</option>
                      {Object.keys(presets).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  )}
                </div>

                {/* Mapping table */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">CSV Column & Samples</div>
                    <div className="col-span-1 text-center" />
                    <div className="col-span-5">CRM Field</div>
                    <div className="col-span-1 text-center">⚙</div>
                  </div>

                  <div className="divide-y divide-gray-50/80 max-h-[38vh] overflow-y-auto custom-scrollbar">
                    {/* Active rows */}
                    {activeHeaders.map((header, idx) => {
                      const correction = aiCorrections.find(c => c.column === header);
                      const hasSuggestion = !!correction;
                      const wasAccepted   = acceptedCorrections.has(header);
                      const currentVal    = mapping[header] || 'customData';

                      return (
                        <div
                          key={header}
                          className={`grid grid-cols-12 gap-3 px-4 py-3 items-start transition-colors ${
                            hasSuggestion ? 'bg-amber-50/50' :
                            wasAccepted   ? 'bg-green-50/30'  :
                            'hover:bg-gray-50/50'
                          }`}
                        >
                          {/* # */}
                          <div className="col-span-1 text-center text-xs font-bold text-gray-300 pt-2.5">{idx + 1}</div>

                          {/* CSV column + samples */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-2.5 py-2 rounded-lg shadow-sm">
                              <FileSpreadsheet size={10} className="text-gray-300 shrink-0" />
                              <span className="text-xs font-mono font-semibold text-gray-700 truncate">{header}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 ml-1">
                              {[0, 1, 2].map(ri => {
                                const s = parsedData[ri]?.[header];
                                return s ? (
                                  <span key={ri} className="text-[9px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[68px]">
                                    {String(s).slice(0, 20)}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="col-span-1 flex justify-center pt-2.5 text-gray-200">
                            <ArrowRight size={12} />
                          </div>

                          {/* Select + AI row */}
                          <div className="col-span-5 space-y-1.5">
                            <MappingSelect
                              header={header}
                              value={currentVal}
                              onChange={v => handleMappingChange(header, v)}
                              crmGroups={CRM_FIELD_GROUPS}
                              customFields={customFields}
                              hasSuggestion={hasSuggestion}
                              wasAccepted={wasAccepted}
                            />

                            {/* AI correction row */}
                            {correction && (
                              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                                <Sparkles size={10} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] text-amber-700 font-bold">AI: </span>
                                  <span className="text-[10px] text-amber-800 font-black">{getFieldLabel(correction.suggested)}</span>
                                  <span className="text-[9px] text-amber-500 ml-1 truncate"> · {correction.reason}</span>
                                </div>
                                <button
                                  onClick={() => acceptAiCorrection(correction)}
                                  className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-black hover:bg-amber-600 transition-colors shrink-0"
                                >
                                  Accept ✓
                                </button>
                                <button
                                  onClick={() => dismissAiCorrection(correction.column)}
                                  className="px-2 py-0.5 bg-white border border-gray-200 text-gray-400 rounded-md text-[10px] font-bold hover:bg-gray-50 transition-colors shrink-0"
                                >
                                  Ignore ✗
                                </button>
                              </div>
                            )}

                            {/* Accepted badge */}
                            {wasAccepted && (
                              <div className="flex items-center gap-1">
                                <Check size={9} className="text-green-500" />
                                <span className="text-[10px] text-green-600 font-semibold">AI suggestion accepted</span>
                              </div>
                            )}
                          </div>

                          {/* Remove button */}
                          <div className="col-span-1 flex justify-center pt-2">
                            <button
                              onClick={() => handleRemoveColumn(header)}
                              title="Mark as Do Not Import"
                              className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Removed rows section */}
                    {removedCount > 0 && (
                      <>
                        <div className="px-4 py-2 bg-gray-50/80 text-[10px] font-black uppercase tracking-widest text-gray-300">
                          Removed Columns ({removedCount}) — click Restore to re-include
                        </div>
                        {[...removedHeaders].map(header => (
                          <div key={header} className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center opacity-50 hover:opacity-80 transition-opacity">
                            <div className="col-span-1" />
                            <div className="col-span-4">
                              <span className="text-xs font-mono text-gray-400 line-through">{header}</span>
                            </div>
                            <div className="col-span-1" />
                            <div className="col-span-5">
                              <span className="text-[11px] font-bold text-gray-400">🚫 Do Not Import</span>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                onClick={() => handleRestoreColumn(header)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-500 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                <RotateCcw size={9} /> Restore
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3 · Review & Import
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
                className="p-6 sm:p-8 space-y-5"
              >
                {/* ── Importing ─────────────────────────────────────────────── */}
                {isImporting && (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 flex flex-col items-center text-center">
                      <CallMindLoader size="md" />
                      <p className="mt-4 font-black text-gray-800 text-lg">{progressDetail.status}</p>
                      {progressDetail.total > 0 && (
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                          {progressDetail.current} of {progressDetail.total} rows processed — keep this window open
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full"
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ ease: 'easeOut', duration: 0.35 }}
                        />
                      </div>
                      <p className="text-center text-xs text-gray-400 font-semibold mt-2">{progressPercent}% complete</p>
                    </div>
                  </div>
                )}

                {/* ── Import complete ────────────────────────────────────────── */}
                {importComplete && !isImporting && (
                  <div className="space-y-5">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {([
                        { label: 'Inserted', value: importStats.success, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', ic: 'text-emerald-500', Icon: CheckCircle2 },
                        { label: 'Updated',  value: importStats.updated,  bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-700',    ic: 'text-blue-500',    Icon: RefreshCw    },
                        { label: 'Skipped',  value: importStats.skipped,  bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   ic: 'text-amber-500',   Icon: FileWarning  },
                        { label: 'Failed',   value: importStats.failed,   bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-700',     ic: 'text-red-500',     Icon: AlertCircle  },
                      ] as const).map(({ label, value, bg, border, text, ic, Icon }) => (
                        <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
                          <Icon size={18} className={`${ic} mx-auto mb-1.5`} />
                          <div className={`text-2xl font-black ${text}`}>{value}</div>
                          <div className={`text-[10px] font-black ${ic} uppercase tracking-wider mt-0.5`}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Failed rows panel */}
                    {failedRows.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-sm font-black text-red-700 flex items-center gap-1.5">
                            <FileWarning size={14} />
                            {failedRows.length} row{failedRows.length > 1 ? 's' : ''} failed
                          </h4>
                          <div className="flex items-center gap-2">
                            <button onClick={retryFailedRows} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                              <RefreshCw size={11} /> Retry
                            </button>
                            <button onClick={downloadErrorReport} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                              <Download size={11} /> Download CSV
                            </button>
                          </div>
                        </div>
                        {/* Failed rows mini table */}
                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                          <div className="grid grid-cols-12 text-[9px] font-black uppercase tracking-widest text-red-300 px-2 mb-1">
                            <div className="col-span-1">Row</div>
                            <div className="col-span-4">Name</div>
                            <div className="col-span-3">Phone</div>
                            <div className="col-span-4">Error</div>
                          </div>
                          {failedRows.slice(0, 15).map((fr, i) => {
                            const nameH  = parsedHeaders.find(h => mapping[h] === 'name');
                            const phoneH = parsedHeaders.find(h => mapping[h] === 'phone');
                            return (
                              <div key={i} className="grid grid-cols-12 text-[10px] bg-white border border-red-100 rounded-lg px-2 py-1.5 items-center gap-1">
                                <div className="col-span-1 font-bold text-red-400">{fr.rowIndex + 1}</div>
                                <div className="col-span-4 text-gray-600 truncate">{nameH ? fr.row[nameH] : '—'}</div>
                                <div className="col-span-3 text-gray-500 truncate font-mono">{phoneH ? fr.row[phoneH] : '—'}</div>
                                <div className="col-span-4 text-red-500 truncate">{fr.errors.join(', ')}</div>
                              </div>
                            );
                          })}
                          {failedRows.length > 15 && (
                            <p className="text-[10px] text-red-400 text-center font-medium pt-1">
                              +{failedRows.length - 15} more — download full error report above
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center pt-1">
                      <button onClick={() => { onClose(); resetState(); }} className="px-7 py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
                        <CheckCircle2 size={15} /> Close & View Leads
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Pre-import review ──────────────────────────────────────── */}
                {!isImporting && !importComplete && (
                  <>
                    {/* Validation summary */}
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                      validationStats.invalid > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      {validationStats.invalid > 0
                        ? <AlertCircle  size={16} className="text-red-500   mt-0.5 shrink-0" />
                        : <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                      }
                      <div>
                        <p className={`text-sm font-black ${validationStats.invalid > 0 ? 'text-red-800' : 'text-green-800'}`}>
                          {validationStats.invalid > 0
                            ? `${validationStats.invalid} rows have errors and will be skipped`
                            : `All ${validationStats.total} rows passed validation — ready to import`}
                        </p>
                        <p className={`text-xs mt-0.5 font-medium ${validationStats.invalid > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {validationStats.valid} valid · {validationStats.invalid} invalid · {parsedData.length} total
                        </p>
                      </div>
                    </div>

                    {/* Dup strategy */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duplicate Phone Strategy</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 'skip'      as DupPolicy, emoji: '🚫', label: 'Skip Duplicates',  desc: 'Keep existing record' },
                          { value: 'overwrite' as DupPolicy, emoji: '🔄', label: 'Overwrite',         desc: 'Replace with CSV data' },
                          { value: 'merge'     as DupPolicy, emoji: '🔗', label: 'Merge Data',        desc: 'Combine both records'  },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setDupPolicy(opt.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              dupPolicy === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="text-lg mb-1">{opt.emoji}</div>
                            <div className={`text-[11px] font-black leading-tight ${dupPolicy === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mapping summary */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Mapping Summary</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {parsedHeaders
                          .filter(h => mapping[h] && mapping[h] !== '__skip__')
                          .map(h => (
                            <div key={h} className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-mono text-gray-400 truncate max-w-[45%]">{h}</span>
                              <ArrowRight size={9} className="text-gray-300 shrink-0" />
                              <span className="font-bold text-blue-600 truncate">{getFieldLabel(mapping[h])}</span>
                            </div>
                          ))}
                      </div>
                      {parsedHeaders.filter(h => mapping[h] === '__skip__').length > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium mt-2 border-t border-gray-100 pt-2">
                          🚫 {parsedHeaders.filter(h => mapping[h] === '__skip__').length} column(s) excluded from import
                        </p>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-4">
          <div className="text-xs font-semibold text-gray-400">
            {parsedData.length > 0 && !importComplete && (
              <>
                {parsedData.length} rows ·{' '}
                <span className="text-emerald-500 font-bold">{validationStats.valid} valid</span>
                {validationStats.invalid > 0 && (
                  <> · <span className="text-red-400 font-bold">{validationStats.invalid} invalid</span></>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step !== 'upload' && !isImporting && !importComplete && (
              <button onClick={() => setStep(step === 'review' ? 'map' : 'upload')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {step === 'upload' && (
              <span className="text-xs text-gray-400 font-medium italic">Upload a file above to continue →</span>
            )}

            {step === 'map' && (
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-800 transition-colors"
              >
                Continue to Review <ArrowRight size={13} />
              </button>
            )}

            {step === 'review' && !isImporting && !importComplete && (
              <button
                onClick={() => handleImport()}
                disabled={validationStats.valid === 0}
                className="flex items-center gap-2 px-7 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 btn-tactile"
              >
                <Zap size={14} />
                Import {validationStats.valid} Lead{validationStats.valid !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
};
