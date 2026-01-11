import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
    
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  };

  const icons = {
    success: <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />,
    error: <XCircle className="text-rose-400 flex-shrink-0" size={20} />,
    info: <Info className="text-blue-400 flex-shrink-0" size={20} />
  };

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-rose-500/30 bg-rose-500/10',
    info: 'border-blue-500/30 bg-blue-500/10'
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500'
  };

  return (
    <div 
      className={`fixed bottom-24 left-4 right-4 z-[100] transition-all duration-200 ease-out ${
        isVisible && !isLeaving 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`}
    >
      <div 
        className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-md mx-auto ${colors[type]}`}
      >
        {icons[type]}
        <p className="text-sm font-medium text-white flex-1 line-clamp-2">{message}</p>
        <button 
          onClick={handleClose}
          className="p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden max-w-md mx-auto">
        <div 
          className={`h-full ${progressColors[type]} animate-shrink`}
          style={{ 
            animationDuration: `${duration}ms`,
            animationTimingFunction: 'linear'
          }}
        />
      </div>
    </div>
  );
};

export default Toast;
