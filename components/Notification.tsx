import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-400" size={20} />,
    error: <XCircle className="text-rose-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />
  };

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-rose-500/30 bg-rose-500/10',
    info: 'border-blue-500/30 bg-blue-500/10'
  };

  return (
    <div className={`fixed top-6 left-4 right-4 z-[100] flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${colors[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium text-white">{message}</p>
    </div>
  );
};

export default Notification;