import React from 'react';
import { CustomFieldDefinition } from '../types/lead';
import { HelpCircle } from 'lucide-react';

interface DynamicFieldRendererProps {
  fields: CustomFieldDefinition[];
  register: any;
  errors: any;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({ fields, register, errors }) => {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Additional Fields</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {fields.map((field) => {
          const error = errors.custom_fields?.[field.field_key];
          
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  {field.field_label}
                  {field.is_required && <span className="text-rose-500">*</span>}
                </label>
                {field.validation_rule?.help_text && (
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-20 font-medium">
                      {field.validation_rule.help_text}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                {field.field_type === 'select' ? (
                  <select
                    {...register(`custom_fields.${field.field_key}`, {
                      required: field.is_required ? `${field.field_label} is required` : false
                    })}
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Select option</option>
                    {(Array.isArray(field.select_options) ? field.select_options : []).map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.field_type === 'boolean' ? (
                  <div className="flex items-center h-[56px] px-6 bg-slate-50 rounded-[20px]">
                    <label className="flex items-center gap-3 cursor-pointer w-full select-none">
                      <input
                        type="checkbox"
                        {...register(`custom_fields.${field.field_key}`)}
                        className="w-5 h-5 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500/20"
                      />
                      <span className="text-sm font-bold text-slate-700">Yes / Enable</span>
                    </label>
                  </div>
                ) : (
                  <input
                    type={field.field_type === 'number' ? 'number' : 'text'}
                    {...register(`custom_fields.${field.field_key}`, {
                      required: field.is_required ? `${field.field_label} is required` : false,
                      valueAsNumber: field.field_type === 'number' ? true : false
                    })}
                    placeholder={`Enter ${field.field_label.toLowerCase()}`}
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300"
                  />
                )}
                
                {error && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1.5 pl-1 uppercase tracking-wider">
                    {error.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
