import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  ChevronRight, 
  Clock, 
  Users, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  Settings2, 
  AlertCircle, 
  X, 
  Sparkles,
  Mail,
  UserPlus,
  RefreshCw,
  PlusCircle,
  Tag,
  Bell,
  Globe,
  Trash,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  XCircle,
  Sliders,
  HelpCircle,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '@/CompanyContext';
import { useAuth } from '@/AuthContext';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useAutomationLogs, AutomationLog } from '@/hooks/useAutomationLogs';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { useTeamMembers } from '@/hooks/useTeam';
import { AutomationRule, RuleConditionGroup, WorkflowAction, RuleCondition } from '@/types/settings';

const ICON_LIST = [
  { value: 'Zap', icon: Zap },
  { value: 'Sparkles', icon: Sparkles },
  { value: 'Phone', icon: Phone },
  { value: 'MessageSquare', icon: MessageSquare },
  { value: 'Mail', icon: Mail }
];

export const AutomationPage: React.FC = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  // Supabase Hooks & Queries
  const { rules, isLoading: loadingRules, createRule, updateRule, deleteRule } = useAutomationRules(companyId);
  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = useAutomationLogs(companyId);
  const { templates } = useMessageTemplates(companyId);
  const { data: members = [] } = useTeamMembers(companyId);

  // Rule Form States
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleIcon, setRuleIcon] = useState('Zap');
  const [ruleTrigger, setRuleTrigger] = useState('lead_created');
  
  // Rule Conditions State (Nested Groups)
  const [conditionGroups, setConditionGroups] = useState<RuleConditionGroup[]>([
    { logicalOperator: 'AND', conditions: [] }
  ]);

  // Actions List sequence
  const [steps, setSteps] = useState<WorkflowAction[]>([]);

  // Live feed updates (Poll every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchLogs]);

  // Triggers Definition
  const triggersList = [
    { value: 'lead_created', label: 'Lead Created' },
    { value: 'lead_status_changed', label: 'Lead Status Changed' },
    { value: 'lead_assigned', label: 'Lead Assigned' },
    { value: 'call_missed', label: 'Call Missed' },
    { value: 'call_completed', label: 'Call Completed' },
    { value: 'no_contact', label: 'No Contact Duration' }
  ];

  // Actions Definition
  const actionsList = [
    { value: 'send_whatsapp', label: 'Send WhatsApp Template', icon: MessageSquare },
    { value: 'send_email', label: 'Send Email Template', icon: Mail },
    { value: 'assign_agent', label: 'Assign to Agent', icon: UserPlus },
    { value: 'change_status', label: 'Change Lead Status', icon: RefreshCw },
    { value: 'add_tag', label: 'Add Tag', icon: Tag },
    { value: 'remove_tag', label: 'Remove Tag', icon: Trash },
    { value: 'webhook', label: 'Call Webhook URL', icon: Globe },
    { value: 'wait', label: 'Wait / Delay', icon: Clock }
  ];

  // Quick Preset Templates
  const presetTemplates = [
    {
      name: 'Source-wise Welcome Campaign',
      desc: 'Send customized WhatsApp messages to Facebook leads instantly.',
      trigger: 'lead_created',
      icon: 'Sparkles',
      groups: [
        {
          logicalOperator: 'AND' as const,
          conditions: [{ field: 'source', operator: 'equals' as const, value: 'Facebook' }]
        }
      ],
      steps: [
        { id: '1', type: 'send_whatsapp' as const, config: {} },
        { id: '2', type: 'wait' as const, config: { duration: 15, unit: 'minutes' } }
      ]
    },
    {
      name: 'City-wise Priority Router',
      desc: 'Assign Leads from Mumbai/Delhi directly to Senior Account Directors.',
      trigger: 'lead_created',
      icon: 'Zap',
      groups: [
        {
          logicalOperator: 'OR' as const,
          conditions: [
            { field: 'city', operator: 'equals' as const, value: 'Mumbai' },
            { field: 'city', operator: 'equals' as const, value: 'Delhi' }
          ]
        }
      ],
      steps: [
        { id: '1', type: 'change_status' as const, config: { status: 'Interested' } },
        { id: '2', type: 'assign_agent' as const, config: { mode: 'specific' } }
      ]
    },
    {
      name: 'Hot Lead Priority Alert',
      desc: 'Escalate VIP high-yield leads and trigger instant SMS alerts.',
      trigger: 'lead_status_changed',
      icon: 'AlertCircle',
      groups: [
        {
          logicalOperator: 'AND' as const,
          conditions: [{ field: 'status', operator: 'equals' as const, value: 'Interested' }]
        }
      ],
      steps: [
        { id: '1', type: 'add_tag' as const, config: { tag: 'VIP' } },
        { id: '2', type: 'internal_notification' as const, config: { message: 'New HOT Lead Escalated!' } }
      ]
    },
    {
      name: 'Language Router Sequence',
      desc: 'Match English/Hindi speaking leads to native-speaking callers.',
      trigger: 'lead_created',
      icon: 'Users',
      groups: [
        {
          logicalOperator: 'AND' as const,
          conditions: [{ field: 'language', operator: 'equals' as const, value: 'Hindi' }]
        }
      ],
      steps: [
        { id: '1', type: 'assign_agent' as const, config: { mode: 'round_robin' } }
      ]
    },
    {
      name: 'Industry-wise Onboarding',
      desc: 'Deploy custom SaaS vs Real Estate intro emails on registration.',
      trigger: 'lead_created',
      icon: 'Mail',
      groups: [
        {
          logicalOperator: 'AND' as const,
          conditions: [{ field: 'industry', operator: 'equals' as const, value: 'SaaS' }]
        }
      ],
      steps: [
        { id: '1', type: 'send_email' as const, config: {} }
      ]
    },
    {
      name: 'Round Robin Load Balancer',
      desc: 'Distribute lead assignment evenly across telecallers.',
      trigger: 'lead_created',
      icon: 'Phone',
      groups: [],
      steps: [
        { id: '1', type: 'assign_agent' as const, config: { mode: 'round_robin' } }
      ]
    }
  ];

  // Stats Analytics
  const stats = useMemo(() => {
    const activeRulesCount = rules.filter(r => r.is_active).length;
    const totalRuns = logs.length;
    const successRuns = logs.filter(l => l.status === 'success').length;
    const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : '100';

    return {
      activeRules: activeRulesCount,
      processedLeads: totalRuns,
      successRate: `${successRate}%`,
      activeToday: logs.filter(l => {
        const today = new Date().toDateString();
        return new Date(l.executed_at).toDateString() === today;
      }).length
    };
  }, [rules, logs]);

  // Action step functions
  const handleAddStep = (type: WorkflowAction['type']) => {
    const newStep: WorkflowAction = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      config: type === 'wait' ? { duration: 10, unit: 'minutes' } : {}
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleUpdateStepConfig = (id: string, newConfig: Record<string, string | number | boolean | string[]>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, config: { ...s.config, ...newConfig } } : s));
  };

  // Conditions logic functions
  const handleAddConditionGroup = () => {
    setConditionGroups([...conditionGroups, { logicalOperator: 'AND', conditions: [] }]);
  };

  const handleAddConditionToGroup = (groupIdx: number) => {
    const updated = [...conditionGroups];
    updated[groupIdx].conditions.push({ field: 'source', operator: 'equals', value: '' });
    setConditionGroups(updated);
  };

  const handleUpdateCondition = (groupIdx: number, condIdx: number, updates: Partial<RuleCondition>) => {
    const updated = [...conditionGroups];
    updated[groupIdx].conditions[condIdx] = { ...updated[groupIdx].conditions[condIdx], ...updates };
    setConditionGroups(updated);
  };

  const handleRemoveCondition = (groupIdx: number, condIdx: number) => {
    const updated = [...conditionGroups];
    updated[groupIdx].conditions.splice(condIdx, 1);
    setConditionGroups(updated);
  };

  // Wizard Save Logic
  const handleOpenWizard = (rule: AutomationRule | null = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.name);
      setRuleDesc(rule.description || '');
      setRuleIcon(rule.icon || 'Zap');
      setRuleTrigger(rule.trigger_type);
      setConditionGroups((rule.trigger_config?.conditionGroups as RuleConditionGroup[]) || [{ logicalOperator: 'AND', conditions: [] }]);
      setSteps(rule.actions_config || []);
    } else {
      setEditingRule(null);
      setRuleName('');
      setRuleDesc('');
      setRuleIcon('Zap');
      setRuleTrigger('lead_created');
      setConditionGroups([{ logicalOperator: 'AND', conditions: [] }]);
      setSteps([]);
    }
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleSaveWorkflow = async () => {
    if (!ruleName.trim()) {
      toast.error('Workflow Name is required!');
      return;
    }

    const payload = {
      name: ruleName.trim(),
      description: ruleDesc.trim(),
      icon: ruleIcon,
      trigger_type: ruleTrigger,
      trigger_config: { conditionGroups },
      actions_config: steps,
      is_active: editingRule ? editingRule.is_active : true
    };

    try {
      if (editingRule) {
        await updateRule({ id: editingRule.id, ...payload });
        toast.success('Workflow sequence updated.');
      } else {
        await createRule(payload);
        toast.success('🎉 Premium automation rule created successfully!');
      }
      setWizardOpen(false);
      queryClient.invalidateQueries({ queryKey: ['automationRules', companyId] });
    } catch (err: any) {
      toast.error('Failed to deploy workflow: ' + err.message);
    }
  };

  // Toggle state
  const handleToggleRuleStatus = async (rule: AutomationRule) => {
    try {
      await updateRule({ id: rule.id, is_active: !rule.is_active });
      toast.success(`Rule is now ${!rule.is_active ? 'Active' : 'Paused'}`);
    } catch (err: any) {
      toast.error('Failed to change rule state.');
    }
  };

  // Move rules priority
  const handleMoveRule = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) return;

    // Simulate sorting by swapping priority values
    const listCopy = [...rules];
    const ruleA = listCopy[idx];
    const ruleB = listCopy[targetIdx];

    try {
      await updateRule({ id: ruleA.id, priority: targetIdx });
      await updateRule({ id: ruleB.id, priority: idx });
      toast.success('Rule execution priority updated.');
    } catch (err: any) {
      toast.error('Priority reorder failed.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await deleteRule(id);
        toast.success('Rule deleted successfully.');
      } catch (err: any) {
        toast.error('Failed to delete rule.');
      }
    }
  };

  // 1-Click Load Template
  const handleLoadTemplate = (tpl: typeof presetTemplates[0]) => {
    setRuleName(tpl.name);
    setRuleDesc(tpl.desc);
    setRuleIcon(tpl.icon);
    setRuleTrigger(tpl.trigger);
    setConditionGroups(tpl.groups);
    setSteps(tpl.steps as WorkflowAction[]);
    setWizardStep(1);
    setWizardOpen(true);
    toast.success('Template sequence loaded in Wizard!');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic font-display">
            Premium Workflows
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Chains triggers, custom filters, and multi-step actions to automate agent routing.
          </p>
        </div>
        <button
          onClick={() => handleOpenWizard()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand-100 btn-tactile text-xs uppercase tracking-wider transition-all"
        >
          <Plus size={16} /> Create Automation
        </button>
      </div>

      {/* Stats Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Today', value: stats.activeToday, icon: Activity, trend: '↑ 12%', color: 'from-blue-500 to-indigo-600' },
          { label: 'Processed Leads', value: stats.processedLeads, icon: Users, trend: '↑ 8.4%', color: 'from-violet-500 to-purple-600' },
          { label: 'Rules Active', value: stats.activeRules, icon: Sliders, trend: 'stable', color: 'from-emerald-500 to-teal-600' },
          { label: 'Success Rate', value: stats.successRate, icon: CheckCircle2, trend: '↑ 0.2%', color: 'from-pink-500 to-rose-600' }
        ].map((card) => (
          <div key={card.label} className={`p-6 rounded-[28px] bg-gradient-to-br ${card.color} text-white shadow-md relative overflow-hidden group`}>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <div className="flex justify-between items-start">
              <card.icon size={22} className="opacity-80" />
              <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-full">{card.trend}</span>
            </div>
            <div className="mt-4">
              <span className="block text-2xl font-black">{card.value}</span>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1 block">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Preset Library Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600 animate-pulse" /> 1-Click Sequence Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {presetTemplates.map((tpl) => (
            <div key={tpl.name} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-3">
                  <Zap size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{tpl.name}</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{tpl.desc}</p>
              </div>
              <button
                onClick={() => handleLoadTemplate(tpl)}
                className="mt-4 w-full py-2 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-100"
              >
                1-Click Setup
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rules list & Flow Diagram */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Automation Rules</h2>
        <div className="space-y-4">
          {loadingRules ? (
            <div className="py-12 text-center text-gray-400 italic">Loading workflows...</div>
          ) : rules.length === 0 ? (
            <div className="p-12 bg-white border border-gray-150 rounded-[32px] text-center shadow-sm max-w-lg mx-auto">
              <Zap className="mx-auto text-brand-600 mb-4" size={32} />
              <h3 className="font-bold text-slate-900 text-lg">No Rules Set</h3>
              <p className="text-gray-400 text-sm mt-2">Deploy your first custom rule sequence to automate lead actions.</p>
              <button 
                onClick={() => handleOpenWizard()}
                className="mt-6 px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl text-xs uppercase"
              >
                Create Now
              </button>
            </div>
          ) : (
            rules.map((rule, idx) => {
              const isExpanded = expandedRuleId === rule.id;
              return (
                <div key={rule.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-all">
                  <div 
                    onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${rule.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{rule.name}</h4>
                          <span className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{rule.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {/* Priority Shifters */}
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleMoveRule(idx, 'up')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => handleMoveRule(idx, 'down')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900">
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Rule Toggle Switch */}
                      <button 
                        onClick={() => handleToggleRuleStatus(rule)}
                        className={`w-10 h-6 rounded-full p-1 transition-colors ${rule.is_active ? 'bg-brand-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>

                      {/* Action buttons */}
                      <button onClick={() => handleOpenWizard(rule)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all">
                        <Settings2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Flow Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-gray-100 bg-slate-50/50 p-6 overflow-hidden space-y-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Flow:</span>
                          <div className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                            {triggersList.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}
                          </div>
                          
                          {rule.actions_config?.map((step) => (
                            <React.Fragment key={step.id}>
                              <ArrowRight size={14} className="text-gray-300" />
                              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                                step.type === 'wait' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-brand-50 text-brand-700 border-brand-100'
                              }`}>
                                {step.type === 'wait' ? (
                                  <>
                                    <Clock size={12} /> Wait {step.config.duration} {step.config.unit}
                                  </>
                                ) : (
                                  <>
                                    {step.type === 'send_whatsapp' && <MessageSquare size={12} />}
                                    {step.type === 'send_email' && <Mail size={12} />}
                                    {step.type === 'assign_agent' && <UserPlus size={12} />}
                                    {actionsList.find(a => a.value === step.type)?.label || step.type}
                                  </>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live execution feed */}
      <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-brand-600 animate-pulse" /> Live execution feed
          </h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-updating (5s)</span>
        </div>
        
        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto custom-scrollbar">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="py-3 flex justify-between items-center text-xs font-bold text-slate-800">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <span className="text-slate-900 font-extrabold">{log.rule_name}</span>
                  <span className="text-gray-400 font-medium ml-2">Lead: {log.lead_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 font-medium">{log.action_type}</span>
                <span className="text-[10px] text-gray-300 font-mono">{new Date(log.executed_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-6 text-center text-gray-400 italic">No executions monitored today.</div>
          )}
        </div>
      </div>

      {/* 3-STEP WIZARD CREATION MODAL */}
      <AnimatePresence>
        {wizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-[32px] p-8 shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden relative"
            >
              <button 
                type="button"
                onClick={() => setWizardOpen(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-650"
              >
                <X size={20} />
              </button>

              {/* Wizard Step Indicators */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-brand-600" />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    {editingRule ? 'Edit Workflow Wizard' : 'New Automation Sequence'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((stepNum) => (
                    <div 
                      key={stepNum}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        wizardStep === stepNum ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {stepNum}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard Form View */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                
                {/* STEP 1: Basic Info */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Rule / Campaign Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. VIP Real Estate Welcome Drip"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-brand-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
                      <textarea 
                        placeholder="Brief summary of workflow goals..."
                        value={ruleDesc}
                        onChange={(e) => setRuleDesc(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-brand-200 h-24 resize-none"
                      />
                    </div>

                    {/* Icon Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Rule Icon Indicator</label>
                      <div className="flex gap-3">
                        {ICON_LIST.map((ic) => {
                          const IconComp = ic.icon;
                          return (
                            <button
                              key={ic.value}
                              type="button"
                              onClick={() => setRuleIcon(ic.value)}
                              className={`p-3 rounded-xl border transition-all ${
                                ruleIcon === ic.value ? 'bg-brand-50 border-brand-500 text-brand-600' : 'bg-gray-50 border-gray-200 text-gray-400'
                              }`}
                            >
                              <IconComp size={18} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Triggers & Condition Groups */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Setup Trigger event</label>
                      <select 
                        value={ruleTrigger}
                        onChange={(e) => setRuleTrigger(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-brand-200 text-gray-700"
                      >
                        {triggersList.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Condition Groups (AND/OR builder) */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter Conditions (OR Groups)</label>
                        <button
                          type="button"
                          onClick={handleAddConditionGroup}
                          className="text-[10px] font-bold text-brand-600 uppercase hover:underline"
                        >
                          + Add Filter Group
                        </button>
                      </div>

                      {conditionGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase">Match logic:</span>
                              <select
                                value={group.logicalOperator}
                                onChange={(e) => {
                                  const updated = [...conditionGroups];
                                  updated[groupIdx].logicalOperator = e.target.value as 'AND' | 'OR';
                                  setConditionGroups(updated);
                                }}
                                className="bg-white border border-gray-200 rounded px-2 py-0.5 text-[10px] font-bold"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddConditionToGroup(groupIdx)}
                              className="text-[10px] font-black text-brand-600 uppercase"
                            >
                              + Add Filter Row
                            </button>
                          </div>

                          <div className="space-y-2">
                            {group.conditions.map((cond, condIdx) => (
                              <div key={condIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                <select
                                  value={cond.field}
                                  onChange={(e) => handleUpdateCondition(groupIdx, condIdx, { field: e.target.value })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                >
                                  <option value="source">Source</option>
                                  <option value="city">City</option>
                                  <option value="status">Status</option>
                                  <option value="language">Language</option>
                                  <option value="industry">Industry</option>
                                </select>

                                <select
                                  value={cond.operator}
                                  onChange={(e) => handleUpdateCondition(groupIdx, condIdx, { operator: e.target.value as any })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                >
                                  <option value="equals">Equals</option>
                                  <option value="contains">Contains</option>
                                  <option value="starts_with">Starts With</option>
                                  <option value="not_equals">Does Not Equal</option>
                                </select>

                                <input 
                                  type="text" 
                                  placeholder="Value..."
                                  value={cond.value}
                                  onChange={(e) => handleUpdateCondition(groupIdx, condIdx, { value: e.target.value })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCondition(groupIdx, condIdx)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold text-right md:text-center"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            {group.conditions.length === 0 && (
                              <p className="text-[10px] text-gray-400 italic">No filters added. Triggers unconditionally.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Action steps chain */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflow execution sequence</label>
                      
                      <div className="relative pl-6 border-l-2 border-gray-100 ml-3 space-y-6">
                        {steps.map((step, idx) => (
                          <div key={step.id} className="relative bg-gray-50/50 border border-gray-100 p-4 rounded-2xl space-y-3">
                            <div className="absolute -left-[31px] top-4 w-4 h-4 bg-brand-50 border-2 border-brand-500 rounded-full flex items-center justify-center text-[8px] font-black text-brand-600">
                              {idx + 1}
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                {step.type === 'wait' ? <Clock size={14} className="text-amber-500" /> : <Zap size={14} className="text-brand-500" />}
                                {actionsList.find(a => a.value === step.type)?.label || step.type}
                              </span>
                              <button 
                                type="button"
                                onClick={() => handleRemoveStep(step.id)}
                                className="text-xs text-rose-500 hover:underline font-extrabold uppercase"
                              >
                                Remove
                              </button>
                            </div>

                            {/* Step custom inputs */}
                            {step.type === 'wait' && (
                              <div className="grid grid-cols-2 gap-3">
                                <input 
                                  type="number"
                                  min={1}
                                  value={Number(step.config.duration) || 10}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { duration: parseInt(e.target.value) || 10 })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none"
                                />
                                <select
                                  value={String(step.config.unit) || 'minutes'}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { unit: e.target.value })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none"
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            )}

                            {step.type === 'send_whatsapp' && (
                              <select
                                value={String(step.config.template_id) || ''}
                                onChange={(e) => handleUpdateStepConfig(step.id, { template_id: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                              >
                                <option value="">-- Choose WhatsApp Template --</option>
                                {templates.filter(t => t.type === 'whatsapp').map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            )}

                            {step.type === 'send_email' && (
                              <select
                                value={String(step.config.template_id) || ''}
                                onChange={(e) => handleUpdateStepConfig(step.id, { template_id: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                              >
                                <option value="">-- Choose Email Template --</option>
                                {templates.filter(t => t.type === 'email').map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            )}

                            {step.type === 'assign_agent' && (
                              <div className="grid grid-cols-2 gap-3">
                                <select
                                  value={String(step.config.mode) || 'round_robin'}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { mode: e.target.value })}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                                >
                                  <option value="round_robin">Round Robin</option>
                                  <option value="specific">Specific Agent</option>
                                </select>
                                {step.config.mode === 'specific' && (
                                  <select
                                    value={String(step.config.agent_id) || ''}
                                    onChange={(e) => handleUpdateStepConfig(step.id, { agent_id: e.target.value })}
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                                  >
                                    <option value="">-- Select Agent --</option>
                                    {members.map(m => (
                                      <option key={m.id} value={m.id}>{m.display_name || m.email}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}

                            {step.type === 'change_status' && (
                              <select
                                value={String(step.config.status) || ''}
                                onChange={(e) => handleUpdateStepConfig(step.id, { status: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                              >
                                <option value="">-- Choose Lead Status --</option>
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Interested">Interested</option>
                                <option value="Not Interested">Not Interested</option>
                                <option value="Converted">Converted</option>
                              </select>
                            )}

                            {step.type === 'add_tag' && (
                              <input 
                                type="text" 
                                placeholder="e.g. Hot, VIP"
                                value={String(step.config.tag) || ''}
                                onChange={(e) => handleUpdateStepConfig(step.id, { tag: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                              />
                            )}

                            {step.type === 'webhook' && (
                              <input 
                                type="text" 
                                placeholder="https://api.domain.com/endpoint"
                                value={String(step.config.url) || ''}
                                onChange={(e) => handleUpdateStepConfig(step.id, { url: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                              />
                            )}

                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step builder selection buttons */}
                    <div className="space-y-2 border-t border-gray-100 pt-4">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Append Action Node</span>
                      <div className="flex flex-wrap gap-2">
                        {actionsList.map(a => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => handleAddStep(a.value as WorkflowAction['type'])}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <PlusCircle size={12} /> {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Wizard Step buttons footer */}
              <div className="flex justify-between pt-6 border-t border-gray-150 mt-6 gap-3">
                {wizardStep > 1 ? (
                  <button 
                    type="button" 
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setWizardOpen(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-550 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button 
                    type="button" 
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-brand-100"
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSaveWorkflow}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-brand-100"
                  >
                    Save & Deploy
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
