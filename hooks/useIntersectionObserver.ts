import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useIntersectionObserver = ({
  threshold = 0.1,
  rootMargin = '100px',
  triggerOnce = true
}: UseIntersectionObserverOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasTriggered(true);
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { ref: elementRef, isVisible, hasTriggered };
};

// Hook for lazy loading a list of items
export const useLazyLoadList = <T>(
  items: T[],
  initialCount: number = 10,
  loadMoreCount: number = 10
) => {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + loadMoreCount, items.length));
  }, [items.length, loadMoreCount]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < items.length) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [visibleCount, items.length, loadMore]);

  // Reset when items change significantly
  useEffect(() => {
    if (items.length < visibleCount) {
      setVisibleCount(Math.min(initialCount, items.length));
    }
  }, [items.length, visibleCount, initialCount]);

  return {
    visibleItems: items.slice(0, visibleCount),
    loadMoreRef,
    hasMore: visibleCount < items.length,
    loadMore
  };
};

export default useIntersectionObserver;
