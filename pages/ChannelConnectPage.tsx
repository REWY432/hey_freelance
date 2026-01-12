import React, { useState, useEffect } from 'react';
import { getTelegramUser, triggerHaptic, BOT_USERNAME } from '../services/telegram';
import { api } from '../services/supabase';
import { Channel, JobCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { 
  Check, AlertCircle, Loader2, Radio, Users, Hash, 
  ChevronRight, Sparkles, Shield, Settings, CheckCircle2,
  AtSign, Filter, DollarSign
} from 'lucide-react';

interface ChannelConnectPageProps {
  onChannelConnected: (channel: Channel) => void;
  onCancel: () => void;
  existingChannel?: Channel; // Для редактирования фильтров
}

// Step Configuration
const STEPS = [
  { id: 1, title: 'Инструкция', subtitle: 'Добавьте бота', icon: Shield },
  { id: 2, title: 'Канал', subtitle: 'Введите @username', icon: AtSign },
  { id: 3, title: 'Проверка', subtitle: 'Верификация', icon: CheckCircle2 },
  { id: 4, title: 'Фильтры', subtitle: 'Настройте заказы', icon: Filter },
];

const ChannelConnectPage: React.FC<ChannelConnectPageProps> = ({ 
  onChannelConnected, 
  onCancel,
  existingChannel 
}) => {
  const user = getTelegramUser();
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(existingChannel ? 4 : 1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Form Data
  const [channelUsername, setChannelUsername] = useState(existingChannel?.channelUsername || '');
  const [verifiedChannel, setVerifiedChannel] = useState<{
    id: number;
    title: string;
    username: string;
    subscribersCount: number;
  } | null>(existingChannel ? {
    id: existingChannel.channelId,
    title: existingChannel.channelTitle,
    username: existingChannel.channelUsername || '',
    subscribersCount: existingChannel.subscribersCount
  } : null);
  
  // Filters
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>(
    existingChannel?.categories || []
  );
  const [minBudget, setMinBudget] = useState<string>(
    existingChannel?.minBudget?.toString() || ''
  );
  
  // Errors
  const [error, setError] = useState<string | null>(null);

  // Telegram Buttons
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Back Button
    tg.BackButton.show();
    const handleBack = () => {
      if (currentStep > 1 && !existingChannel) {
        goToPreviousStep();
      } else {
        onCancel();
      }
    };
    tg.BackButton.onClick(handleBack);

    // Main Button
    const isLastStep = currentStep === STEPS.length;
    const stepValid = validateCurrentStep();
    
    let buttonText = '';
    let buttonColor = '#2563eb';
    
    if (isLastStep) {
      buttonText = existingChannel ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'ПОДКЛЮЧИТЬ КАНАЛ';
      buttonColor = '#10b981';
    } else if (currentStep === 3) {
      buttonText = isVerifying ? 'ПРОВЕРКА...' : 'ПРОВЕРИТЬ';
      buttonColor = '#8b5cf6';
    } else {
      buttonText = 'ПРОДОЛЖИТЬ';
    }

    tg.MainButton.setParams({
      text: isSubmitting ? 'СОХРАНЕНИЕ...' : buttonText,
      color: buttonColor,
      text_color: '#ffffff',
      is_visible: true,
      is_active: stepValid && !isSubmitting && !isVerifying
    });

    const handleMain = () => {
      triggerHaptic('medium');
      if (isLastStep) {
        submitForm();
      } else if (currentStep === 3) {
        verifyChannel();
      } else {
        goToNextStep();
      }
    };
    tg.MainButton.onClick(handleMain);

    return () => {
      tg.MainButton.offClick(handleMain);
      tg.BackButton.offClick(handleBack);
    };
  }, [currentStep, channelUsername, verifiedChannel, selectedCategories, minBudget, isSubmitting, isVerifying, existingChannel]);

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return channelUsername.length >= 3;
      case 3:
        return verifiedChannel !== null;
      case 4:
        return true; // Filters are optional
      default:
        return false;
    }
  };

  // Navigation
  const goToNextStep = () => {
    if (!validateCurrentStep()) {
      triggerHaptic('error');
      return;
    }
    
    if (currentStep < STEPS.length) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
      setError(null);
      triggerHaptic('light');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
      setError(null);
      triggerHaptic('light');
    }
  };

  // Verify Channel (mock for now - in production this would call a backend)
  const verifyChannel = async () => {
    if (!channelUsername) return;
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Clean up username
      let username = channelUsername.trim();
      if (username.startsWith('@')) {
        username = username.substring(1);
      }
      if (username.startsWith('https://t.me/')) {
        username = username.replace('https://t.me/', '');
      }
      if (username.startsWith('t.me/')) {
        username = username.replace('t.me/', '');
      }

      // Check if channel already exists in DB
      // For now, we'll simulate verification since we can't call Telegram API from client
      // In production, this would be an Edge Function that calls Telegram Bot API
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mock successful verification
      // In production: const result = await api.verifyChannelBot(username);
      const mockChannelId = Math.floor(Math.random() * -1000000000); // Telegram channel IDs are negative
      
      setVerifiedChannel({
        id: mockChannelId,
        title: `@${username}`, // In production this would come from Telegram API
        username: username,
        subscribersCount: Math.floor(Math.random() * 50000) + 1000 // Mock
      });
      
      setChannelUsername(username);
      triggerHaptic('success');
      goToNextStep();
      
    } catch (e: any) {
      setError(e.message || 'Ошибка проверки канала');
      triggerHaptic('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit
  const submitForm = async () => {
    if (isSubmitting || !verifiedChannel) return;
    
    setIsSubmitting(true);
    window.Telegram?.WebApp?.MainButton.showProgress(false);

    try {
      const parsedBudget = minBudget ? parseInt(minBudget.replace(/\s/g, ''), 10) : 0;
      
      if (existingChannel) {
        // Update existing channel
        const success = await api.updateChannel(existingChannel.id, {
          categories: selectedCategories,
          minBudget: parsedBudget
        });
        
        if (success) {
          triggerHaptic('success');
          onChannelConnected({
            ...existingChannel,
            categories: selectedCategories,
            minBudget: parsedBudget
          });
        } else {
          throw new Error('Не удалось обновить настройки');
        }
      } else {
        // Create new channel
        const newChannel = await api.createChannel({
          channelId: verifiedChannel.id,
          channelUsername: verifiedChannel.username,
          channelTitle: verifiedChannel.title,
          ownerId: user.id,
          categories: selectedCategories,
          minBudget: parsedBudget,
          subscribersCount: verifiedChannel.subscribersCount
        });

        if (newChannel) {
          triggerHaptic('success');
          onChannelConnected(newChannel);
        } else {
          throw new Error('Канал уже подключён или произошла ошибка');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Ошибка при сохранении');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
      window.Telegram?.WebApp?.MainButton.hideProgress();
    }
  };

  // Toggle category
  const toggleCategory = (category: JobCategory) => {
    triggerHaptic('selection');
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  // Styles
  const inputClass = "w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {existingChannel ? 'Настройки канала' : 'Подключить канал'}
            </h1>
            <p className="text-xs text-slate-500">
              {existingChannel ? 'Изменить фильтры заказов' : `Шаг ${currentStep} из ${STEPS.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <Radio size={14} className="text-purple-400" />
            <span className="text-xs text-slate-300 font-medium">
              {Math.round((currentStep / STEPS.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        {!existingChannel && (
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                      isCurrent 
                        ? 'bg-purple-500/20 border border-purple-500/30' 
                        : isCompleted 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : 'bg-slate-800 border border-slate-700 opacity-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isCurrent 
                        ? 'bg-purple-500 text-white' 
                        : isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-700 text-slate-500'
                    }`}>
                      {isCompleted ? (
                        <Check size={14} />
                      ) : (
                        <span className="text-xs font-bold">{step.id}</span>
                      )}
                    </div>
                  </div>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-colors ${
                      currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-700'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="px-5 pt-6">
        <div 
          key={currentStep}
          className={`animate-in duration-300 ${
            direction === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
          } fade-in`}
        >
          {/* Step 1: Instructions */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Подключите свой канал</h2>
                    <p className="text-xs text-slate-400">Заказы будут публиковаться автоматически</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Откройте настройки канала</h4>
                      <p className="text-xs text-slate-400">
                        Перейдите в ваш Telegram-канал → Настройки → Администраторы
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Добавьте бота администратором</h4>
                      <p className="text-xs text-slate-400">
                        Найдите <span className="text-blue-400 font-mono">@{BOT_USERNAME}</span> и добавьте его
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Дайте права на публикацию</h4>
                      <p className="text-xs text-slate-400">
                        Включите разрешение "Публикация сообщений"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-6">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Sparkles size={16} />
                  <span className="font-medium">Готово? Нажмите "Продолжить"</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Enter Username */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <AtSign className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Введите @username канала</h2>
                    <p className="text-xs text-slate-400">Или вставьте ссылку t.me/...</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Username канала</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                  <input
                    type="text"
                    placeholder="your_channel"
                    className={`${inputClass} pl-9`}
                    value={channelUsername}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.startsWith('@')) val = val.substring(1);
                      setChannelUsername(val);
                      setError(null);
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 ml-1">
                  Например: @design_jobs или t.me/design_jobs
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    {isVerifying ? (
                      <Loader2 className="text-purple-400 animate-spin" size={20} />
                    ) : verifiedChannel ? (
                      <CheckCircle2 className="text-emerald-400" size={20} />
                    ) : (
                      <Shield className="text-purple-400" size={20} />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-white">
                      {isVerifying ? 'Проверяем...' : verifiedChannel ? 'Канал найден!' : 'Проверка канала'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {isVerifying ? 'Подождите несколько секунд' : 
                       verifiedChannel ? 'Бот добавлен как администратор' : 
                       'Нажмите "Проверить" для верификации'}
                    </p>
                  </div>
                </div>
              </div>

              {verifiedChannel && (
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Hash className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{verifiedChannel.title}</h3>
                      <p className="text-sm text-slate-400">@{verifiedChannel.username}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {verifiedChannel.subscribersCount.toLocaleString()} подписчиков
                    </span>
                  </div>
                </div>
              )}

              {!verifiedChannel && !isVerifying && (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">
                    Канал: <span className="text-white font-mono">@{channelUsername}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Мы проверим, что бот добавлен администратором
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Filters */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Filter className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Настройте фильтры</h2>
                    <p className="text-xs text-slate-400">Какие заказы публиковать в канале</p>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className={labelClass}>Категории заказов</label>
                <p className="text-xs text-slate-500 mb-3 ml-1">
                  Оставьте пустым для всех категорий
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as JobCategory[])
                    .filter(c => c !== JobCategory.ALL)
                    .map((cat) => {
                      const isActive = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                            isActive
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{CATEGORY_LABELS[cat]}</span>
                            {isActive && <Check size={16} />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Min Budget */}
              <div>
                <label className={labelClass}>Минимальный бюджет</label>
                <p className="text-xs text-slate-500 mb-3 ml-1">
                  Заказы с бюджетом ниже не будут публиковаться (0 = все)
                </p>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="0"
                    className={`${inputClass} pl-11`}
                    value={minBudget}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setMinBudget(val);
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Итого</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Категории</span>
                    <span className="text-white">
                      {selectedCategories.length === 0 
                        ? 'Все' 
                        : selectedCategories.map(c => CATEGORY_LABELS[c]).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Мин. бюджет</span>
                    <span className="text-white">
                      {minBudget && parseInt(minBudget) > 0 
                        ? `от ${parseInt(minBudget).toLocaleString()} ₽` 
                        : 'Любой'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-rose-400 flex-shrink-0" size={20} />
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelConnectPage;
