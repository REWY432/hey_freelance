import { User } from '../types';

// Declare global Telegram window object
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: User;
          query_id?: string;
          auth_date?: number;
          hash?: string;
          start_param?: string;  // Deep link parameter
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        isVersionAtLeast: (version: string) => boolean;
        colorScheme: 'light' | 'dark';
        openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        showPopup: (params: { title?: string; message: string; buttons?: any[] }, callback?: (id: string) => void) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: any, success: boolean) => void) => void;
          getItem: (key: string, callback: (error: any, value: string) => void) => void;
          getItems: (keys: string[], callback: (error: any, values: string[]) => void) => void;
          removeItem: (key: string, callback?: (error: any, success: boolean) => void) => void;
          removeItems: (keys: string[], callback?: (error: any, success: boolean) => void) => void;
          getKeys: (callback: (error: any, keys: string[]) => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        openTelegramLink: (url: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
      };
    };
  }
}

const MOCK_USER: User = {
  id: 123456789,
  first_name: "Demo",
  last_name: "User",
  username: "demo_user",
  is_premium: true
};

export const getTelegramUser = (): User => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return MOCK_USER;
};

export const getThemeParams = () => {
  return window.Telegram?.WebApp?.themeParams || {};
};

// Синхронизация CSS переменных с темой Telegram
export const syncTelegramTheme = () => {
  const theme = getThemeParams();
  const root = document.documentElement;
  
  if (theme.bg_color) {
    root.style.setProperty('--tg-bg', theme.bg_color);
  }
  if (theme.text_color) {
    root.style.setProperty('--tg-text', theme.text_color);
  }
  if (theme.hint_color) {
    root.style.setProperty('--tg-hint', theme.hint_color);
  }
  if (theme.link_color) {
    root.style.setProperty('--tg-link', theme.link_color);
  }
  if (theme.button_color) {
    root.style.setProperty('--tg-button', theme.button_color);
  }
  if (theme.button_text_color) {
    root.style.setProperty('--tg-button-text', theme.button_text_color);
  }
  if (theme.secondary_bg_color) {
    root.style.setProperty('--tg-secondary-bg', theme.secondary_bg_color);
  }
};

export const BOT_USERNAME = 'hey_birazhabot';

export const initTelegramApp = () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    try {
        window.Telegram.WebApp.expand();
        // Синхронизируем тему
        syncTelegramTheme();
    } catch (e) {
        console.warn('Failed to expand WebApp', e);
    }
  }
};

export const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' | 'selection') => {
    if (!window.Telegram?.WebApp?.HapticFeedback) return;
    try {
        const h = window.Telegram.WebApp.HapticFeedback;
        if (type === 'success' || type === 'error') {
            h.notificationOccurred(type);
        } else if (type === 'selection') {
            h.selectionChanged();
        } else {
            h.impactOccurred(type);
        }
    } catch (e) {
        console.warn('Haptic feedback error', e);
    }
};

const isCloudStorageSupported = () => {
    return window.Telegram?.WebApp?.isVersionAtLeast?.('6.9');
};

export const setCloudData = (key: string, value: any) => {
    const stringValue = JSON.stringify(value);
    
    if (isCloudStorageSupported()) {
        window.Telegram?.WebApp?.CloudStorage?.setItem(key, stringValue, (err, stored) => {
            if (err) {
                console.warn('CloudStorage error, falling back to localStorage', err);
                localStorage.setItem(key, stringValue);
            }
        });
    } else {
        localStorage.setItem(key, stringValue);
    }
};

export const getCloudData = (key: string): Promise<any> => {
    return new Promise((resolve) => {
        if (isCloudStorageSupported()) {
            window.Telegram?.WebApp?.CloudStorage?.getItem(key, (err, value) => {
                if (err) {
                    console.warn('CloudStorage error, checking localStorage', err);
                    const local = localStorage.getItem(key);
                    resolve(local ? JSON.parse(local) : null);
                } else {
                    resolve(value ? JSON.parse(value) : null);
                }
            });
        } else {
            const local = localStorage.getItem(key);
            resolve(local ? JSON.parse(local) : null);
        }
    });
};

export const openTelegramChat = (username: string, startParam?: string) => {
  // If startParam is provided (like text), use t.me/user?text=...
  let url = `https://t.me/${username}`;
  if (startParam) {
    url += `?text=${encodeURIComponent(startParam)}`;
  }
  
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
};

export const shareContent = (text: string, url: string = `https://t.me/${BOT_USERNAME}`) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
        window.open(shareUrl, '_blank');
    }
};

export const buildReferralLink = (params: { 
  referrerId: number; 
  type?: 'app' | 'job' | 'service'; 
  targetId?: string; 
}) => {
  const { referrerId, type = 'app', targetId } = params;
  
  let startParam = `ref_${referrerId}`;
  
  if (type === 'job' && targetId) {
    startParam = `job_${targetId}_ref_${referrerId}`;
  }
  
  if (type === 'service' && targetId) {
    startParam = `service_${targetId}_ref_${referrerId}`;
  }
  
  return `https://t.me/${BOT_USERNAME}/start?startapp=${startParam}`;
};

// Получить start_param для deep linking
export const getStartParam = (): string | undefined => {
    return window.Telegram?.WebApp?.initDataUnsafe?.start_param;
};
