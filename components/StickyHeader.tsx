import React, { useState, useEffect, useRef } from 'react';

interface StickyHeaderProps {
  children: React.ReactNode;
  // Через сколько пикселей скролла показывать
  threshold?: number;
  // Класс для контейнера
  className?: string;
}

const StickyHeader: React.FC<StickyHeaderProps> = ({
  children,
  threshold = 150,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Показываем когда проскроллили больше threshold
      if (currentScrollY > threshold && !isVisible) {
        setIsAnimating(true);
        setIsVisible(true);
      } 
      // Скрываем когда вернулись наверх
      else if (currentScrollY <= threshold && isVisible) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, isVisible]);

  // Убираем флаг анимации после её завершения
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-40 
                 bg-slate-900/95 backdrop-blur-md 
                 border-b border-slate-800 shadow-lg
                 animate-in slide-in-from-top duration-200
                 ${className}`}
    >
      {children}
    </div>
  );
};

// Специализированный sticky header для страницы заказа
interface JobStickyHeaderProps {
  budget: string;
  onApply: () => void;
  isApplied?: boolean;
  isOwner?: boolean;
}

export const JobStickyHeader: React.FC<JobStickyHeaderProps> = ({
  budget,
  onApply,
  isApplied = false,
  isOwner = false
}) => {
  return (
    <StickyHeader threshold={200}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Бюджет</div>
          <div className="text-lg font-bold text-emerald-400">{budget}</div>
        </div>
        
        {!isOwner && (
          <button 
            onClick={onApply}
            disabled={isApplied}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              isApplied 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isApplied ? '✓ Отклик отправлен' : 'Откликнуться'}
          </button>
        )}
        
        {isOwner && (
          <span className="text-sm text-slate-400">Ваш заказ</span>
        )}
      </div>
    </StickyHeader>
  );
};

// Sticky header для ленты с фильтрами
interface FilterStickyHeaderProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: { key: string; label: string }[];
  resultsCount?: number;
}

export const FilterStickyHeader: React.FC<FilterStickyHeaderProps> = ({
  activeCategory,
  onCategoryChange,
  categories,
  resultsCount
}) => {
  return (
    <StickyHeader threshold={120}>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">
            {resultsCount !== undefined && `${resultsCount} заказов`}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap 
                         transition-all ${
                activeCategory === cat.key
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </StickyHeader>
  );
};

export default StickyHeader;
