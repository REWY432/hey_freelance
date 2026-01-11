import { useRef, useCallback } from 'react';
import { triggerHaptic } from '../services/telegram';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  enabled = true
}: UseSwipeNavigationOptions) => {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const deltaX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    deltaX.current = 0;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || startX.current === null || startY.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;
    
    // Only register horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      deltaX.current = diffX;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || startX.current === null) return;
    
    if (deltaX.current > threshold && onSwipeRight) {
      triggerHaptic('light');
      onSwipeRight();
    } else if (deltaX.current < -threshold && onSwipeLeft) {
      triggerHaptic('light');
      onSwipeLeft();
    }
    
    startX.current = null;
    startY.current = null;
    deltaX.current = 0;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

export default useSwipeNavigation;
