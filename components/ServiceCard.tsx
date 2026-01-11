import React, { useState } from 'react';
import { Service, ServiceCategory } from '../types';
import { Clock, ShoppingBag, Zap, CheckCircle, ChevronRight, Check, Share2, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

// Категории и их цвета
const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; colorClass: string }> = {
  [ServiceCategory.ALL]: { label: 'Все', colorClass: 'text-slate-400' },
  [ServiceCategory.DEVELOPMENT]: { label: 'Разработка', colorClass: 'text-blue-400' },
  [ServiceCategory.DESIGN]: { label: 'Дизайн', colorClass: 'text-purple-400' },
  [ServiceCategory.MARKETING]: { label: 'Маркетинг', colorClass: 'text-orange-400' },
  [ServiceCategory.COPYWRITING]: { label: 'Тексты', colorClass: 'text-emerald-400' },
  [ServiceCategory.OTHER]: { label: 'Другое', colorClass: 'text-slate-400' },
};

// Генератор аватара через DiceBear
const getAvatarUrl = (name: string) => {
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=3b82f6,8b5cf6,10b981,f97316&backgroundType=gradientLinear`;
};

interface ServiceCardProps {
  service: Service;
  onOrder: (service: Service) => void;
  onViewProfile?: (freelancerId: number) => void;
  isRequested?: boolean;
  onShare?: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  onOrder,
  onViewProfile,
  isRequested = false,
  onShare
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOrder = () => {
    triggerHaptic('medium');
    onOrder(service);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onViewProfile?.(service.freelancerId);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  const getDaysWord = (days: number) => {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  };

  const categoryConfig = CATEGORY_CONFIG[service.category as ServiceCategory] || CATEGORY_CONFIG[ServiceCategory.OTHER];

  return (
    <div className={`bg-slate-800/50 border rounded-2xl overflow-hidden 
                    hover:border-slate-600 transition-all group
                    ${service.isBoosted ? 'boosted-card border-amber-500/40' : 'border-slate-700/50'}`}>
      
      {/* Верхняя часть */}
      <div className="p-4">
        {/* Категория + Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${categoryConfig.colorClass}`}>
              {categoryConfig.label}
            </span>
            {service.isBoosted && (
              <span className="flex items-center gap-1 text-[10px] font-bold 
                             bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full
                             border border-amber-500/30">
                <Rocket size={10} />
                ТОП
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {service.ordersCount && service.ordersCount > 10 && (
              <span className="flex items-center gap-1 text-[10px] font-medium 
                             bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full
                             border border-emerald-500/20">
                <Zap size={10} />
                Популярное
              </span>
            )}
            {onShare && (
              <button 
                onClick={(e) => { e.stopPropagation(); triggerHaptic('selection'); onShare(service); }}
                className="p-3 rounded-lg bg-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors touch-target"
              >
                <Share2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Название */}
        <h3 className="text-base font-semibold text-white leading-snug mb-3 
                       line-clamp-2 group-hover:text-blue-400 transition-colors">
          {service.title}
        </h3>

        {/* Описание */}
        <div className="relative mb-4">
          <p className={`text-sm text-slate-400 leading-relaxed whitespace-pre-line transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {service.description}
          </p>
          {service.description.length > 80 && (
            <button 
              onClick={() => { triggerHaptic('selection'); setIsExpanded(!isExpanded); }}
              className="flex items-center gap-1 text-xs text-blue-400 font-medium mt-1 hover:text-blue-300 transition-colors active:scale-95"
            >
              {isExpanded ? (
                <>Свернуть <ChevronUp size={12} /></>
              ) : (
                <>Читать далее <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>

        {/* Фичи */}
        {service.features && service.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {service.features.slice(0, 3).map((feature, idx) => (
              <span 
                key={idx}
                className="flex items-center gap-1 text-[11px] text-slate-300
                          bg-slate-700/50 px-2 py-1 rounded-lg"
              >
                <CheckCircle size={10} className="text-emerald-400" />
                {feature}
              </span>
            ))}
            {service.features.length > 3 && (
              <span className="text-[11px] text-slate-500 px-2 py-1">
                +{service.features.length - 3} ещё
              </span>
            )}
          </div>
        )}
      </div>

      {/* Разделитель */}
      <div className="border-t border-slate-700/50" />

      {/* Нижняя часть */}
      <div className="p-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          
          {/* Исполнитель */}
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-3 group/profile touch-target"
          >
            <div className="relative">
              <img 
                src={getAvatarUrl(service.freelancerName || 'User')}
                alt={service.freelancerName}
                className="w-10 h-10 rounded-full"
                loading="lazy"
              />
              {service.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 
                              bg-emerald-500 rounded-full border-2 border-slate-800" />
              )}
            </div>
            
            <div className="text-left">
              <div className="text-sm font-medium text-white group-hover/profile:text-blue-400 
                            transition-colors flex items-center gap-1">
                {service.freelancerName || 'Unknown'}
                <ChevronRight size={14} className="text-slate-500" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {service.ordersCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={10} />
                    {service.ordersCount} заказов
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Цена */}
          <div className="text-right">
            <div className="text-lg font-bold text-white mb-1">
              {formatPrice(service.price)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock size={10} />
              {service.deliveryDays} {getDaysWord(service.deliveryDays)}
            </div>
          </div>
        </div>

        {/* Кнопка */}
        <button
          onClick={handleOrder}
          disabled={isRequested}
          className={`w-full mt-4 py-3 font-bold text-sm rounded-xl
                     transition-all flex items-center justify-center gap-2
                     ${isRequested 
                       ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                       : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]'
                     }`}
        >
          {isRequested ? (
            <>
              <Check size={16} />
              Заявка отправлена
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              Заказать
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// === КОМПАКТНАЯ ВЕРСИЯ ===
export const ServiceCardCompact: React.FC<ServiceCardProps> = ({ 
  service, 
  onOrder,
  isRequested = false,
  onShare
}) => {

  const handleOrder = () => {
    triggerHaptic('medium');
    onOrder(service);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onShare?.(service);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  const categoryConfig = CATEGORY_CONFIG[service.category as ServiceCategory] || CATEGORY_CONFIG[ServiceCategory.OTHER];

  return (
    <div className={`bg-slate-800/50 border rounded-xl overflow-hidden 
                    hover:border-slate-600 transition-all
                    ${service.isBoosted ? 'boosted-card border-amber-500/40' : 'border-slate-700/50'}`}>
      
      <div className="p-3">
        {/* Категория + Boosted */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${categoryConfig.colorClass}`}>
            {categoryConfig.label}
          </span>
          {service.isBoosted && (
            <Rocket size={10} className="text-amber-400" />
          )}
        </div>

        {/* Название */}
        <h3 className="text-sm font-semibold text-white leading-snug mt-1 mb-2 line-clamp-2">
          {service.title}
        </h3>

        {/* Исполнитель */}
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={getAvatarUrl(service.freelancerName || 'User')}
            alt={service.freelancerName}
            className="w-6 h-6 rounded-full"
            loading="lazy"
          />
          <span className="text-xs text-slate-400 truncate">
            {service.freelancerName || 'Unknown'}
          </span>
        </div>

        {/* Цена и кнопка */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">
              {formatPrice(service.price)}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock size={9} />
              {service.deliveryDays} дн.
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
              >
                <Share2 size={14} />
              </button>
            )}
            <button
              onClick={handleOrder}
              disabled={isRequested}
              className={`px-3 py-2 font-bold text-xs rounded-lg transition-all
                         ${isRequested 
                           ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                           : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                         }`}
            >
              {isRequested ? <Check size={14} /> : 'Заказать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
