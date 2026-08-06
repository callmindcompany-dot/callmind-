import React, { useState } from 'react';
import { Key, Plus, Trash2, ShieldCheck, Check, Zap, AlertCircle } from 'lucide-react';
import { useAiKeys } from '../hooks/useAiKeys';
import { useCompany } from '../CompanyContext';
import { AiTaskType } from '../types/aiKeys';

const ALL_TASKS: { type: AiTaskType; label: string; description: string; color: string }[] = [
  { type: 'draft', label: 'Drafts', description: 'WhatsApp & Email follow-up generation', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'sentiment', label: 'Sentiment', description: 'Lead score & emotion analysis', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'bulk', label: 'Bulk Import', description: 'CSV AI column mapping', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'chat', label: 'Chatbot', description: 'Interactive CRM support assistant', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

function maskApiKey(keyStr: string): string {
  if (!keyStr) return 'No Key';
  if (keyStr.length <= 8) return '••••••••';
  return `${keyStr.substring(0, 6)}••••••••${keyStr.substring(keyStr.length - 4)}`;
}

export const GeminiKeysManager: React.FC = () => {
  const { companyId } = useCompany();
  const { keys, isLoading, isSaving, addKey, removeKey, toggleKeyActive, updateKeyTasks } = useAiKeys(companyId);

  const [newKeyString, setNewKeyString] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<AiTaskType[]>(['draft', 'sentiment', 'bulk', 'chat']);

  const handleTaskToggleNew = (t: AiTaskType) => {
    setSelectedTasks(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleAddKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyString.trim()) return;
    addKey(newKeyString.trim(), selectedTasks);
    setNewKeyString('');
    setSelectedTasks(['draft', 'sentiment', 'bulk', 'chat']);
  };

  const activeKeysCount = keys.filter(k => k.isActive).length;

  return (
    <div className="space-y-6">
      {/* Pool Header & Load Balancer Status */}
      <div className="p-6 bg-white rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Key className="text-amber-500" size={20} />
              <h5 className="text-base font-bold tracking-tight text-slate-900">Gemini Multi-Key AI Pool</h5>
            </div>
            <p className="text-xs text-slate-500">
              Task-assigned load balancing with automatic failover & rate-limit resilience (up to 10 keys).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${activeKeysCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              <span className="font-semibold">{activeKeysCount} Active Key{activeKeysCount !== 1 ? 's' : ''}</span>
            </div>
            {isSaving && (
              <span className="text-xs text-amber-600 font-medium animate-pulse">Syncing...</span>
            )}
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display flex items-center gap-2">
            <Zap size={14} className="text-brand-600" />
            Configured Key Pool ({keys.length})
          </h6>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading API Key Pool...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
            <AlertCircle className="mx-auto text-slate-300" size={24} />
            <p className="text-xs text-slate-500 font-medium">No Gemini API keys added yet.</p>
            <p className="text-[11px] text-slate-400">Add a key below to enable task-balanced AI features.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {keys.map((k) => (
              <div key={k.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {maskApiKey(k.key)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleKeyActive(k.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        k.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {k.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  {/* Task Badges Toggle */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ALL_TASKS.map((t) => {
                      const isAssigned = k.tasks.includes(t.type);
                      return (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => {
                            const newTasks = isAssigned
                              ? k.tasks.filter(x => x !== t.type)
                              : [...k.tasks, t.type];
                            updateKeyTasks(k.id, newTasks);
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all border ${
                            isAssigned
                              ? t.color
                              : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => removeKey(k.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Key Form */}
      <form onSubmit={handleAddKeySubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
        <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display flex items-center gap-2">
          <Plus size={14} className="text-brand-600" />
          Add New Gemini API Key
        </h6>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gemini API Key</label>
            <input
              type="password"
              placeholder="Paste AIzaSy... API key"
              value={newKeyString}
              onChange={(e) => setNewKeyString(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Task Pool Groups</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_TASKS.map((t) => {
                const checked = selectedTasks.includes(t.type);
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => handleTaskToggleNew(t.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      checked
                        ? 'bg-brand-50/70 border-brand-300 text-brand-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{t.label}</span>
                      {checked && <Check size={14} className="text-brand-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newKeyString.trim() || isSaving}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Plus size={16} />
            Add Key to Pool
          </button>
        </div>
      </form>
    </div>
  );
};
