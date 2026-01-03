import React, { useEffect, useState } from 'react';
import { Bell, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface NewJobsBannerProps {
  count: number;
  onRefresh: () => void;
  isConnected?: boolean;
  onEnableNotifications?: () => void;
  autoRefreshMs?: number;
}

const NewJobsBanner: React.FC<NewJobsBannerProps> = ({ 
  count, 
  onRefresh,
  isConnected = true,
  onEnableNotifications,
  autoRefreshMs = 7000
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  // Анимация при увеличении счётчика
  useEffect(() => {
    if (count > prevCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  const handleClick = () => {
    triggerHaptic('medium');
    onRefresh();
  };

  // Авто-обновление, если пользователь не нажал баннер
  useEffect(() => {
    if (count === 0 || !autoRefreshMs) return;
    const timer = setTimeout(() => {
      onRefresh();
      // Прокрутка к началу страницы
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, autoRefreshMs);
    return () => clearTimeout(timer);
  }, [count, autoRefreshMs, onRefresh]);

  // Плюрализация
  const getJobsWord = (n: number) => {
    if (n === 1) return 'новый заказ';
    if (n >= 2 && n <= 4) return 'новых заказа';
    return 'новых заказов';
  };

  if (count === 0) return null;

  return (
    <button
      onClick={handleClick}
      className={`
        fixed top-20 left-4 right-4 z-30 
        bg-gradient-to-r from-blue-600 to-blue-500
        text-white rounded-2xl p-4
        flex items-center justify-between gap-3
        shadow-lg shadow-blue-500/30
        border border-blue-400/20
        animate-in slide-in-from-top duration-300
        active:scale-[0.98] transition-all
        ${isAnimating ? 'scale-105' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Анимированный колокольчик */}
        <div className={`
          w-10 h-10 rounded-xl bg-white/20 
          flex items-center justify-center
          ${count > 0 ? 'animate-bounce' : ''}
        `}>
          <Bell size={20} />
        </div>
        
        <div className="text-left">
          <div className="font-bold text-base">
            +{count} {getJobsWord(count)}
          </div>
          <div className="text-blue-200 text-xs flex items-center gap-2 flex-wrap">
            <span>Нажмите чтобы обновить</span>
            {!isConnected && (
              <span className="flex items-center gap-1 text-white/80">
                <WifiOff size={14} /> Канал offline — включен резервный поллинг
              </span>
            )}
          </div>
          {onEnableNotifications && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('selection');
                onEnableNotifications();
              }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
            >
              <Wifi size={12} />
              Включить уведомления
            </button>
          )}
        </div>
      </div>

      {/* Стрелка вверх */}
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <ChevronUp size={18} />
      </div>
    </button>
  );
};

// Индикатор подключения
export const ConnectionIndicator: React.FC<{ isConnected: boolean }> = ({ 
  isConnected 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`
          p-2 rounded-full transition-colors
          ${isConnected 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/20 text-rose-400'
          }
        `}
      >
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
      </button>

      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 
                       bg-slate-800 border border-slate-700 rounded-lg
                       text-xs text-white whitespace-nowrap z-50
                       animate-in fade-in zoom-in-95 duration-150">
          {isConnected ? '🟢 Live обновления активны' : '🔴 Нет подключения'}
        </div>
      )}
    </div>
  );
};

export default NewJobsBanner;
