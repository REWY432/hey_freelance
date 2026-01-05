import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  MessageSquare, 
  FileText, 
  Package, 
  CheckCircle, 
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { AppNotification, NotificationType, ViewState } from '../types';
import { api } from '../services/supabase';
import { triggerHaptic } from '../services/telegram';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onNavigate?: (view: ViewState, id?: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  userId,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const data = await api.getNotifications(userId);
    setNotifications(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    await fetchNotifications();
  };

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.isRead) return;
    
    triggerHaptic('light');
    await api.markNotificationRead(notification.id);
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllRead = async () => {
    triggerHaptic('medium');
    await api.markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = async (notificationId: string) => {
    triggerHaptic('light');
    await api.deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    await handleMarkRead(notification);
    triggerHaptic('light');

    // Навигация к объекту
    if (onNavigate) {
      if (notification.jobId) {
        onNavigate(ViewState.PROFILE, notification.jobId);
      } else if (notification.serviceId) {
        onNavigate(ViewState.PROFILE, notification.serviceId);
      }
    }
    
    onClose();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_PROPOSAL:
        return <MessageSquare className="text-blue-400" size={20} />;
      case NotificationType.SERVICE_REQUEST:
        return <Package className="text-purple-400" size={20} />;
      case NotificationType.JOB_APPROVED:
      case NotificationType.SERVICE_APPROVED:
        return <CheckCircle className="text-emerald-400" size={20} />;
      case NotificationType.JOB_REJECTED:
      case NotificationType.SERVICE_REJECTED:
        return <XCircle className="text-rose-400" size={20} />;
      default:
        return <Bell className="text-slate-400" size={20} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_PROPOSAL:
        return 'border-blue-500/30 bg-blue-500/5';
      case NotificationType.SERVICE_REQUEST:
        return 'border-purple-500/30 bg-purple-500/5';
      case NotificationType.JOB_APPROVED:
      case NotificationType.SERVICE_APPROVED:
        return 'border-emerald-500/30 bg-emerald-500/5';
      case NotificationType.JOB_REJECTED:
      case NotificationType.SERVICE_REJECTED:
        return 'border-rose-500/30 bg-rose-500/5';
      default:
        return 'border-slate-700 bg-slate-800/50';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days < 7) return `${days} д`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="absolute top-0 right-0 h-full w-full max-w-md bg-slate-900 shadow-2xl
                   animate-in slide-in-from-right duration-300 border-l border-slate-800"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Bell className="text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Уведомления</h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400">{unreadCount} непрочитанных</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white 
                         hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white 
                         hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mark all read button */}
          {unreadCount > 0 && (
            <div className="px-4 pb-3">
              <button
                onClick={handleMarkAllRead}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl
                         text-sm text-slate-300 flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCheck size={16} />
                Отметить все прочитанными
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-y-auto overscroll-contain custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="text-blue-500 animate-spin" size={32} />
              <p className="text-slate-500 mt-3">Загрузка...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Bell className="text-slate-600" size={32} />
              </div>
              <p className="text-slate-400 text-center">Нет уведомлений</p>
              <p className="text-slate-600 text-sm text-center mt-1">
                Здесь появятся отклики на заказы и заявки на услуги
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer
                             hover:scale-[1.01] active:scale-[0.99]
                             ${notification.isRead 
                               ? 'border-slate-700/50 bg-slate-800/30 opacity-70' 
                               : getNotificationColor(notification.type)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full 
                                  shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  )}

                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-xl 
                                  flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {notification.title}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-slate-600 text-xs mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notification);
                          }}
                          className="p-1.5 bg-slate-700/50 rounded-lg text-slate-400 
                                   hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Прочитано"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="p-1.5 bg-slate-700/50 rounded-lg text-slate-400 
                                 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;

