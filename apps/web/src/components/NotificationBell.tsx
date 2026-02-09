import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '../hooks/usePushNotifications';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  relatedUser?: {
    id: string;
    name: string;
    image?: string;
  };
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const pushNotifications = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPromptedPush, setHasPromptedPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications?limit=10`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    // Prompt for push notifications on first click if not already subscribed
    if (
      !hasPromptedPush &&
      pushNotifications.isSupported &&
      pushNotifications.permission === 'default' &&
      !pushNotifications.isSubscribed
    ) {
      setHasPromptedPush(true);
      // Don't block the UI, let it run in background
      pushNotifications.subscribe().catch(console.error);
    }

    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return 'person_add';
      case 'FRIEND_ACCEPTED':
        return 'how_to_reg';
      case 'ROUTE_VALIDATED':
        return 'check_circle';
      case 'COMMENT_RECEIVED':
        return 'chat';
      case 'ROUTE_CREATED':
        return 'add_location';
      case 'ACHIEVEMENT_UNLOCKED':
        return 'emoji_events';
      default:
        return 'notifications';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-climb-dark shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
      >
        <span className="material-symbols-outlined text-[20px] text-climb-dark">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-hold-pink text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border border-climb-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border-2 border-climb-dark shadow-neo-lg z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b-2 border-climb-dark/10 p-4 flex items-center justify-between">
            <h3 className="font-extrabold text-climb-dark">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold text-hold-blue hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-2">
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-hold-pink border-r-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-climb-dark/60 text-sm">
                Aucune notification
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:bg-cream ${
                    !notification.read ? 'bg-hold-blue/5' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    !notification.read ? 'bg-hold-blue/20' : 'bg-cream'
                  }`}>
                    <span className={`material-symbols-outlined text-[16px] ${
                      !notification.read ? 'text-hold-blue' : 'text-climb-dark/40'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${
                      !notification.read ? 'font-bold text-climb-dark' : 'font-medium text-climb-dark/70'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-climb-dark/50 mt-0.5 truncate">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-climb-dark/40 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-hold-blue shrink-0 mt-2"></span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
