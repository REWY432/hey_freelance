import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 130;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  disabled = false 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const startY = useRef(0);
  const hasReachedThreshold = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    hasReachedThreshold.current = false;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return;

    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) {
      startY.current = 0;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Elastic resistance effect
      const elasticity = 0.4;
      const distance = Math.min(diff * elasticity, MAX_PULL);
      setPullDistance(distance);

      // Haptic when first reaching threshold
      if (distance >= THRESHOLD && !hasReachedThreshold.current) {
        hasReachedThreshold.current = true;
        triggerHaptic('medium');
      }
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      triggerHaptic('success');
      
      try {
        await onRefresh();
        setRefreshComplete(true);
        triggerHaptic('light');
        
        // Show checkmark briefly
        setTimeout(() => {
          setRefreshComplete(false);
          setIsRefreshing(false);
        }, 600);
      } catch {
        setIsRefreshing(false);
      }
    }

    startY.current = 0;
    setPullDistance(0);
    hasReachedThreshold.current = false;
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = pullDistance * 3;
  const isReady = pullDistance >= THRESHOLD;

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Enhanced Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex flex-col items-center z-30 pointer-events-none transition-all duration-200"
        style={{ 
          top: Math.max(pullDistance - 60, -60),
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        {/* Glow effect */}
        <div 
          className={`absolute w-20 h-20 rounded-full blur-2xl transition-all duration-300 ${
            isReady || isRefreshing ? 'bg-blue-500/40' : 'bg-slate-600/30'
          }`}
          style={{ transform: `scale(${0.5 + progress * 0.5})` }}
        />
        
        {/* Main indicator */}
        <div 
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            refreshComplete 
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40'
              : isRefreshing 
                ? 'bg-blue-500 shadow-lg shadow-blue-500/40' 
                : isReady 
                  ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                  : 'bg-slate-700/90 backdrop-blur-sm'
          }`}
          style={{
            transform: `scale(${0.7 + progress * 0.3})`,
          }}
        >
          {/* Ring progress */}
          <svg 
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-colors ${isReady ? 'text-white/30' : 'text-white/10'}`}
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${progress * 138.2} 138.2`}
              className={`transition-colors duration-100 ${isReady ? 'text-white' : 'text-blue-400'}`}
            />
          </svg>
          
          {/* Icon */}
          {refreshComplete ? (
            <Check size={22} className="text-white animate-success-pop" />
          ) : isRefreshing ? (
            <RefreshCw size={20} className="text-white animate-spin" />
          ) : isReady ? (
            <RefreshCw 
              size={20} 
              className="text-white"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          ) : (
            <ArrowDown 
              size={20} 
              className="text-white/80"
              style={{ transform: `rotate(${Math.min(progress * 180, 180)}deg)` }}
            />
          )}
        </div>

        {/* Pull text */}
        <span 
          className={`mt-2 text-xs font-medium transition-all duration-200 ${
            isReady ? 'text-blue-400' : 'text-slate-500'
          }`}
          style={{ opacity: pullDistance > 30 ? 1 : 0 }}
        >
          {refreshComplete ? 'Готово!' : isRefreshing ? 'Обновление...' : isReady ? 'Отпустите' : 'Потяните вниз'}
        </span>
      </div>

      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;

