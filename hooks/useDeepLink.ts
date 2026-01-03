// hooks/useDeepLink.ts
// 
// Обработчик Deep Links для открытия конкретного заказа
// из постов в канале или реферальных ссылок
//
// Формат ссылок:
// - https://t.me/TeleLanceBot/app?startapp=job_123
// - https://t.me/TeleLanceBot?start=ref_456

import { useEffect, useState } from 'react';

interface DeepLinkData {
  type: 'job' | 'referral' | 'profile' | 'service' | null;
  id: string | null;
  referrerId?: string | null;
}

export function useDeepLink(): DeepLinkData {
  const [deepLink, setDeepLink] = useState<DeepLinkData>({ type: null, id: null });
  
  useEffect(() => {
    // Получаем startapp параметр из Telegram WebApp
    // Используем type assertion, т.к. start_param может отсутствовать в типах
    const initData = window.Telegram?.WebApp?.initDataUnsafe as Record<string, any> | undefined;
    const startParam = initData?.start_param as string | undefined;
    
    if (!startParam) {
      // Проверяем URL параметры (для веб-версии)
      const urlParams = new URLSearchParams(window.location.search);
      const startapp = urlParams.get('startapp') || urlParams.get('start');
      
      if (startapp) {
        parseDeepLink(startapp);
      }
      return;
    }
    
    parseDeepLink(startParam);
  }, []);
  
  const parseDeepLink = (param: string) => {
    const extractReferrer = (value: string) => {
      if (value.includes('_ref_')) {
        const [, refId] = value.split('_ref_');
        if (refId) {
          localStorage.setItem('referrer_id', refId);
          return refId;
        }
      }
      return null;
    };

    // job_123 or job_123_ref_456 → открыть заказ #123 и сохранить реферера
    if (param.startsWith('job_')) {
      const referrerId = extractReferrer(param);
      const jobId = param.replace('job_', '').split('_ref_')[0];
      setDeepLink({
        type: 'job',
        id: jobId,
        referrerId
      });
      return;
    }
    
    // service_123_ref_456 → сохранить реферера и можно подсветить услугу
    if (param.startsWith('service_')) {
      const referrerId = extractReferrer(param);
      const serviceId = param.replace('service_', '').split('_ref_')[0];
      setDeepLink({
        type: 'service',
        id: serviceId,
        referrerId
      });
      return;
    }
    
    // ref_456 → реферальная ссылка от пользователя #456
    if (param.startsWith('ref_')) {
      const refId = param.replace('ref_', '');
      localStorage.setItem('referrer_id', refId);
      setDeepLink({
        type: 'referral',
        id: refId,
        referrerId: refId
      });
      return;
    }
    
    // profile_789 → открыть профиль пользователя #789
    if (param.startsWith('profile_')) {
      setDeepLink({
        type: 'profile',
        id: param.replace('profile_', '')
      });
      return;
    }
  };
  
  return deepLink;
}

// Компонент для обработки deep link в App.tsx
export function DeepLinkHandler({ 
  onOpenJob, 
  onOpenProfile,
  onOpenService
}: { 
  onOpenJob: (jobId: string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenService?: (serviceId: string) => void;
}) {
  const deepLink = useDeepLink();
  
  useEffect(() => {
    if (deepLink.type === 'job' && deepLink.id) {
      onOpenJob(deepLink.id);
    }
    
    if (deepLink.type === 'profile' && deepLink.id) {
      onOpenProfile(deepLink.id);
    }
    
    if (deepLink.type === 'service' && deepLink.id) {
      onOpenService?.(deepLink.id);
    }
    
    // Реферал обрабатывается автоматически в useDeepLink
  }, [deepLink, onOpenJob, onOpenProfile, onOpenService]);
  
  return null;
}
