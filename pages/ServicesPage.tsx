import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Service, ServiceCategory } from '../types';
import { triggerHaptic, getTelegramUser, shareContent, buildReferralLink } from '../services/telegram';
import ServiceCard, { ServiceCardCompact } from '../components/ServiceCard';
import BottomSheet from '../components/BottomSheet';
import { ServiceListSkeleton, ServiceGridSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PullToRefresh from '../components/PullToRefresh';
import { Search, LayoutGrid, List, Send, Loader2, MessageSquare, SlidersHorizontal } from 'lucide-react';

// Хук для debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Категории с цветами
const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; colorClass: string }> = {
  [ServiceCategory.ALL]: { label: 'Все', colorClass: 'bg-slate-800 text-slate-400 border-slate-700' },
  [ServiceCategory.DEVELOPMENT]: { label: 'Разработка', colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  [ServiceCategory.DESIGN]: { label: 'Дизайн', colorClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  [ServiceCategory.MARKETING]: { label: 'Маркетинг', colorClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  [ServiceCategory.COPYWRITING]: { label: 'Тексты', colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  [ServiceCategory.OTHER]: { label: 'Другое', colorClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

interface ServicesPageProps {
  services: Service[];
  onCreateRequest: (serviceId: string, message: string) => Promise<boolean>;
  isLoading?: boolean;
  hasError?: boolean;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onRefresh?: () => Promise<void>;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ 
  services, 
  onCreateRequest,
  isLoading = false,
  hasError = false,
  onNotify,
  onRefresh
}) => {
  const user = getTelegramUser();
  
  // UI State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>(ServiceCategory.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'new'>('popular');
  const [showFilters, setShowFilters] = useState(true);
  const lastScrollY = useRef(0);
  
  // Order Sheet State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [requestedServices, setRequestedServices] = useState<string[]>([]);

  // Load requested services from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('requested_services');
    if (saved) setRequestedServices(JSON.parse(saved));
  }, []);

  // === SCROLL HANDLER - Hide filters on scroll down ===
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY.current;
      
      if (currentY < 50) {
        setShowFilters(true);
      } else if (isScrollingDown && currentY > 100) {
        setShowFilters(false);
      } else if (!isScrollingDown) {
        setShowFilters(true);
      }
      
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Notify helper
  const notify = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (onNotify) {
      onNotify(msg, type);
    }
  }, [onNotify]);

  // Handlers
  const handleOrder = (service: Service) => {
    // Нельзя заказать свою услугу
    if (service.freelancerId === user.id) {
      triggerHaptic('error');
      notify('Это ваша собственная услуга', 'error');
      return;
    }
    
    // Проверяем не заказывали ли уже
    if (requestedServices.includes(service.id)) {
      triggerHaptic('error');
      notify('Вы уже отправляли заявку на эту услугу', 'error');
      return;
    }
    
    triggerHaptic('medium');
    setSelectedService(service);
    setMessage('');
  };

  const handleShareService = (service: Service) => {
    const link = buildReferralLink({ type: 'service', targetId: service.id, referrerId: user.id });
    const text = `🔥 ${service.title}\n💰 ${service.price.toLocaleString()} ₽ • ${service.deliveryDays} дн.\nИсполнитель: ${service.freelancerName}`;
    shareContent(text, link);
    triggerHaptic('selection');
  };

  const handleSubmit = async () => {
    if (!selectedService || message.length < 10) {
      notify('Напишите подробнее (минимум 10 символов)', 'error');
      return;
    }
    
    setIsSending(true);
    triggerHaptic('light');
    
    try {
      const success = await onCreateRequest(selectedService.id, message);
      
      if (success) {
        triggerHaptic('success');
        
        // Сохраняем что уже заказывали
        const newRequested = [...requestedServices, selectedService.id];
        setRequestedServices(newRequested);
        localStorage.setItem('requested_services', JSON.stringify(newRequested));
        
        setSelectedService(null);
        setMessage('');
      } else {
        notify('Ошибка отправки заявки', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Ошибка отправки', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handlePullRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Filtering & Sorting with debounced search
  const filteredServices = useMemo(() => {
    return services
      .filter(service => {
        // Не показываем свои услуги
        if (service.freelancerId === user.id) return false;
        
        // Категория
        if (activeCategory !== ServiceCategory.ALL && service.category !== activeCategory) {
          return false;
        }
        
        // Поиск
        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          const matchesTitle = service.title.toLowerCase().includes(query);
          const matchesDesc = service.description.toLowerCase().includes(query);
          if (!matchesTitle && !matchesDesc) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Boosted услуги всегда первые
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        
        switch (sortBy) {
          case 'popular':
            return (b.ordersCount || 0) - (a.ordersCount || 0);
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'new':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
  }, [services, activeCategory, debouncedSearch, sortBy, user.id]);

  // Подсчёт по категориям
  const categoryCounts = useMemo(() => {
    const counts: Record<ServiceCategory, number> = {
      [ServiceCategory.ALL]: 0,
      [ServiceCategory.DEVELOPMENT]: 0,
      [ServiceCategory.DESIGN]: 0,
      [ServiceCategory.MARKETING]: 0,
      [ServiceCategory.COPYWRITING]: 0,
      [ServiceCategory.OTHER]: 0,
    };
    
    services.filter(s => s.freelancerId !== user.id).forEach(service => {
      counts[ServiceCategory.ALL]++;
      if (service.category in counts) {
        counts[service.category as ServiceCategory]++;
      }
    });
    
    return counts;
  }, [services, user.id]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <div className="min-h-screen bg-slate-900 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Услуги</h1>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setViewMode('list');
                  }}
                  className={`p-1.5 rounded transition-colors active:scale-95 ${
                    viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setViewMode('grid');
                  }}
                  className={`p-1.5 rounded transition-colors active:scale-95 ${
                    viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Filters */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showFilters ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Search */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500" />
              </div>
              <input 
                type="text" 
                placeholder="Поиск услуг..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl 
                          text-sm text-white placeholder-slate-500 
                          focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Categories with counts */}
            <div className="relative scroll-gradient-right">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide hide-scrollbar">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const cat = key as ServiceCategory;
                  const isActive = activeCategory === cat;
                  const count = categoryCounts[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        triggerHaptic('selection');
                        setActiveCategory(cat);
                      }}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all active:scale-95 ${
                        isActive 
                          ? 'bg-white text-slate-900 border-white' 
                          : config.colorClass
                      }`}
                    >
                      {config.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-slate-900/20' : 'bg-white/10'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 text-xs pt-1">
              <SlidersHorizontal size={14} className="text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 
                          text-slate-300 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="popular">По популярности</option>
                <option value="new">Сначала новые</option>
                <option value="price_asc">Сначала дешёвые</option>
                <option value="price_desc">Сначала дорогие</option>
              </select>
              <span className="text-slate-500 ml-auto">
                {filteredServices.length} услуг
              </span>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="p-4">
          {hasError ? (
            <EmptyState 
              type="error" 
              errorMessage="Не удалось загрузить услуги"
              onRetry={onRefresh}
            />
          ) : isLoading ? (
            viewMode === 'list' 
              ? <ServiceListSkeleton count={3} />
              : <ServiceGridSkeleton count={4} />
          ) : filteredServices.length === 0 ? (
            <EmptyState 
              type={debouncedSearch ? 'no-results' : 'no-services'} 
              searchQuery={debouncedSearch}
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredServices.map((service, index) => (
                <div key={service.id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}>
                  <ServiceCard
                    service={service}
                    onOrder={handleOrder}
                    onShare={handleShareService}
                    isRequested={requestedServices.includes(service.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredServices.map((service, index) => (
                <div key={service.id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}>
                  <ServiceCardCompact
                    service={service}
                    onOrder={handleOrder}
                    onShare={handleShareService}
                    isRequested={requestedServices.includes(service.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order BottomSheet */}
        <BottomSheet
          isOpen={!!selectedService}
          onClose={() => {
            setSelectedService(null);
            setMessage('');
          }}
          title="Заказать услугу"
        >
          {selectedService && (
            <div className="p-5 space-y-4">
              {/* Service Preview */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-xs text-slate-500 mb-1">Вы заказываете:</div>
                <div className="font-medium text-white text-sm line-clamp-2">
                  {selectedService.title}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 
                                  flex items-center justify-center text-white font-bold text-[10px]">
                      {selectedService.freelancerName[0]}
                    </div>
                    <span className="text-xs text-slate-400">
                      {selectedService.freelancerName}
                    </span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    {selectedService.price.toLocaleString()} ₽
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <MessageSquare size={12} className="inline mr-1" />
                  Опишите задачу
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Расскажите подробнее что вам нужно, укажите сроки и особые требования..."
                  rows={4}
                  autoFocus
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl 
                            text-white placeholder-slate-500 resize-none 
                            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {message.length < 10 
                      ? `Ещё ${10 - message.length} символов` 
                      : '✓ Готово'}
                  </span>
                  <span className={`text-xs ${message.length > 450 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {message.length}/500
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="text-xs text-blue-400 font-medium mb-1">
                  💡 Что будет дальше?
                </div>
                <div className="text-xs text-slate-400">
                  Исполнитель получит вашу заявку и свяжется с вами в Telegram для обсуждения деталей.
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSending || message.length < 10}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl 
                          flex items-center justify-center gap-2 
                          disabled:opacity-50 disabled:cursor-not-allowed 
                          hover:bg-blue-500 active:scale-[0.98] transition-all"
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Отправить заявку
                  </>
                )}
              </button>

              <div className="h-4" />
            </div>
          )}
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
};

export default ServicesPage;
