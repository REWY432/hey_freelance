import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Briefcase, CheckCircle, Bell, User } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

type ToastType = 'proposal' | 'job' | 'status' | 'info';

interface LiveToastProps {
  type: ToastType;
  title: string;
  message: string;
  avatar?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onClose: () => void;
}

const LiveToast: React.FC<LiveToastProps> = ({
  type,
  title,
  message,
  avatar,
  action,
  duration = 5000,
  onClose
}) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  // Автоматическое закрытие
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
    }, 100);

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  };

  const handleAction = () => {
    triggerHaptic('medium');
    action?.onClick();
    handleClose();
  };

  const icons = {
    proposal: <MessageSquare size={20} />,
    job: <Briefcase size={20} />,
    status: <CheckCircle size={20} />,
    info: <Bell size={20} />
  };

  const colors = {
    proposal: 'from-blue-600 to-blue-500 border-blue-400/30',
    job: 'from-emerald-600 to-emerald-500 border-emerald-400/30',
    status: 'from-purple-600 to-purple-500 border-purple-400/30',
    info: 'from-slate-700 to-slate-600 border-slate-500/30'
  };

  return (
    <div 
      className={`
        fixed top-4 left-4 right-4 z-[100]
        bg-gradient-to-r ${colors[type]}
        rounded-2xl border shadow-2xl
        overflow-hidden
        ${isLeaving 
          ? 'animate-out fade-out slide-out-to-top duration-200' 
          : 'animate-in fade-in slide-in-from-top duration-300'
        }
      `}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-100"
           style={{ width: `${progress}%` }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar or Icon */}
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            {avatar ? (
              <span className="text-xl">{avatar}</span>
            ) : (
              icons[type]
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-white text-sm">{title}</h4>
              <button 
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <X size={16} className="text-white/70" />
              </button>
            </div>
            <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{message}</p>
            
            {/* Action button */}
            {action && (
              <button
                onClick={handleAction}
                className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 
                          rounded-lg text-xs font-medium text-white
                          transition-colors active:scale-95"
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Менеджер нескольких toast'ов
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  avatar?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastManagerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastManager: React.FC<ToastManagerProps> = ({ toasts, onRemove }) => {
  // Показываем только последний toast
  const currentToast = toasts[toasts.length - 1];

  if (!currentToast) return null;

  return (
    <LiveToast
      key={currentToast.id}
      type={currentToast.type}
      title={currentToast.title}
      message={currentToast.message}
      avatar={currentToast.avatar}
      action={currentToast.action}
      duration={currentToast.duration}
      onClose={() => onRemove(currentToast.id)}
    />
  );
};

// Хук для управления toast'ами
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    triggerHaptic('light');
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showProposalToast = (
    freelancerName: string, 
    jobTitle: string,
    onView?: () => void
  ) => {
    addToast({
      type: 'proposal',
      title: '📨 Новый отклик!',
      message: `${freelancerName} откликнулся на "${jobTitle}"`,
      avatar: freelancerName[0],
      action: onView ? { label: 'Посмотреть', onClick: onView } : undefined,
      duration: 6000
    });
  };

  const showNewJobToast = (jobTitle: string, budget: string) => {
    addToast({
      type: 'job',
      title: '🆕 Новый заказ',
      message: `${jobTitle} • ${budget}`,
      duration: 4000
    });
  };

  const showStatusToast = (message: string) => {
    addToast({
      type: 'status',
      title: '✅ Статус обновлён',
      message,
      duration: 3000
    });
  };

  return {
    toasts,
    addToast,
    removeToast,
    showProposalToast,
    showNewJobToast,
    showStatusToast,
    ToastContainer: () => <ToastManager toasts={toasts} onRemove={removeToast} />
  };
}

export default LiveToast;
