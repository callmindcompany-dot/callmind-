import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Plus, 
  Search, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Mail, 
  Zap, 
  Database, 
  GitBranch, 
  ShieldAlert,
  AlertCircle,
  ChevronLeft,
  Settings,
  Trash2,
  Sparkles,
  X,
  Check,
  Send,
  Sliders,
  TrendingUp,
  Award,
  PhoneCall,
  Laptop,
  GripVertical
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useSequences, useCreateSequence, useUpdateSequenceNodes, useToggleSequenceStatus, useDeleteSequence } from '@/hooks/useSequences';
import { Sequence, SequenceNode, SequenceNodeType } from '@/types/sequences';
import { toast } from 'react-hot-toast';
import CallMindLoader from './CallMindLoader';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Drag & Drop Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SequencesPage = () => {
  const { featureFlags } = useAuth();
  const { companyId } = useCompany();
  
  const [activeSequence, setActiveSequence] = useState<Sequence | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');

  const aiEnabled = featureFlags.aiEnabled;

  // React Query Fetch
  const { data: sequences = [], isLoading, isError, refetch } = useSequences(companyId);
  const createMutation = useCreateSequence();
  const toggleMutation = useToggleSequenceStatus();
  const deleteMutation = useDeleteSequence();

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newSeqName.trim()) return;

    createMutation.mutate({ companyId, name: newSeqName }, {
      onSuccess: () => {
        setNewSeqName('');
        setShowCreateModal(false);
      }
    });
  };

  const handleToggleStatus = (seq: Sequence, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMutation.mutate({ sequenceId: seq.id, currentStatus: seq.status });
  };

  const handleDeleteSequence = (seqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this outreach sequence?")) return;
    deleteMutation.mutate(seqId);
  };

  const filteredSequences = useMemo(() => {
    return sequences.filter(seq => 
      seq.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sequences, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <AnimatePresence mode="wait">
        {activeSequence ? (
          <WorkflowBuilder 
            sequence={activeSequence} 
            onBack={() => {
              setActiveSequence(null);
              refetch();
            }} 
            aiEnabled={aiEnabled}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-950 tracking-tight font-display">Outreach Sequences</h1>
                <p className="text-gray-500 font-medium mt-1 text-sm">Automate your multi-channel B2B/B2C drip campaigns and welcomer sequences.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-brand-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-brand-700 transition-all btn-tactile btn-glow"
              >
                <Plus size={16} /> Create New Sequence
              </button>
            </div>

            {/* AI Sandbox Banner */}
            {!aiEnabled && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-xs font-semibold">
                <ShieldAlert size={18} />
                <p>AI Safety: Auto campaigns are running under sandbox parameters until voice configurations are deployed.</p>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search sequences..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <CallMindLoader size="md" text="Syncing sequences with Supabase..." />
              </div>
            ) : isError ? (
              <div className="text-center py-16 space-y-4">
                <AlertCircle size={32} className="text-red-500 mx-auto" />
                <p className="text-xs text-gray-500 font-bold">Failed to load campaign sequences.</p>
                <button onClick={() => refetch()} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile">
                  Retry Sync
                </button>
              </div>
            ) : filteredSequences.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 text-center shadow-xs flex flex-col items-center justify-center">
                <Layers className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-1">No Campaign Sequences Launched</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-6">Set up automated email drip and scheduled WhatsApp welcomers to nurture leads.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors btn-tactile"
                >
                  Create Drip Sequence
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSequences.map((seq) => (
                  <motion.div
                    key={seq.id}
                    whileHover={{ y: -4 }}
                    onClick={() => setActiveSequence(seq)}
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <button 
                          onClick={(e) => handleToggleStatus(seq, e)}
                          className={`p-2 rounded-xl transition-all border ${
                            seq.status === 'active' 
                              ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white' 
                              : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          {seq.status === 'active' ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                        <button 
                          onClick={(e) => handleDeleteSequence(seq.id, e)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-brand-600 transition-colors font-display">{seq.name}</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-6">
                        Updated {new Date(seq.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50 text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-gray-450 uppercase tracking-wider">Enrolled</p>
                        <p className="font-bold text-gray-900 mt-0.5">{seq.enrolled.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-450 uppercase tracking-wider">Comp %</p>
                        <p className="font-bold text-gray-900 mt-0.5">{seq.completion}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-450 uppercase tracking-wider">Success</p>
                        <p className="font-bold text-brand-600 mt-0.5">{seq.success_rate}%</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-gray-100 z-55"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 pb-3 border-b border-gray-50 mb-4">
                <Sparkles size={18} className="text-brand-600" />
                <h3 className="text-base font-black text-gray-950">New Campaign Drip</h3>
              </div>

              <form onSubmit={handleCreateSequence} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Outreach Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. VIP Real Estate Lead Welcomer"
                    value={newSeqName}
                    onChange={(e) => setNewSeqName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-semibold outline-none focus:bg-white focus:border-brand-200 text-gray-700"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl uppercase tracking-wider transition-colors btn-tactile"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl uppercase tracking-wider transition-colors shadow-xs btn-tactile btn-glow"
                  >
                    Build Drip Flow
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// SORTABLE NODE ITEM COMPONENT
function SortableNodeItem({ 
  node, 
  i, 
  nodesLength, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  node: SequenceNode; 
  i: number; 
  nodesLength: number; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id, disabled: node.type === 'trigger' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  let nodeIcon = Zap;
  let nodeColor = 'text-gray-500 bg-gray-100 border-gray-200';

  if (node.type === 'trigger') {
    nodeIcon = Zap;
    nodeColor = 'text-amber-600 bg-amber-50 border-amber-100';
  } else if (node.type === 'delay') {
    nodeIcon = Clock;
    nodeColor = 'text-gray-500 bg-gray-50 border-gray-100';
  } else if (node.type === 'whatsapp') {
    nodeIcon = MessageSquare;
    nodeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  } else if (node.type === 'email') {
    nodeIcon = Mail;
    nodeColor = 'text-blue-600 bg-blue-50 border-blue-100';
  } else if (node.type === 'sms') {
    nodeIcon = Send;
    nodeColor = 'text-indigo-600 bg-indigo-50 border-indigo-100';
  } else if (node.type === 'notification') {
    nodeIcon = PhoneCall;
    nodeColor = 'text-purple-600 bg-purple-50 border-purple-100';
  } else if (node.type === 'webhook') {
    nodeIcon = Laptop;
    nodeColor = 'text-cyan-600 bg-cyan-50 border-cyan-100';
  } else if (node.type === 'branch') {
    nodeIcon = GitBranch;
    nodeColor = 'text-teal-600 bg-teal-50 border-teal-100';
  } else if (node.type === 'action') {
    nodeIcon = Database;
    nodeColor = 'text-orange-600 bg-orange-50 border-orange-100';
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        onClick={onSelect}
        className={`
          relative p-4 rounded-[20px] border-2 transition-all cursor-pointer bg-white flex items-center gap-3.5 shadow-xs
          ${isSelected ? 'border-brand-500 shadow-md scale-[1.01]' : 'border-transparent hover:border-brand-100'}
        `}
      >
        {node.type !== 'trigger' && (
          <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-550 shrink-0">
            <GripVertical size={14} />
          </div>
        )}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${nodeColor}`}>
          {React.createElement(nodeIcon, { size: 16 })}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-xs truncate">{node.title}</h4>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{node.type}</p>
        </div>
        
        {node.type !== 'trigger' && (
          <button 
            type="button"
            onClick={(e) => onDelete(node.id, e)}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {node.type === 'delay' && node.delay && (
        <div className="mx-8 mt-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100 text-[9px] text-gray-600 font-mono inline-block">
          Delay: {node.delay}
        </div>
      )}
      {(node.type === 'whatsapp' || node.type === 'email' || node.type === 'sms') && node.content && (
        <div className="mx-8 mt-1.5 p-2 bg-indigo-50/20 rounded-lg border border-indigo-50/40 text-[9px] text-gray-650 font-mono line-clamp-2">
          {node.content}
        </div>
      )}

      {/* Node Connector Line */}
      {i < nodesLength - 1 && (
        <div className="absolute left-[39px] -bottom-6 w-0.5 h-6 bg-gray-150">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-300" />
        </div>
      )}
    </div>
  );
}

// MULTI-STEP BUILDER & PERFORMANCE ANALYTICS
const WorkflowBuilder = ({ sequence, onBack, aiEnabled }: { sequence: Sequence, onBack: () => void, aiEnabled: boolean }) => {
  const [nodes, setNodes] = useState<SequenceNode[]>(sequence.nodes || []);
  const [selectedNode, setSelectedNode] = useState<SequenceNode | null>(null);

  // Form edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDelay, setEditDelay] = useState('');
  const [editContent, setEditContent] = useState('');

  // Rebuild query mutation
  const updateNodesMutation = useUpdateSequenceNodes();

  useEffect(() => {
    if (sequence.nodes) {
      setNodes(sequence.nodes);
    }
  }, [sequence]);

  const handleOpenNodeEditor = (node: SequenceNode) => {
    setSelectedNode(node);
    setEditTitle(node.title);
    setEditDelay(node.delay || '');
    setEditContent(node.content || '');
  };

  const handleAddNodeToCanvas = (type: SequenceNodeType) => {
    const nextId = `node_${Date.now()}`;
    let defaultTitle = '';
    let defaultDelay = '';
    let defaultContent = '';

    if (type === 'delay') {
      defaultTitle = 'Wait 30 Minutes';
      defaultDelay = '30 Minutes';
    } else if (type === 'whatsapp') {
      defaultTitle = 'Outbound WhatsApp Welcomer';
      defaultContent = 'Hi {{name}}, checking in regarding your request.';
    } else if (type === 'email') {
      defaultTitle = 'Outbound Email Alert';
      defaultContent = 'Here is the brochure details.';
    } else if (type === 'sms') {
      defaultTitle = 'SMS Catch-up';
      defaultContent = 'Hi {{name}}, did you check out our details?';
    } else if (type === 'notification') {
      defaultTitle = 'Internal Agent Notify';
      defaultContent = 'Lead {{name}} has completed sequences step.';
    } else if (type === 'webhook') {
      defaultTitle = 'Trigger Webhook Sync';
      defaultContent = 'https://api.yourdomain.com/crm-webhook';
    } else if (type === 'branch') {
      defaultTitle = 'Check lead responded';
    } else if (type === 'action') {
      defaultTitle = 'Update Status to contacted';
    }

    const newNode: SequenceNode = {
      id: nextId,
      type,
      title: defaultTitle,
      delay: defaultDelay,
      content: defaultContent
    };

    setNodes([...nodes, newNode]);
    toast.success(`Added ${type} step to drip!`);
  };

  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter(n => n.id !== nodeId);
    setNodes(updated);
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    toast.success("Step removed.");
  };

  const handleSaveNodeDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;

    const updated = nodes.map(n => {
      if (n.id === selectedNode.id) {
        return {
          ...n,
          title: editTitle,
          delay: editDelay,
          content: editContent
        };
      }
      return n;
    });

    setNodes(updated);
    setSelectedNode(null);
  };

  const handlePublishSequence = () => {
    updateNodesMutation.mutate({ sequenceId: sequence.id, nodes });
  };

  // Recharts analytics data
  const funnelData = useMemo(() => {
    return [
      { step: 'Enrolled', count: sequence.enrolled, fill: '#3b82f6' },
      { step: 'Delivered', count: Math.round(sequence.enrolled * 0.92), fill: '#60a5fa' },
      { step: 'Completed', count: Math.round(sequence.enrolled * (sequence.completion / 100)), fill: '#a78bfa' },
      { step: 'Converted', count: Math.round(sequence.enrolled * (sequence.success_rate / 100)), fill: '#10b981' }
    ];
  }, [sequence]);

  // Drag and Drop reordering logic
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setNodes((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      // Gating the trigger node from moving (always keeps trigger at index 0)
      if (oldIndex === 0 || newIndex === 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
    toast.success("Flow reordered!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 relative"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white border border-gray-150 rounded-2xl hover:bg-gray-50 hover:shadow-sm text-gray-500 transition-all btn-tactile"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight font-display">{sequence.name}</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Outreach Canvas Builder</p>
          </div>
        </div>
        <button 
          onClick={handlePublishSequence}
          disabled={updateNodesMutation.isPending}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl shadow-md transition-colors uppercase tracking-wider flex items-center gap-1.5 btn-tactile btn-glow"
        >
          <Check size={16} /> Publish Drip Sequence
        </button>
      </div>

      {/* Analytics funnels & chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Sequence Performance</h3>
            <div className="divide-y divide-slate-800 text-xs font-semibold">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Total Enrolled</span>
                <span className="font-bold text-white">{sequence.enrolled.toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Completion Rate</span>
                <span className="font-bold text-white">{sequence.completion}%</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Success Conversion</span>
                <span className="font-bold text-emerald-400">{sequence.success_rate}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] text-slate-400">
            <p className="leading-relaxed">Verify conversion success by assessing overall completions compared to active enrollments.</p>
          </div>
        </div>

        {/* Funnel chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
          <h3 className="text-xs font-bold text-gray-900 mb-4">Outreach Funnel Conversion</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }} contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 11 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Builder canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[500px]">
        {/* Node Drawer library */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs space-y-3.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-50">Workflow Library</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { type: 'delay', label: 'Wait Interval', icon: Clock, color: 'text-gray-550 bg-gray-50 border-gray-150' },
                { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { type: 'email', label: 'Email Outreach', icon: Mail, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { type: 'sms', label: 'SMS Texting', icon: Send, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                { type: 'notification', label: 'Agent Alert', icon: PhoneCall, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                { type: 'webhook', label: 'Webhook API', icon: Laptop, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
                { type: 'branch', label: 'Branch Logic', icon: GitBranch, color: 'text-teal-600 bg-teal-50 border-teal-100' },
                { type: 'action', label: 'CRM Database Update', icon: Database, color: 'text-orange-600 bg-orange-50 border-orange-100' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddNodeToCanvas(item.type as SequenceNodeType)}
                  className="w-full flex items-center gap-2.5 p-2 bg-gray-50/50 hover:bg-brand-50/40 border border-gray-100 hover:border-brand-100 rounded-xl transition-all text-left font-bold text-gray-700 btn-tactile"
                >
                  <span className={`p-1.5 rounded-lg border ${item.color}`}><item.icon size={13} /></span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-indigo-50 border border-indigo-100 text-indigo-900 relative overflow-hidden text-xs">
            <Sparkles className="absolute -right-3 -top-3 w-16 h-16 text-indigo-300 opacity-25" />
            <h4 className="font-bold uppercase tracking-wider mb-1">Dynamic values</h4>
            <p className="leading-relaxed text-[11px] text-indigo-750">
              Personalize messaging inside templates by applying variables such as <code className="font-mono text-indigo-800 bg-white px-1 py-0.5 rounded">{"{{name}}"}</code>.
            </p>
          </div>
        </div>

        {/* Canvas editor with drag and drop */}
        <div className="lg:col-span-3 bg-gray-50 border border-gray-150 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3B82F6 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 w-full max-w-md space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={nodes.map(n => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {nodes.map((node, i) => (
                  <SortableNodeItem
                    key={node.id}
                    node={node}
                    i={i}
                    nodesLength={nodes.length}
                    isSelected={selectedNode?.id === node.id}
                    onSelect={() => handleOpenNodeEditor(node)}
                    onDelete={handleDeleteNode}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Editor Side Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white h-full w-full max-w-md shadow-2xl flex flex-col rounded-l-[32px] overflow-hidden z-55"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Edit step details</h3>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1.5 hover:bg-gray-50 rounded-xl transition-all">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveNodeDetails} className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto text-xs">
                <div>
                  <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1">Step Title / Objective</label>
                  <input 
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-semibold outline-none focus:bg-white focus:border-indigo-200 text-gray-700"
                  />
                </div>

                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1">Delay duration</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 5 minutes, 2 hours, 1 day"
                      value={editDelay}
                      onChange={(e) => setEditDelay(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-semibold outline-none focus:bg-white focus:border-indigo-200 text-gray-700"
                    />
                  </div>
                )}

                {(selectedNode.type === 'whatsapp' || selectedNode.type === 'email' || selectedNode.type === 'sms' || selectedNode.type === 'notification' || selectedNode.type === 'webhook') && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1">Message Content / API Endpoint</label>
                    <textarea 
                      required
                      rows={5}
                      placeholder={selectedNode.type === 'webhook' ? 'https://api.domain.com/endpoint' : 'Compose campaign body text...'}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl font-medium font-mono outline-none focus:bg-white focus:border-indigo-200 leading-relaxed text-gray-700"
                    />
                  </div>
                )}

                <div className="flex-1" />

                <div className="flex gap-2 border-t border-gray-50 pt-5">
                  <button 
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl uppercase tracking-wider transition-all btn-tactile"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-wider transition-all shadow-xs btn-tactile"
                  >
                    Save Step
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
