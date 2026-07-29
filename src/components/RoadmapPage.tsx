import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Layers, 
  Calendar, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Mic,
  BarChart3,
  Smartphone,
  Code,
  Globe,
  Cpu,
  Search,
  Users,
  History,
  Sparkles,
  ThumbsUp,
  Plus,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useRoadmapFeatures, 
  useUpvoteFeature, 
  useCreateRoadmapFeature, 
  useUpdateRoadmapFeature, 
  useDeleteRoadmapFeature 
} from '@/hooks/useRoadmapCofounder';
import { RoadmapFeature } from '@/types/roadmapCofounder';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';

export const RoadmapPage = () => {
  // Query & Mutations
  const { data: features = [], isLoading, isError, refetch } = useRoadmapFeatures();
  const upvoteMutation = useUpvoteFeature();
  const createMutation = useCreateRoadmapFeature();
  const updateMutation = useUpdateRoadmapFeature();
  const deleteMutation = useDeleteRoadmapFeature();

  // Admin Mode Simulator
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Filters State
  const [selectedPhase, setSelectedPhase] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for slides preview
  const [selectedItem, setSelectedItem] = useState<RoadmapFeature | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // CRUD Dialog Modals state
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<RoadmapFeature | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Leads');
  const [formPhase, setFormPhase] = useState<number>(2);
  const [formStatus, setFormStatus] = useState<'Planned' | 'In Progress' | 'Completed'>('Planned');
  const [formProgress, setFormProgress] = useState<number>(0);

  // open add feature modal
  const openAddModal = () => {
    setEditingFeature(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Leads');
    setFormPhase(2);
    setFormStatus('Planned');
    setFormProgress(0);
    setIsCrudModalOpen(true);
  };

  // open edit modal
  const openEditModal = (feature: RoadmapFeature, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFeature(feature);
    setFormTitle(feature.title);
    setFormDesc(feature.description);
    setFormCategory(feature.category);
    setFormPhase(feature.phase);
    setFormStatus(feature.status);
    setFormProgress(feature.progress);
    setIsCrudModalOpen(true);
  };

  // delete confirm
  const handleDeleteFeature = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this feature from the roadmap?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Feature deleted from roadmap!");
      } catch (err: unknown) {
        toast.error("Failed to delete feature: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      if (editingFeature) {
        // Edit flow
        await updateMutation.mutateAsync({
          id: editingFeature.id,
          title: formTitle,
          description: formDesc,
          category: formCategory,
          phase: formPhase,
          status: formStatus,
          progress: formProgress
        });
        toast.success("Roadmap feature updated!");
      } else {
        // Add flow
        const dummySlides = [
          { title: `${formTitle} Preview`, content: `Excited for this! ${formDesc}`, image: 'https://picsum.photos/seed/setup/800/400' }
        ];
        await createMutation.mutateAsync({
          title: formTitle,
          description: formDesc,
          category: formCategory,
          phase: formPhase,
          status: formStatus,
          progress: formProgress,
          slides: dummySlides
        });
        toast.success("New feature added to roadmap!");
      }
      setIsCrudModalOpen(false);
    } catch (err: unknown) {
      toast.error("Error submitting roadmap change: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Upvote Feature trigger
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await upvoteMutation.mutateAsync(id);
      toast.success("Voted up successfully!");
    } catch (err: unknown) {
      toast.error("Upvote failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const openSlides = (item: RoadmapFeature) => {
    setSelectedItem(item);
    setCurrentSlide(0);
  };

  const nextSlide = () => {
    if (selectedItem && currentSlide < selectedItem.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Category Icon Resolver
  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'calls': return Phone;
      case 'leads': return Users;
      case 'reports': return BarChart3;
      default: return Sparkles;
    }
  };

  // Combined Phase + Search Queries
  const filteredFeatures = useMemo(() => {
    return features.filter(f => {
      const matchesPhase = selectedPhase === 'All' || `Phase ${f.phase}` === selectedPhase;
      const matchesSearch = 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPhase && matchesSearch;
    });
  }, [features, selectedPhase, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight font-display">Platform Roadmap</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Explore release timelines. Upvote upcoming modules to prioritize development.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Mode Toggle Switch */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-[10px] font-black uppercase text-gray-400">Admin Controls</span>
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors btn-tactile ${
                isAdminMode ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isAdminMode ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {isAdminMode && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:bg-brand-700 transition-all btn-tactile"
            >
              <Plus size={15} /> Add Feature
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-150 shadow-xs">
        <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
          {['All', 'Phase 2', 'Phase 3'].map(phase => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                selectedPhase === phase 
                  ? 'bg-white text-brand-650 shadow-xs border border-gray-100' 
                  : 'text-gray-450 hover:text-gray-650'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search upcoming features..."
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border-none rounded-xl text-[10px] font-semibold outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all text-gray-700"
          />
        </div>
      </div>

      {/* Main Roadmap Cards Grid */}
      {isLoading ? (
        <div className="py-24 flex justify-center">
          <CallMindLoader size="md" text="Loading timeline roadmap..." />
        </div>
      ) : isError ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-gray-150 p-8 shadow-xs">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Connection Error</h3>
          <p className="text-xs text-gray-500">We couldn't retrieve the roadmap details from database.</p>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-150 rounded-[2rem] text-gray-400 italic text-xs">
          No roadmap features match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFeatures.map(item => {
            const Icon = getIcon(item.category);
            return (
              <div
                key={item.id}
                onClick={() => openSlides(item)}
                className="bg-white p-6 rounded-[2rem] border border-gray-150 hover:border-brand-200 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-650 flex items-center justify-center">
                      <Icon size={20} />
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      item.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : item.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors leading-snug font-display">{item.title}</h3>
                  <p className="text-xs text-gray-550 mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Progress tracker */}
                  <div className="space-y-1 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-gray-400">
                      <span>Phase {item.phase}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          item.status === 'Completed'
                            ? 'bg-emerald-500'
                            : item.status === 'In Progress'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions footer bar */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-gray-50 text-[10px] font-black uppercase">
                    <button 
                      onClick={(e) => handleUpvote(item.id, e)}
                      className="flex items-center gap-1.5 text-gray-450 hover:text-brand-600 transition-colors bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg btn-tactile"
                      title="Upvote feature priority"
                    >
                      <ThumbsUp size={12} />
                      <span>{item.votes} Votes</span>
                    </button>

                    {isAdminMode ? (
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => openEditModal(item, e)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteFeature(item.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-brand-650 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all">
                        View Slides <ArrowRight size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide Preview Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-gray-900/70 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[420px]"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all z-10"
              >
                <X size={16} />
              </button>

              {/* Slide image card cover */}
              <div className="md:w-1/2 bg-gray-900 relative overflow-hidden flex flex-col justify-end">
                {selectedItem.slides[currentSlide]?.image ? (
                  <img 
                    src={selectedItem.slides[currentSlide].image} 
                    alt={selectedItem.slides[currentSlide].title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-brand-600/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 to-transparent pointer-events-none" />
                <div className="p-8 relative z-10 text-white">
                  <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-0.5 rounded-md border border-brand-500/20">Roadmap Slide Preview</span>
                  <h2 className="text-2xl font-black mt-3 font-display">{selectedItem.title}</h2>
                </div>
              </div>

              {/* Slide details context */}
              <div className="md:w-1/2 p-8 flex flex-col justify-between text-xs font-semibold">
                <div className="space-y-6">
                  <div className="flex items-center gap-1.5">
                    {selectedItem.slides.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-brand-600' : 'w-1.5 bg-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 leading-snug">{selectedItem.slides[currentSlide]?.title || 'Release Details'}</h3>
                  <p className="text-gray-550 leading-relaxed font-semibold">{selectedItem.slides[currentSlide]?.content || selectedItem.description}</p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50 text-[10px] font-black uppercase">
                  <button 
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className={`px-3 py-2 rounded-xl flex items-center gap-0.5 border ${currentSlide === 0 ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-150 hover:bg-gray-50 btn-tactile'}`}
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={currentSlide === selectedItem.slides.length - 1 ? () => setSelectedItem(null) : nextSlide}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all flex items-center gap-1 btn-tactile shadow-xs"
                  >
                    {currentSlide === selectedItem.slides.length - 1 ? 'Finish' : 'Next'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CRUD Add / Edit Dialog Modal */}
      <AnimatePresence>
        {isCrudModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCrudModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-gray-50 pb-3.5 mb-5">
                <h3 className="text-base font-bold text-gray-900">{editingFeature ? 'Edit Roadmap Feature' : 'Add Feature to Roadmap'}</h3>
                <button onClick={() => setIsCrudModalOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Feature Title</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Agency White labeling"
                    className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Enter roadmap description details..."
                    rows={3}
                    className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none"
                    >
                      <option>Leads</option>
                      <option>Calls</option>
                      <option>Reports</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Phase</label>
                    <select 
                      value={formPhase}
                      onChange={(e) => setFormPhase(parseInt(e.target.value))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none"
                    >
                      <option value={2}>Phase 2</option>
                      <option value={3}>Phase 3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as RoadmapFeature['status'])}
                      className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none"
                    >
                      <option>Planned</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress (%)</label>
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      value={formProgress}
                      onChange={(e) => setFormProgress(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full py-3 mt-4 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile shadow-xs"
                >
                  {editingFeature ? 'Update Feature' : 'Add Feature'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
