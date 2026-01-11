import React, { useState, useEffect } from 'react';
import { Plus, X, FileText, Package } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface FloatingActionButtonProps {
  onCreateJob: () => void;
  onCreateService: () => void;
  showAfterScroll?: number;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onCreateJob,
  onCreateService,
  showAfterScroll = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > showAfterScroll);
      // Close menu when scrolling
      if (isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfterScroll, isExpanded]);

  const handleToggle = () => {
    triggerHaptic('medium');
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action: 'job' | 'service') => {
    triggerHaptic('light');
    setIsExpanded(false);
    if (action === 'job') {
      onCreateJob();
    } else {
      onCreateService();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className="fixed right-4 bottom-24 z-[56] flex flex-col items-end gap-3 safe-area-inset-bottom">
        {/* Options when expanded */}
        {isExpanded && (
          <>
            {/* Create Service */}
            <button
              onClick={() => handleAction('service')}
              className="flex items-center gap-3 pl-4 pr-3 py-3 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 
                         animate-in slide-in-from-bottom-2 fade-in duration-200 active:scale-95 transition-transform"
              style={{ animationDelay: '50ms' }}
            >
              <span className="text-sm font-bold">Услуга</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Package size={16} />
              </div>
            </button>

            {/* Create Job */}
            <button
              onClick={() => handleAction('job')}
              className="flex items-center gap-3 pl-4 pr-3 py-3 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 
                         animate-in slide-in-from-bottom-2 fade-in duration-200 active:scale-95 transition-transform"
            >
              <span className="text-sm font-bold">Заказ</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FileText size={16} />
              </div>
            </button>
          </>
        )}

        {/* Main FAB */}
        <button
          onClick={handleToggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${
            isExpanded 
              ? 'bg-slate-700 rotate-45' 
              : 'bg-blue-600 fab-pulse'
          }`}
        >
          {isExpanded ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
};

export default FloatingActionButton;
