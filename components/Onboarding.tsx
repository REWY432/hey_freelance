import React, { useState, useEffect } from 'react';
import { triggerHaptic, openTelegramChat } from '../services/telegram';
import { JobCategory } from '../types';
import { CATEGORY_LABELS, ONBOARDING_VERSION } from '../constants';
import { 
  Briefcase, Package, Bell, UserCircle, ChevronRight, 
  Sparkles, Shield, Zap, Check, Gift, Share2, Copy, Tag
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (data?: { interests?: JobCategory[]; shared?: boolean }) => void;
  userName: string;
  referralLink?: string;
  onShareReferral?: () => void;
  defaultInterests?: JobCategory[];
}

// Шаги онбординга
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать',
    subtitle: 'Эй, биржа — платформа для фрилансеров',
    icon: Sparkles,
    color: 'from-blue-500 to-purple-600',
    features: [
      { icon: Briefcase, text: 'Находите заказы от реальных клиентов' },
      { icon: Package, text: 'Предлагайте свои услуги' },
      { icon: Shield, text: 'Безопасные сделки через бота' },
    ]
  },
  {
    id: 'jobs',
    title: 'Заказы',
    subtitle: 'Найдите работу по душе',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-500',
    features: [
      { icon: Check, text: 'Просматривайте актуальные заказы' },
      { icon: Check, text: 'Откликайтесь на интересные задачи' },
      { icon: Check, text: 'Общайтесь с заказчиками в Telegram' },
    ]
  },
  {
    id: 'services',
    title: 'Услуги',
    subtitle: 'Предложите свои навыки',
    icon: Package,
    color: 'from-emerald-500 to-teal-500',
    features: [
      { icon: Check, text: 'Создайте карточку услуги' },
      { icon: Check, text: 'Укажите цену и сроки' },
      { icon: Check, text: 'Получайте заявки от клиентов' },
    ]
  },
  {
    id: 'growth',
    title: 'Реф-бонусы и интересы',
    subtitle: 'Получайте бонусы и персональную ленту',
    icon: Gift,
    color: 'from-emerald-500 to-blue-500',
    features: [
      { icon: Check, text: 'Поделитесь ссылкой — получите бонус' },
      { icon: Check, text: 'Отметьте интересные категории' },
      { icon: Check, text: 'Настроим ленту под ваши цели' },
    ]
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    subtitle: 'Не пропустите важное',
    icon: Bell,
    color: 'from-orange-500 to-rose-500',
    features: [
      { icon: Zap, text: 'Мгновенные уведомления о новых откликах' },
      { icon: Zap, text: 'Оповещения о статусе модерации' },
      { icon: Zap, text: 'Новые заявки на ваши услуги' },
    ],
    action: {
      text: 'Подключить бота',
      handler: () => openTelegramChat('telelance_notify_bot', '/start')
    }
  },
  {
    id: 'profile',
    title: 'Ваш профиль',
    subtitle: 'Расскажите о себе',
    icon: UserCircle,
    color: 'from-purple-500 to-pink-500',
    features: [
      { icon: Check, text: 'Заполните информацию о себе' },
      { icon: Check, text: 'Добавьте навыки и портфолио' },
      { icon: Check, text: 'Управляйте заказами и услугами' },
    ]
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ 
  onComplete, 
  userName,
  referralLink,
  onShareReferral,
  defaultInterests = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<JobCategory[]>(defaultInterests);
  const [hasShared, setHasShared] = useState(false);
  
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const StepIcon = step.icon;
  const isGrowthStep = step.id === 'growth';

  useEffect(() => {
    // prefill interests from localStorage if not provided
    if (defaultInterests.length) return;
    try {
      const stored = localStorage.getItem('onboarding_interests');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedInterests(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, [defaultInterests]);

  const toggleInterest = (interest: JobCategory) => {
    triggerHaptic('selection');
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      }
      if (prev.length >= 3) {
        // Keep max 3 interests to stay concise
        return [...prev.slice(1), interest];
      }
      return [...prev, interest];
    });
  };

  const handleNext = () => {
    triggerHaptic('light');
    
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    triggerHaptic('light');
    handleComplete();
  };

  const handleComplete = () => {
    setIsExiting(true);
    triggerHaptic('success');
    
    // Сохраняем что онбординг пройден
    const payload = {
      completed: true,
      completedAt: new Date().toISOString(),
      version: ONBOARDING_VERSION,
      interests: selectedInterests
    };
    localStorage.setItem('onboarding_completed', JSON.stringify(payload));
    localStorage.setItem('onboarding_interests', JSON.stringify(selectedInterests));
    
    setTimeout(() => {
      onComplete({ interests: selectedInterests, shared: hasShared });
    }, 300);
  };

  const handleDotClick = (index: number) => {
    if (index <= currentStep) {
      triggerHaptic('selection');
      setCurrentStep(index);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-slate-900 flex flex-col transition-opacity duration-300 ${
      isExiting ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Skip Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Icon */}
        <div 
          key={currentStep}
          className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.color} 
                      flex items-center justify-center mb-6 shadow-2xl
                      animate-in zoom-in-50 duration-500`}
        >
          <StepIcon size={48} className="text-white" />
        </div>

        {/* Title */}
        <h1 
          key={`title-${currentStep}`}
          className="text-2xl font-black text-white text-center mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {currentStep === 0 ? `${step.title}, ${userName}!` : step.title}
        </h1>
        
        <p 
          key={`subtitle-${currentStep}`}
          className="text-slate-400 text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {step.subtitle}
        </p>

        {/* Features */}
        {isGrowthStep ? (
          <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Tag size={16} className="text-emerald-400" />
                  Выберите интересы (до 3)
                </div>
                <span className="text-xs text-slate-500">{selectedInterests.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as JobCategory[])
                  .filter((cat) => cat !== JobCategory.ALL)
                  .map((cat) => {
                    const active = selectedInterests.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleInterest(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Gift size={18} className="text-amber-300" />
                Реферальный бонус
              </div>
              <p className="text-sm text-slate-300">
                Поделитесь ссылкой — за каждый переход начислим бонус. 1 бонус = подсветка заказа
                или «подъём» услуги.
              </p>

              {referralLink ? (
                <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700 rounded-xl p-3">
                  <div className="flex-1 text-xs text-slate-200 truncate">{referralLink}</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      triggerHaptic('selection');
                    }}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setHasShared(true);
                      onShareReferral?.();
                    }}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setHasShared(true);
                    onShareReferral?.();
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all"
                >
                  <Share2 size={16} />
                  Поделиться приглашением
                </button>
              )}

              {hasShared && (
                <div className="text-xs text-emerald-400">
                  ✔️ Супер! Ссылка отправлена. Бонусы появятся в шапке приложения.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div 
            key={`features-${currentStep}`}
            className="w-full max-w-sm space-y-3"
          >
            {step.features?.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50
                            animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} 
                                flex items-center justify-center`}>
                    <FeatureIcon size={20} className="text-white" />
                  </div>
                  <span className="text-sm text-slate-300">{feature.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Optional Action Button */}
        {'action' in step && step.action && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              step.action?.handler();
            }}
            className="mt-6 px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl
                      text-sm font-medium text-white hover:bg-slate-700 transition-all
                      flex items-center gap-2"
          >
            <Bell size={18} />
            {step.action.text}
          </button>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 pb-8 space-y-4">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
          {ONBOARDING_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-white' 
                  : index < currentStep 
                    ? 'w-2 bg-white/50 hover:bg-white/70' 
                    : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2
                    bg-gradient-to-r ${step.color} shadow-lg transition-all active:scale-[0.98]`}
        >
          {isLastStep ? (
            <>
              <Check size={20} />
              Начать работу
            </>
          ) : (
            <>
              Далее
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
