import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Database, Save, Check } from 'lucide-react';
import { useCustomFields } from '../hooks/useCustomFields';
import { CustomFieldDefinition } from '../types/lead';
import CallMindLoader from './CallMindLoader';

interface CustomFieldManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomFieldManager: React.FC<CustomFieldManagerProps> = ({ isOpen, onClose }) => {
  const { fields, isLoading, createField, updateField, deleteField, isCreating } = useCustomFields();
  
  // State for new field form
  const [isAdding, setIsAdding] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [selectOptionsText, setSelectOptionsText] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const resetForm = () => {
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setSelectOptionsText('');
    setIsRequired(false);
    setIsAdding(false);
    setEditingFieldId(null);
  };

  const handleEditClick = (field: CustomFieldDefinition) => {
    setEditingFieldId(field.id);
    setFieldLabel(field.field_label);
    setFieldKey(field.field_key);
    setFieldType(field.field_type);
    setIsRequired(field.is_required || false);
    
    if (Array.isArray(field.select_options)) {
      setSelectOptionsText(field.select_options.join(', '));
    } else {
      setSelectOptionsText('');
    }
    
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel || !fieldKey) return;

    const parsedOptions = fieldType === 'select'
      ? selectOptionsText.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      if (editingFieldId) {
        await updateField({
          id: editingFieldId,
          data: {
            field_label: fieldLabel,
            field_type: fieldType,
            select_options: parsedOptions,
            is_required: isRequired
          }
        });
      } else {
        // Automatically make sure key has no spaces or special chars
        const sanitizedKey = fieldKey.toLowerCase().replace(/[^a-z0-9_]/g, '');
        await createField({
          field_key: sanitizedKey,
          field_label: fieldLabel,
          field_type: fieldType,
          select_options: parsedOptions,
          is_required: isRequired,
          is_active: true,
          order_index: fields.length
        });
      }
      resetForm();
    } catch (err) {
      // Error is handled inside hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black font-display text-slate-900">Lead Custom Fields</h2>
              <p className="text-slate-400 text-xs font-semibold">Manage additional attributes for lead profiles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {isAdding ? (
            /* Add/Edit Form */
            <form onSubmit={handleSubmit} className="space-y-6 border border-slate-100 rounded-3xl p-6 bg-slate-50/30">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                {editingFieldId ? 'Edit Custom Field' : 'Create Custom Field'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Field Label (Display Name)</label>
                  <input
                    type="text"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    placeholder="e.g. GST Number"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[15px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Field Key (Permanent Database Key)</label>
                  <input
                    type="text"
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    placeholder="e.g. gst_number"
                    disabled={!!editingFieldId}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[15px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300 disabled:bg-slate-100/50 disabled:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Type</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as any)}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[15px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold cursor-pointer"
                  >
                    <option value="text">Text string</option>
                    <option value="number">Numeric value</option>
                    <option value="select">Dropdown Selection</option>
                    <option value="boolean">Yes / No Switch</option>
                  </select>
                </div>

                <div className="flex items-center h-[76px] pl-1">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20"
                    />
                    <span className="text-sm font-bold text-slate-700">Make this field mandatory (Required)</span>
                  </label>
                </div>
              </div>

              {fieldType === 'select' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Dropdown Options (Comma-separated)</label>
                  <textarea
                    value={selectOptionsText}
                    onChange={(e) => setSelectOptionsText(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[15px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300 min-h-[80px] resize-none"
                    required
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-[15px] font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-[2] py-3.5 bg-brand-600 text-white rounded-[15px] font-black uppercase tracking-widest text-[10px] hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isCreating ? <CallMindLoader size="xs" /> : <Save className="w-4 h-4" />}
                  <span>Save Field Def</span>
                </button>
              </div>
            </form>
          ) : (
            /* Field List */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Current Custom Fields ({fields.length})</h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 transition-colors uppercase tracking-wide flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add Custom Field
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 flex justify-center"><CallMindLoader size="md" /></div>
              ) : fields.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">No custom fields created yet</p>
                  <p className="text-xs text-slate-300 mt-1">Create custom fields to store company-specific attributes</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-3xl divide-y divide-slate-100 overflow-hidden">
                  {fields.map((field) => (
                    <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{field.field_label}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {field.field_type}
                          </span>
                          {field.is_required && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-md text-[9px] font-black uppercase tracking-wider">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1">Database key: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-500">{field.field_key}</code></p>
                        {field.field_type === 'select' && Array.isArray(field.select_options) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.select_options.map(opt => (
                              <span key={opt} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(field)}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${field.field_label}?`)) {
                              deleteField(field.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
