import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NotificationItem, NotificationPriority } from '@/hooks/useNotifications';
import { 
  Check, 
  CheckCheck, 
  Pin, 
  Trash2, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  Clock, 
  PhoneCall, 
  CreditCard, 
  UserCheck, 
  Zap,
  Archive,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
  onViewAllClick: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
  onViewAllClick,
}) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, togglePin } = useNotifications({ limit: 5 });

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Urgent Priority" />;
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-amber-500" title="High Priority" />;
      case 'medium':
        return <span className="w-2 h-2 rounded-full bg-blue-500" title="Medium Priority" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-gray-300" title="Low Priority" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('lead')) return <UserCheck className="w-4 h-4 text-blue-600" />;
    if (type.includes('call') || type.includes('followup')) return <PhoneCall className="w-4 h-4 text-emerald-600" />;
    if (type.includes('payment') || type.includes('invoice')) return <CreditCard className="w-4 h-4 text-amber-600" />;
    if (type.includes('ticket') || type.includes('workflow')) return <Zap className="w-4 h-4 text-purple-600" />;
    return <Info className="w-4 h-4 text-gray-500" />;
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markAsRead([item.id]);
    }
    if (item.action_url) {
      onClose();
      navigate(item.action_url);
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-bold rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* List Content */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-500">No notifications yet</p>
            <p className="text-[10px] text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3 transition-all hover:bg-gray-50/80 cursor-pointer relative group flex gap-3 ${
                !item.is_read ? 'bg-brand-50/30' : ''
              }`}
            >
              {/* Priority Dot & Category Icon */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="absolute -top-0.5 -right-0.5">
                  {getPriorityBadge(item.priority)}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs truncate ${!item.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {item.title}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {item.body}
                </p>
              </div>

              {/* Quick Actions (Pin & Read) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(item.id);
                  }}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${item.is_pinned ? 'text-brand-600' : 'text-gray-400'}`}
                  title={item.is_pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin size={12} />
                </button>
                {!item.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead([item.id]);
                    }}
                    className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-gray-200 transition-colors"
                    title="Mark as Read"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 text-center">
        <button
          onClick={() => {
            onClose();
            onViewAllClick();
          }}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1.5 w-full transition-colors"
        >
          View All Notifications
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
