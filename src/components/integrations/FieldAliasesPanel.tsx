import { Plus, X } from 'lucide-react';
import type { FieldAliasesMap } from '@/types/integrations';

interface FieldAliasesPanelProps {
  fieldAliases: FieldAliasesMap;
  newAliasField: string;
  setNewAliasField: (v: string) => void;
  newAliasValue: string;
  setNewAliasValue: (v: string) => void;
  onAddAlias: () => void;
  onRemoveAlias: (fieldKey: string, alias: string) => void;
}

const TARGET_FIELDS = [
  { key: 'name', label: 'Customer Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email Address' },
  { key: 'budget', label: 'Investment Budget' },
  { key: 'propertyPreference', label: 'Property Preference' },
  { key: 'city', label: 'City' },
  { key: 'source', label: 'Lead Source' },
];

export function FieldAliasesPanel({
  fieldAliases, newAliasField, setNewAliasField,
  newAliasValue, setNewAliasValue, onAddAlias, onRemoveAlias,
}: FieldAliasesPanelProps) {
  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">Data Mapping Aliases</h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wide">Field Mapper</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Existing Aliases */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700">Registered Aliases</h4>
          {Object.entries(fieldAliases).map(([field, aliases]) => (
            <div key={field} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field}</p>
              <div className="flex flex-wrap gap-2">
                {(aliases || []).map((alias) => (
                  <span key={alias} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-700 flex items-center gap-1 group">
                    {alias}
                    <button onClick={() => onRemoveAlias(field, alias)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {(!aliases || aliases.length === 0) && (
                  <span className="text-[10px] text-gray-300 italic">No aliases set</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Alias */}
        <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100/50 space-y-4 h-fit">
          <h4 className="text-xs font-bold text-indigo-700">Add New Alias</h4>
          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
            Field aliases help the CSV importer and webhook parser automatically recognize column headers and map them to the correct CRM field.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target CRM Field</label>
              <select value={newAliasField} onChange={(e) => setNewAliasField(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none">
                {TARGET_FIELDS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Alias Name</label>
              <input type="text" value={newAliasValue} onChange={(e) => setNewAliasValue(e.target.value)} placeholder="e.g. Customer_Name, Full Name" onKeyDown={(e) => e.key === 'Enter' && onAddAlias()} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-300" />
            </div>
            <button onClick={onAddAlias} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors uppercase flex items-center justify-center gap-1">
              <Plus size={14} /> Register Alias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
