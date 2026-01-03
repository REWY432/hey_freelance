// hooks/useOnboarding.ts
//
// Хук для управления онбордингом:
// - Проверка необходимости показа
// - Сброс для повторного просмотра
// - Отслеживание прогресса

import { useState, useEffect, useCallback } from 'react';
import { getCloudData, setCloudData } from '../services/telegram';

import { ONBOARDING_VERSION } from '../constants';

interface OnboardingState {
  completed: boolean;
  completedAt?: string;
  version: number;
  lastSlideViewed?: number;
  interests?: string[];
}
const STORAGE_KEY = 'onboarding_completed';
const CLOUD_KEY = 'onboarding_completed';

export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check onboarding status
  const checkStatus = useCallback(async (): Promise<boolean> => {
    // 1. Quick check localStorage
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        // Check version - if we updated onboarding, show it again
        if (parsed.version >= ONBOARDING_VERSION) {
          return true;
        }
      } catch {
        // Simple string 'true' from old version
        // show onboarding again for older users
        if (localData === 'true') {
          return false;
        }
      }
    }

    // 2. Check CloudStorage for cross-device sync
    try {
      const cloudData = await getCloudData(CLOUD_KEY);
      if (cloudData?.completed && cloudData.version >= ONBOARDING_VERSION) {
        // Sync to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
        return true;
      }
    } catch (e) {
      console.warn('CloudStorage check failed:', e);
    }

    return false;
  }, []);

  // Initial check
  useEffect(() => {
    checkStatus().then(completed => {
      setIsCompleted(completed);
      setIsLoading(false);
    });
  }, [checkStatus]);

  // Mark as completed
  const complete = useCallback((data?: Partial<OnboardingState>) => {
    const state: OnboardingState = {
      completed: true,
      completedAt: new Date().toISOString(),
      version: ONBOARDING_VERSION,
      interests: data?.interests || []
    };

    // Save to both storages
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setCloudData(CLOUD_KEY, state);
    
    setIsCompleted(true);
  }, []);

  // Reset to show onboarding again
  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCloudData(CLOUD_KEY, null);
    setIsCompleted(false);
  }, []);

  // Save progress (which slide user is on)
  const saveProgress = useCallback((slideIndex: number) => {
    const currentData = localStorage.getItem(STORAGE_KEY);
    let state: Partial<OnboardingState> = {};
    
    if (currentData) {
      try {
        state = JSON.parse(currentData);
      } catch {}
    }

    state.lastSlideViewed = slideIndex;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  // Get last viewed slide (for resuming)
  const getLastSlide = useCallback((): number => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return parsed.lastSlideViewed || 0;
      } catch {}
    }
    return 0;
  }, []);

  return {
    isCompleted,
    isLoading,
    complete,
    reset,
    saveProgress,
    getLastSlide,
    needsOnboarding: isCompleted === false
  };
}

// Утилита для принудительного сброса (для тестирования)
export const resetOnboarding = () => {
  localStorage.removeItem(STORAGE_KEY);
  setCloudData(CLOUD_KEY, null);
  console.log('🔄 Onboarding reset. Refresh the page to see it again.');
};

// Добавляем в window для удобного тестирования
if (typeof window !== 'undefined') {
  (window as any).resetOnboarding = resetOnboarding;
}

export default useOnboarding;
