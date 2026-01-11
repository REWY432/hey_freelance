import React from 'react';
import { Briefcase, Search, Package, FileText, Inbox, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-jobs' | 'no-services' | 'no-results' | 'no-proposals' | 'no-my-jobs' | 'no-my-services' | 'error';
  searchQuery?: string;
  onRetry?: () => void;
  errorMessage?: string;
}

const configs = {
  'no-jobs': {
    icon: Briefcase,
    title: 'Пока тихо...',
    subtitle: 'Новые заказы появятся здесь',
    gradient: 'from-blue-500 to-cyan-500',
  },
  'no-services': {
    icon: Package,
    title: 'Услуг пока нет',
    subtitle: 'Будьте первым — создайте услугу!',
    gradient: 'from-emerald-500 to-teal-500',
  },
  'no-results': {
    icon: Search,
    title: 'Ничего не найдено',
    subtitle: 'Попробуйте изменить запрос',
    gradient: 'from-amber-500 to-orange-500',
  },
  'no-proposals': {
    icon: Inbox,
    title: 'Откликов пока нет',
    subtitle: 'Они появятся здесь, когда кто-то откликнется',
    gradient: 'from-purple-500 to-pink-500',
  },
  'no-my-jobs': {
    icon: FileText,
    title: 'У вас пока нет заказов',
    subtitle: 'Создайте первый заказ, чтобы найти исполнителя',
    gradient: 'from-blue-500 to-indigo-500',
  },
  'no-my-services': {
    icon: Sparkles,
    title: 'У вас пока нет услуг',
    subtitle: 'Создайте услугу и получайте заявки от клиентов',
    gradient: 'from-emerald-500 to-cyan-500',
  },
  'error': {
    icon: AlertCircle,
    title: 'Что-то пошло не так',
    subtitle: 'Не удалось загрузить данные',
    gradient: 'from-rose-500 to-red-600',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({ type, searchQuery, onRetry, errorMessage }) => {
  const config = configs[type] || configs['no-results'];

  // Если есть searchQuery, показываем "не найдено"
  const displayConfig = searchQuery ? configs['no-results'] : config;
  const DisplayIcon = displayConfig.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${displayConfig.gradient} blur-2xl opacity-20 animate-pulse rounded-full scale-150`} 
        />
        
        {/* Icon box */}
        <div 
          className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${displayConfig.gradient} 
                      flex items-center justify-center shadow-lg ${type === 'error' ? 'animate-shake' : 'animate-float'}`}
        >
          <DisplayIcon size={36} className="text-white" />
        </div>

        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-slate-600 rounded-full animate-bounce" 
             style={{ animationDelay: '0.1s' }} />
        <div className="absolute -bottom-1 -left-3 w-2 h-2 bg-slate-700 rounded-full animate-bounce" 
             style={{ animationDelay: '0.3s' }} />
      </div>

      {/* Text */}
      <h3 className="text-lg font-bold text-white mb-2 text-center">
        {displayConfig.title}
      </h3>
      <p className="text-sm text-slate-400 text-center max-w-[240px]">
        {searchQuery 
          ? `По запросу "${searchQuery}" ничего не найдено` 
          : errorMessage || displayConfig.subtitle}
      </p>

      {/* Retry button for errors */}
      {type === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 
                     text-white font-bold text-sm rounded-xl transition-all active:scale-95
                     shadow-lg shadow-rose-600/20"
        >
          <RefreshCw size={16} />
          Повторить
        </button>
      )}

      {/* Decorative line */}
      {type !== 'error' && (
        <div className="mt-6 flex items-center gap-2">
          <div className="w-8 h-0.5 bg-slate-700 rounded" />
          <div className="w-2 h-2 bg-slate-700 rounded-full" />
          <div className="w-8 h-0.5 bg-slate-700 rounded" />
        </div>
      )}
    </div>
  );
};

export default EmptyState;

