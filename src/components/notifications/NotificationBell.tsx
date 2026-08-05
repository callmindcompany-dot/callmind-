import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  onNavigateToNotifications?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToNotifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewAll = () => {
    setIsOpen(false);
    if (onNavigateToNotifications) {
      onNavigateToNotifications();
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-200"
        title="Notifications"
        aria-label="Toggle notifications dropdown"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-slate-700' : 'text-gray-500'} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onViewAllClick={handleViewAll}
        />
      )}
    </div>
  );
};
