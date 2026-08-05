import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NotificationItem, NotificationPriority } from '@/hooks/useNotifications';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Pin, 
  ExternalLink, 
  Check, 
  UserCheck, 
  PhoneCall, 
  CreditCard, 
  Zap, 
  Info,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<'all' | 'unread' | 'leads' | 'calls' | 'payments' | 'tasks' | 'system'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | ''>('');
  const [search, setSearch] = useState('');
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    notifications,
    totalCount,
    unreadCount,
    isLoading,
    isError,
    hasMore,
    page,
    loadNextPage,
    loadPrevPage,
    markAsRead,
    markAllAsRead,
    togglePin,
    archive,
    deleteNotifications,
    refetch,
  } = useNotifications({
    category,
    priority: priorityFilter || undefined,
    search,
    isArchived: isArchivedView,
    limit: 15,
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = () => {
    if (selectedIds.length > 0) {
      archive(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length > 0) {
      deleteNotifications(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkMarkRead = () => {
    if (selectedIds.length > 0) {
      markAsRead(selectedIds);
      setSelectedIds([]);
    }
  };

  const getPriorityBadgeClass = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case 'high':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('lead')) return <UserCheck className="w-5 h-5 text-blue-600" />;
    if (type.includes('call') || type.includes('followup')) return <PhoneCall className="w-5 h-5 text-emerald-600" />;
    if (type.includes('payment') || type.includes('invoice')) return <CreditCard className="w-5 h-5 text-amber-600" />;
    if (type.includes('ticket') || type.includes('workflow')) return <Zap className="w-5 h-5 text-purple-600" />;
    return <Info className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enterprise real-time alerts, lead assignments, callbacks, & workflow updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Refresh Notifications"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 font-semibold text-xs rounded-lg transition-all shadow-sm"
          >
            <CheckCheck size={16} className="text-brand-600" />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Main Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Main Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
            {(['all', 'unread', 'leads', 'calls', 'payments', 'tasks', 'system'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setCategory(tab);
                  setIsArchivedView(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  category === tab && !isArchivedView
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => setIsArchivedView(!isArchivedView)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                isArchivedView
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Archive size={14} />
              Archived
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-brand-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Bulk Actions Bar (When items selected) */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between animate-fade-in">
            <span className="text-xs font-semibold text-brand-900">
              {selectedIds.length} items selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="px-3 py-1 bg-white border border-brand-200 text-brand-700 text-xs font-semibold rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1"
              >
                <Check size={14} />
                Mark Read
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1 bg-white border border-brand-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                <Archive size={14} />
                Archive
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Table / List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <input
            type="checkbox"
            checked={selectedIds.length > 0 && selectedIds.length === notifications.length}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="w-8"></span>
          <span className="flex-1">Notification</span>
          <span className="w-24 text-center">Priority</span>
          <span className="w-32 text-right">Time</span>
          <span className="w-24 text-right">Actions</span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Loading Enterprise Notifications...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500 text-xs flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            Failed to load notifications. Please try refreshing.
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Notifications Found</p>
            <p className="text-xs text-gray-400">Try adjusting your category or search filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`px-6 py-4 flex items-center gap-4 transition-all hover:bg-gray-50/80 ${
                  !item.is_read ? 'bg-brand-50/20 font-semibold' : ''
                } ${item.is_pinned ? 'border-l-4 border-brand-500' : ''}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />

                {/* Category Icon */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  {getNotificationIcon(item.type)}
                </div>

                {/* Body Content */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (!item.is_read) markAsRead([item.id]);
                    if (item.action_url) navigate(item.action_url);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!item.is_read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {item.title}
                    </p>
                    {item.is_pinned && (
                      <Pin size={12} className="text-brand-600 fill-brand-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {item.body}
                  </p>
                </div>

                {/* Priority Badge */}
                <div className="w-24 text-center">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getPriorityBadgeClass(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>

                {/* Timestamp */}
                <div className="w-32 text-right text-xs text-gray-400 font-medium">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </div>

                {/* Actions */}
                <div className="w-24 flex items-center justify-end gap-1">
                  <button
                    onClick={() => togglePin(item.id)}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${item.is_pinned ? 'text-brand-600' : 'text-gray-400'}`}
                    title={item.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={() => archive([item.id])}
                    className="p-1.5 rounded text-gray-400 hover:text-slate-700 hover:bg-gray-200 transition-colors"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>
                  {item.action_url && (
                    <button
                      onClick={() => navigate(item.action_url!)}
                      className="p-1.5 rounded text-brand-600 hover:bg-brand-100 transition-colors"
                      title="Open Detail"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {notifications.length} of {totalCount} notifications
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPrevPage}
              disabled={page === 0}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="font-bold text-slate-700">Page {page + 1}</span>
            <button
              onClick={loadNextPage}
              disabled={!hasMore}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
