import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Clock,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Pin,
  Eye,
  Calendar,
  RefreshCw,
  Zap,
  Wrench,
  Users,
  Package,
  PartyPopper,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import {
  useAnnouncements,
  useUserReadAnnouncements,
  useMarkAnnouncementRead,
  useAnnouncementSeenStats,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement
} from '@/hooks/useAnnouncements';
import { Announcement } from '@/types/announcements';
import { toast } from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Update', 'Maintenance', 'Team', 'Product', 'Event'] as const;
type CategoryFilter = typeof CATEGORIES[number];
type AnnouncementCategory = Announcement['category'];
type AnnouncementTargetRole = Announcement['target_role'];

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<AnnouncementCategory, { badge: string; icon: React.ReactNode; dot: string }> = {
  Update:      { badge: 'bg-blue-50 text-blue-600 border border-blue-100',   icon: <RefreshCw size={15} />,   dot: 'bg-blue-500' },
  Maintenance: { badge: 'bg-amber-50 text-amber-600 border border-amber-100', icon: <Wrench size={15} />,       dot: 'bg-amber-500' },
  Team:        { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-100', icon: <Users size={15} />, dot: 'bg-emerald-500' },
  Product:     { badge: 'bg-violet-50 text-violet-600 border border-violet-100', icon: <Package size={15} />,  dot: 'bg-violet-500' },
  Event:       { badge: 'bg-pink-50 text-pink-600 border border-pink-100',   icon: <PartyPopper size={15} />, dot: 'bg-pink-500' },
};

// ─── Skeletons ────────────────────────────────────────────────────────────────
const AnnouncementSkeleton = () => (
  <div className="bg-white rounded-[2rem] border border-gray-150 p-6 shadow-xs animate-pulse space-y-4">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-gray-200 rounded-full w-1/4" />
        <div className="h-4 bg-gray-200 rounded-full w-2/3" />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="h-2 bg-gray-100 rounded-full w-full" />
      <div className="h-2 bg-gray-100 rounded-full w-5/6" />
      <div className="h-2 bg-gray-100 rounded-full w-4/5" />
    </div>
    <div className="h-px bg-gray-100" />
    <div className="flex justify-between">
      <div className="h-2 bg-gray-100 rounded-full w-20" />
      <div className="h-2 bg-gray-100 rounded-full w-16" />
    </div>
  </div>
);

// ─── Confirm Delete Modal ────────────────────────────────────────────────────
interface DeleteModalProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

const DeleteModal = ({ title, onConfirm, onCancel, isPending }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
    <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
        <Trash2 size={26} className="text-red-500" />
      </div>
      <div>
        <h3 className="text-sm font-black text-gray-900">Delete Announcement?</h3>
        <p className="text-xs text-gray-400 font-semibold mt-1 leading-relaxed px-2">
          "<span className="text-gray-600">{title}</span>" will be permanently removed and cannot be recovered.
        </p>
      </div>
      <div className="flex gap-3 text-[10px] font-black uppercase tracking-wider">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl btn-tactile">Cancel</button>
        <button onClick={onConfirm} disabled={isPending} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl btn-tactile transition-colors">
          {isPending ? 'Deleting...' : 'Yes, Delete'}
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── CRUD Modal ───────────────────────────────────────────────────────────────
interface CrudModalProps {
  editing: Announcement | null;
  formTitle: string; setFormTitle: (v: string) => void;
  formContent: string; setFormContent: (v: string) => void;
  formCategory: AnnouncementCategory; setFormCategory: (v: AnnouncementCategory) => void;
  formTargetRole: AnnouncementTargetRole; setFormTargetRole: (v: AnnouncementTargetRole) => void;
  formIsPinned: boolean; setFormIsPinned: (v: boolean) => void;
  formIsPublished: boolean; setFormIsPublished: (v: boolean) => void;
  formScheduledAt: string; setFormScheduledAt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}

const CrudModal = ({
  editing, formTitle, setFormTitle, formContent, setFormContent,
  formCategory, setFormCategory, formTargetRole, setFormTargetRole,
  formIsPinned, setFormIsPinned, formIsPublished, setFormIsPublished,
  formScheduledAt, setFormScheduledAt, onSubmit, onClose, isPending
}: CrudModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" />
    <motion.div
      initial={{ scale: 0.95, y: 15 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 15 }}
      className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
    >
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
            {editing ? <Edit2 size={15} className="text-brand-600" /> : <Plus size={15} className="text-brand-600" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{editing ? 'Edit Announcement' : 'Create Announcement'}</h3>
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{editing ? 'Update existing post' : 'Broadcast to your team'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X size={14} /></button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
        <div className="space-y-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Post Title *</label>
          <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Server Maintenance This Sunday" className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold" required />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Content *</label>
          <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="What do your team members need to know?" rows={4} className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold resize-none" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
            <select
              value={formCategory}
              onChange={e => setFormCategory(e.target.value as AnnouncementCategory)}
              className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none font-semibold text-gray-700"
            >
              <option value="Update">Update</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Team">Team</option>
              <option value="Product">Product</option>
              <option value="Event">Event</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Audience</label>
            <select
              value={formTargetRole}
              onChange={e => setFormTargetRole(e.target.value as AnnouncementTargetRole)}
              className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none font-semibold text-gray-700"
            >
              <option value="all">All Users</option>
              <option value="admin">Founders / Admins</option>
              <option value="agent">Telecallers Only</option>
            </select>
          </div>
        </div>

        {/* Category preview badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${CATEGORY_CONFIG[formCategory].badge}`}>
            {CATEGORY_CONFIG[formCategory].icon} {formCategory}
          </span>
          <span className="text-[9px] text-gray-400 font-semibold">Preview badge</span>
        </div>

        <div className="flex items-center justify-between gap-6 py-3 border-t border-b border-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formIsPinned} onChange={e => setFormIsPinned(e.target.checked)} className="w-4 h-4 rounded text-amber-500 border-gray-300 cursor-pointer" />
            <span className="text-gray-700 flex items-center gap-1"><Pin size={11} className="text-amber-500" /> Pin to Top</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formIsPublished} onChange={e => setFormIsPublished(e.target.checked)} className="w-4 h-4 rounded text-brand-600 border-gray-300 cursor-pointer" />
            <span className="text-gray-700">Published</span>
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Calendar size={11} /> Schedule Date (Optional)
          </label>
          <input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold" />
          {formScheduledAt && (
            <p className="text-[9px] text-blue-500 font-semibold mt-0.5">📅 Will be visible from {new Date(formScheduledAt).toLocaleString()}</p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl font-black text-[10px] uppercase btn-tactile">Cancel</button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile shadow-xs disabled:bg-gray-300">
            {isPending ? 'Saving...' : (editing ? 'Save Changes' : 'Publish Post')}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AnnouncementsPage = () => {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'agent'>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  // CRUD modal
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('Update');
  const [formTargetRole, setFormTargetRole] = useState<AnnouncementTargetRole>('all');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formScheduledAt, setFormScheduledAt] = useState('');

  // Queries
  const { data: announcements = [], isLoading, isError, refetch } = useAnnouncements(companyId);
  const { data: readIds = [], refetch: refetchReads } = useUserReadAnnouncements(user?.uid || null);
  const { data: seenStats = {} } = useAnnouncementSeenStats();

  const markReadMutation = useMarkAnnouncementRead();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  // Auto-mark visible announcements as read
  useEffect(() => {
    if (!user || announcements.length === 0) return;

    const pending = announcements.filter(ann => {
      const isTargeted = ann.target_role === 'all' || ann.target_role === simulatedRole;
      const isNotFuture = !ann.scheduled_at || new Date(ann.scheduled_at) <= new Date();
      return isTargeted && isNotFuture && !readIds.includes(ann.id);
    });

    pending.forEach(ann => {
      markReadMutation.mutate({ announcementId: ann.id, userId: user.uid });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, readIds, user?.uid, simulatedRole]);

  // Filtering
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      const isTargeted = item.target_role === 'all' || item.target_role === simulatedRole;
      const isNotFuture = !item.scheduled_at || new Date(item.scheduled_at) <= new Date() || isAdminMode;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
      return isTargeted && isNotFuture && matchesCategory && matchesSearch;
    });
  }, [announcements, simulatedRole, isAdminMode, selectedCategory, searchQuery]);

  // Unread count
  const unreadCount = filteredAnnouncements.filter(a => !readIds.includes(a.id)).length;

  const openCreateModal = useCallback(() => {
    setEditingAnnouncement(null);
    setFormTitle(''); setFormContent(''); setFormCategory('Update');
    setFormTargetRole('all'); setFormIsPinned(false); setFormIsPublished(true); setFormScheduledAt('');
    setIsCrudModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnouncement(item);
    setFormTitle(item.title); setFormContent(item.content); setFormCategory(item.category);
    setFormTargetRole(item.target_role); setFormIsPinned(item.is_pinned);
    setFormIsPublished(item.is_published);
    setFormScheduledAt(item.scheduled_at ? item.scheduled_at.substring(0, 16) : '');
    setIsCrudModalOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !companyId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id, companyId });
      toast.success('Announcement deleted.');
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !companyId) {
      toast.error('Title and Content are required.');
      return;
    }
    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({
          id: editingAnnouncement.id,
          title: formTitle, content: formContent, category: formCategory,
          target_role: formTargetRole, is_pinned: formIsPinned, is_published: formIsPublished,
          scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null
        });
        toast.success('Announcement updated!');
      } else {
        await createMutation.mutateAsync({
          company_id: companyId, title: formTitle, content: formContent,
          category: formCategory, target_role: formTargetRole,
          is_pinned: formIsPinned, is_published: formIsPublished,
          scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
          author_id: user?.uid || null
        });
        toast.success('Announcement posted!');
      }
      setIsCrudModalOpen(false);
    } catch (err: unknown) {
      toast.error('Submit failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const totalTeam = Object.keys(seenStats).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2.5">
            <Bell className="text-brand-600" size={28} /> Announcements
            {unreadCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] font-black bg-brand-600 text-white rounded-full px-2 py-0.5">
                {unreadCount} new
              </motion.span>
            )}
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Stay in sync with news, system schedules, and team milestones.</p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* View Role toggle */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150 text-[10px] font-black uppercase">
            <span className="text-gray-400">View Role</span>
            <select
              value={simulatedRole}
              onChange={e => setSimulatedRole(e.target.value as 'admin' | 'agent')}
              className="bg-transparent border-none outline-none font-bold text-gray-800"
            >
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          {/* Admin mode toggle */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150 text-[10px] font-black uppercase">
            <span className="text-gray-400">Admin Mode</span>
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors btn-tactile ${isAdminMode ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAdminMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {isAdminMode && (
            <button onClick={openCreateModal} className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:bg-brand-700 transition-all btn-tactile btn-glow">
              <Plus size={15} /> New Post
            </button>
          )}
        </div>
      </div>

      {/* ── Filter toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-150 shadow-xs">
        {/* Category pills */}
        <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-brand-650 shadow-xs border border-gray-155'
                  : 'text-gray-450 hover:text-gray-650'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border-none rounded-xl text-[10px] font-semibold outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all text-gray-700"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <AnnouncementSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-gray-150 p-8 shadow-xs">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">Failed to load announcements</h3>
          <p className="text-xs text-gray-400 font-semibold">Check your connection and try again.</p>
          <button onClick={() => refetch()} className="mx-auto flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-black rounded-xl btn-tactile">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-white border border-gray-150 rounded-[2rem] space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
            <Megaphone size={28} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600">No announcements yet</h3>
          <p className="text-xs text-gray-400 font-semibold max-w-xs mx-auto">
            {searchQuery || selectedCategory !== 'All'
              ? 'No posts match your current filters. Try clearing the search or selecting a different category.'
              : 'No posts have been published. Switch on Admin Mode to create your first announcement.'
            }
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mx-auto flex items-center gap-1 text-xs text-brand-600 font-black btn-tactile px-3 py-1.5 rounded-lg bg-brand-50">
              Clear Filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item, index) => {
            const isUnread = !readIds.includes(item.id);
            const isFuture = item.scheduled_at && new Date(item.scheduled_at) > new Date();
            const cfg = CATEGORY_CONFIG[item.category];
            const seenCount = seenStats[item.id] || 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, type: 'spring', stiffness: 300, damping: 28 }}
                className={`bg-white p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all group ${
                  item.is_pinned
                    ? 'border-amber-300 border-2 bg-gradient-to-br from-amber-500/[0.02] to-white'
                    : isUnread
                    ? 'border-brand-200 bg-gradient-to-br from-brand-50/30 to-white'
                    : 'border-gray-150'
                }`}
              >
                {/* Pinned indicator line */}
                {item.is_pinned && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-200 rounded-t-[2rem]" />
                )}

                {/* Unread indicator dot */}
                {isUnread && !item.is_pinned && (
                  <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                )}

                <div>
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Category icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.badge}`}>
                        {cfg.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Category badge */}
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${cfg.badge}`}>
                            {item.category}
                          </span>

                          {/* Target role */}
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[8px] font-bold text-gray-400 uppercase">
                            {item.target_role === 'all' ? '📢 Everyone' : item.target_role === 'admin' ? '🔒 Admins' : '📞 Agents'}
                          </span>

                          {/* NEW badge */}
                          {isUnread && (
                            <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[8px] font-black uppercase tracking-wider">
                              New
                            </motion.span>
                          )}

                          {/* Scheduled future badge */}
                          {isFuture && isAdminMode && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase">
                              <Calendar size={8} /> Scheduled
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-gray-900 leading-snug font-display flex items-center gap-1.5 flex-wrap">
                          {item.title}
                          {item.is_pinned && <Pin size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                        </h3>
                      </div>
                    </div>

                    {/* Admin actions */}
                    {isAdminMode && (
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => openEditModal(item, e)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-medium mb-5">{item.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(item.published_at || item.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Seen counter */}
                    <div className="flex items-center gap-1">
                      <Eye size={11} />
                      <span>
                        Seen by {seenCount}{totalTeam > 0 ? `/${totalTeam}` : ''} {seenCount === 1 ? 'user' : 'users'}
                      </span>
                    </div>

                    {/* Read confirmation for current user */}
                    {readIds.includes(item.id) && (
                      <div className="flex items-center gap-0.5 text-emerald-600">
                        <CheckCircle2 size={11} /> You read this
                      </div>
                    )}
                  </div>

                  {item.scheduled_at && !isFuture && (
                    <div className="flex items-center gap-1 text-blue-400">
                      <Zap size={11} />
                      Auto-published
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── CRUD Modal ── */}
      <AnimatePresence>
        {isCrudModalOpen && (
          <CrudModal
            editing={editingAnnouncement}
            formTitle={formTitle} setFormTitle={setFormTitle}
            formContent={formContent} setFormContent={setFormContent}
            formCategory={formCategory} setFormCategory={setFormCategory}
            formTargetRole={formTargetRole} setFormTargetRole={setFormTargetRole}
            formIsPinned={formIsPinned} setFormIsPinned={setFormIsPinned}
            formIsPublished={formIsPublished} setFormIsPublished={setFormIsPublished}
            formScheduledAt={formScheduledAt} setFormScheduledAt={setFormScheduledAt}
            onSubmit={handleSubmitForm}
            onClose={() => setIsCrudModalOpen(false)}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            title={deleteTarget.title}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
