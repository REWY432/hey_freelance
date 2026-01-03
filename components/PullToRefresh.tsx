import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80; // Минимальное расстояние для активации
const MAX_PULL = 120; // Максимальное расстояние

const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  disabled = false 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Только если скролл в самом верху
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
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
      // Resistance effect
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);

      // Haptic when reaching threshold
      if (distance >= THRESHOLD && pullDistance < THRESHOLD) {
        triggerHaptic('light');
      }
    }
  }, [disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    startY.current = 0;
    setPullDistance(0);
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = pullDistance * 2;

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center z-30 pointer-events-none transition-opacity duration-200"
        style={{ 
          top: Math.max(pullDistance - 40, -40),
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isRefreshing 
              ? 'bg-blue-500 shadow-lg shadow-blue-500/30' 
              : pullDistance >= THRESHOLD 
                ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-slate-700'
          }`}
          style={{
            transform: `scale(${0.8 + progress * 0.2})`,
          }}
        >
          <RefreshCw 
            size={20} 
            className={`text-white transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? 50 : pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;

