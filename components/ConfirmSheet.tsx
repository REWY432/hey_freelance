import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  confirmVariant = 'danger',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    triggerHaptic('medium');
    onConfirm();
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const confirmButtonClass = confirmVariant === 'danger'
    ? 'bg-rose-600 hover:bg-rose-500 text-white'
    : 'bg-blue-600 hover:bg-blue-500 text-white';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      {/* Sheet */}
      <div className="relative w-full max-w-lg mx-3 mb-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Icon */}
        <div className="flex justify-center pt-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            confirmVariant === 'danger' 
              ? 'bg-rose-500/20 text-rose-400' 
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            {confirmVariant === 'danger' ? (
              <AlertTriangle size={28} />
            ) : (
              <Trash2 size={28} />
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>
        
        {/* Buttons */}
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${confirmButtonClass}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSheet;
