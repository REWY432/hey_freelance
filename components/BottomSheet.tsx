import React, { useState, useRef, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../services/telegram';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // Настройки
  showHandle?: boolean;        // Показывать ручку для свайпа
  closeOnBackdrop?: boolean;   // Закрывать при клике на фон
  closeOnSwipe?: boolean;      // Закрывать при свайпе вниз
  maxHeight?: string;          // Максимальная высота (default: 85vh)
  snapPoints?: number[];       // Точки "прилипания" в % от высоты экрана
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  closeOnBackdrop = true,
  closeOnSwipe = true,
  maxHeight = '85vh',
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startDragY = useRef(0);

  // Порог для закрытия (в пикселях)
  const closeThreshold = 100;

  // Блокируем скролл body когда sheet открыт
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard avoidance для мобильных
  useEffect(() => {
    if (!isOpen) return;
    
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // Вычисляем насколько клавиатура перекрывает экран
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(Math.max(0, offset));
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [isOpen]);

  // Сброс состояния при открытии
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsClosing(false);
      setKeyboardOffset(0);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    triggerHaptic('light');
    // Даём время на анимацию закрытия
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 200);
  }, [onClose]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!closeOnSwipe) return;
    startY.current = e.touches[0].clientY;
    startDragY.current = dragY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !closeOnSwipe) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Только вниз (положительный diff)
    if (diff > 0) {
      setDragY(startDragY.current + diff);
    } else {
      // Небольшой "резиновый" эффект вверх
      setDragY(startDragY.current + diff * 0.2);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragY > closeThreshold) {
      // Закрываем
      handleClose();
    } else {
      // Возвращаем на место с анимацией
      setDragY(0);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`fixed inset-0 z-[70] transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-slate-800 
                   rounded-t-3xl overflow-hidden shadow-2xl
                   border-t border-slate-700
                   transition-all duration-200 ease-out
                   ${isDragging ? 'transition-none' : ''}
                   ${isClosing ? 'translate-y-full' : ''}`}
        style={{ 
          maxHeight,
          transform: isClosing 
            ? 'translateY(100%)' 
            : `translateY(${Math.max(0, dragY)}px)`,
          paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div 
            className="py-3 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto"/>
          </div>
        )}
        
        {/* Header */}
        {title && (
          <div className="px-5 pb-3 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxHeight} - 60px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
