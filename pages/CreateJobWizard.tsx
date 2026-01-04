import React, { useState, useEffect, useRef } from 'react';
import { getTelegramUser, triggerHaptic, setCloudData, getCloudData, openTelegramChat } from '../services/telegram';
import { api } from '../services/supabase';
import { Job, JobCategory } from '../types';
import { CATEGORY_LABELS, PROMOTION_PRICES, PAYMENT_DETAILS, ADMIN_USERNAME, DONATE_STREAM } from '../constants';
import { 
  AlertCircle, Star, Pin, Zap, Flame, Check, Copy, CreditCard, Send, 
  ChevronRight, ChevronLeft, Sparkles, FileText, Wallet, Rocket,
  CheckCircle2, Circle, Loader2
} from 'lucide-react';

interface CreateJobWizardProps {
  onJobCreated: (job: Job) => void;
  onCancel: () => void;
  referralBonus?: number;
  onUseReferralBonus?: () => boolean | void;
}

// Step Configuration
const STEPS = [
  { id: 1, title: 'Основное', subtitle: 'Название и категория', icon: FileText },
  { id: 2, title: 'Детали', subtitle: 'Опишите задачу', icon: Sparkles },
  { id: 3, title: 'Бюджет', subtitle: 'Оплата и продвижение', icon: Wallet },
];

const CreateJobWizard: React.FC<CreateJobWizardProps> = ({ onJobCreated, onCancel, referralBonus = 0, onUseReferralBonus }) => {
  const user = getTelegramUser();
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category: JobCategory.OTHER
  });

  // Promotions
  const [promotions, setPromotions] = useState({
    pin: false,
    highlight: false,
    urgent: false
  });
  const [bonusApplied, setBonusApplied] = useState(false);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdJobData, setCreatedJobData] = useState<{id: string, title: string, price: number} | null>(null);

  // Calculate Total Price
  const highlightIsFree = promotions.highlight && referralBonus > 0;
  const totalPrice = 
    (promotions.pin ? PROMOTION_PRICES.PIN : 0) +
    (promotions.highlight ? (highlightIsFree ? 0 : PROMOTION_PRICES.HIGHLIGHT) : 0) +
    (promotions.urgent ? PROMOTION_PRICES.URGENT : 0);

  // Load draft on mount
  useEffect(() => {
    getCloudData('job_draft_v3').then(data => {
      if (data) {
        if (data.formData) setFormData(data.formData);
        if (data.promotions) setPromotions(data.promotions);
        if (data.currentStep) setCurrentStep(data.currentStep);
      }
    });
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCloudData('job_draft_v3', { formData, promotions, currentStep });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [formData, promotions, currentStep]);

  // Telegram Buttons
  useEffect(() => {
    if (showPaymentModal) {
      window.Telegram?.WebApp?.MainButton.hide();
      return;
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Back Button
    tg.BackButton.show();
    const handleBack = () => {
      if (currentStep > 1) {
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
      buttonText = totalPrice > 0 
        ? `СОЗДАТЬ ЗАКАЗ • ${totalPrice}₽` 
        : 'ОПУБЛИКОВАТЬ БЕСПЛАТНО';
      buttonColor = totalPrice > 0 ? '#10b981' : '#2563eb';
    } else {
      buttonText = 'ПРОДОЛЖИТЬ';
    }

    tg.MainButton.setParams({
      text: isSubmitting ? 'СОЗДАНИЕ...' : buttonText,
      color: buttonColor,
      text_color: '#ffffff',
      is_visible: true,
      is_active: stepValid && !isSubmitting
    });

    const handleMain = () => {
      triggerHaptic('medium');
      if (isLastStep) {
        submitForm();
      } else {
        goToNextStep();
      }
    };
    tg.MainButton.onClick(handleMain);

    return () => {
      tg.MainButton.offClick(handleMain);
      tg.BackButton.offClick(handleBack);
    };
  }, [currentStep, formData, promotions, isSubmitting, showPaymentModal, totalPrice]);

  // Validation
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'title':
        if (value.length < 5) return 'Минимум 5 символов';
        if (value.length > 100) return 'Максимум 100 символов';
        return '';
      case 'description':
        if (value.length < 20) return 'Минимум 20 символов';
        if (value.length > 2000) return 'Максимум 2000 символов';
        return '';
      case 'budget':
        // Budget is optional, but if provided should be reasonable
        return '';
      default:
        return '';
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.title.length >= 5;
      case 2:
        return formData.description.length >= 20;
      case 3:
        return true; // Budget is optional
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
      triggerHaptic('light');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
      triggerHaptic('light');
    }
  };

  useEffect(() => {
    if (promotions.highlight && referralBonus > 0) {
      setBonusApplied(true);
    } else if (!promotions.highlight) {
      setBonusApplied(false);
    }
  }, [promotions.highlight, referralBonus]);

  const goToStep = (step: number) => {
    // Only allow going to completed steps or current+1
    if (step <= currentStep) {
      setDirection(step < currentStep ? 'backward' : 'forward');
      setCurrentStep(step);
      triggerHaptic('selection');
    }
  };

  // Submit
  const submitForm = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    window.Telegram?.WebApp?.MainButton.showProgress(false);

    try {
      let formattedBudget = formData.budget.trim();
      if (/^[\d\s]+$/.test(formattedBudget)) {
        formattedBudget = Number(formattedBudget.replace(/\s/g, '')).toLocaleString('ru-RU') + ' ₽';
      }

      const newJob = await api.createJob({
        authorId: user.id,
        title: formData.title,
        description: formData.description,
        budget: formattedBudget || 'Договорная',
        category: formData.category as JobCategory,
        isPinned: promotions.pin,
        isHighlighted: promotions.highlight,
        isUrgent: promotions.urgent
      });

      // Clear draft
      setCloudData('job_draft_v3', null);

      if (highlightIsFree) {
        onUseReferralBonus?.();
      }

      if (totalPrice > 0) {
        setCreatedJobData({
          id: newJob.id,
          title: newJob.title,
          price: totalPrice
        });
        setShowPaymentModal(true);
      } else {
        triggerHaptic('success');
        onJobCreated(newJob);
      }
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
      setErrors({ submit: 'Ошибка при создании заказа' });
    } finally {
      setIsSubmitting(false);
      window.Telegram?.WebApp?.MainButton.hideProgress();
    }
  };

  // Helpers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('selection');
  };

  const handleContactAdmin = () => {
    if (!createdJobData) return;
    
    const text = `👋 Привет! Я оплатил заказ #${createdJobData.id} "${createdJobData.title}".\nСумма: ${createdJobData.price}₽.\n\n(Прикрепите скриншот перевода)`;
    openTelegramChat(ADMIN_USERNAME, text);
    onJobCreated({ ...createdJobData, status: 'PENDING' } as any);
  };

  // Styles
  const inputClass = "w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";

  // Budget Suggestions
  const budgetSuggestions = ['5 000', '15 000', '30 000', '50 000', 'Договорная'];

  // --- RENDER PAYMENT MODAL ---
  if (showPaymentModal && createdJobData) {
    // Формируем флаги промо для message
    const promoFlags = [
      promotions.pin && 'PIN',
      promotions.highlight && 'HL',
      promotions.urgent && 'URG'
    ].filter(Boolean).join(',');
    
    const donateStreamUrl = DONATE_STREAM.buildPaymentUrl(
      createdJobData.price,
      createdJobData.id,
      promoFlags
    );

    // Открыть ссылку и закрыть модал
    const handlePayViaStream = () => {
      triggerHaptic('medium');
      window.open(donateStreamUrl, '_blank');
      // Закрываем и возвращаем на главную — заказ в статусе PENDING
      onJobCreated({ ...createdJobData, status: 'PENDING' } as any);
    };

    // Если donate.stream отключен — fallback на старую оплату картой
    if (!DONATE_STREAM.enabled) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 bg-emerald-500/30 rounded-full flex items-center justify-center animate-pulse">
                  <CreditCard className="text-emerald-400" size={28} />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Оплата</h2>
              <p className="text-slate-400 text-sm mb-6">
                Заказ <span className="text-white font-mono">#{createdJobData.id}</span> создан
              </p>

              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 mb-6 border border-emerald-500/20">
                <div className="text-emerald-400/70 text-xs uppercase tracking-widest mb-1">К оплате</div>
                <div className="text-4xl font-black text-white">{createdJobData.price} ₽</div>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">
                    Карта ({PAYMENT_DETAILS.bank})
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-900 p-3.5 rounded-xl text-white font-mono text-sm border border-slate-700 tracking-wider">
                      {PAYMENT_DETAILS.card}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(PAYMENT_DETAILS.card)}
                      className="px-4 bg-slate-700 rounded-xl text-white hover:bg-slate-600 active:scale-95 transition-all"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 text-center pt-2">
                  После перевода отправьте чек администратору
                </p>
              </div>
            </div>

            <button 
              onClick={handleContactAdmin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 flex items-center justify-center gap-2 transition-colors active:bg-emerald-700"
            >
              <Send size={18} />
              ОТПРАВИТЬ ЧЕК
            </button>
          </div>
        </div>
      );
    }

    // ✅ DONATE.STREAM — основной способ
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
        <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 text-center">
            {/* Иконка */}
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center">
                <Wallet className="text-purple-400" size={28} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1">Оплата</h2>
            <p className="text-slate-500 text-xs mb-4">через donate.stream</p>
            
            <p className="text-slate-400 text-sm mb-6">
              Заказ <span className="text-white font-mono bg-slate-700/50 px-2 py-0.5 rounded">#{createdJobData.id}</span>
            </p>

            {/* Сумма */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl p-5 mb-5 border border-purple-500/20">
              <div className="text-purple-400/70 text-xs uppercase tracking-widest mb-1">К оплате</div>
              <div className="text-4xl font-black text-white">{createdJobData.price} ₽</div>
            </div>

            {/* Способы оплаты */}
            <div className="flex justify-center items-center gap-4 mb-5 text-slate-500">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <span className="text-[10px]">Карта</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs font-bold">
                  Ю
                </div>
                <span className="text-[10px]">ЮMoney</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs font-bold">
                  Q
                </div>
                <span className="text-[10px]">QIWI</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs font-bold">
                  P
                </div>
                <span className="text-[10px]">PayPal</span>
              </div>
            </div>

            {/* Промо-флаги что оплачивается */}
            {promoFlags && (
              <div className="flex justify-center gap-2 mb-4 flex-wrap">
                {promotions.pin && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                    <Pin size={12} /> Закреп
                  </span>
                )}
                {promotions.highlight && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                    <Zap size={12} /> Выделение
                  </span>
                )}
                {promotions.urgent && (
                  <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-full flex items-center gap-1">
                    <Flame size={12} /> Срочно
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 px-4">
              💡 ID заказа будет указан в сообщении автоматически — не меняйте его
            </p>
          </div>

          {/* Кнопка оплаты */}
          <button 
            onClick={handlePayViaStream}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Rocket size={18} />
            ПЕРЕЙТИ К ОПЛАТЕ
          </button>

          {/* Альтернатива — оплата напрямую */}
          <button 
            onClick={handleContactAdmin}
            className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-400 text-sm py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Send size={14} />
            Или оплатить напрямую админу
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER WIZARD ---
  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Новый заказ</h1>
            <p className="text-xs text-slate-500">Шаг {currentStep} из {STEPS.length}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <Rocket size={14} className="text-blue-400" />
            <span className="text-xs text-slate-300 font-medium">
              {Math.round((currentStep / STEPS.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const StepIcon = step.icon;
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                    isCurrent 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : isCompleted 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-slate-800 border border-slate-700 opacity-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCurrent 
                      ? 'bg-blue-500 text-white' 
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
                  <span className={`text-xs font-medium hidden sm:block ${
                    isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {step.title}
                  </span>
                </button>
                
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-colors ${
                    currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-5 pt-6">
        <div 
          key={currentStep}
          className={`animate-in duration-300 ${
            direction === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
          } fade-in`}
        >
          {/* Step 1: Title & Category */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Что нужно сделать?</h2>
                    <p className="text-xs text-slate-400">Опишите задачу кратко и понятно</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Название задачи *</label>
                <input
                  type="text"
                  placeholder="напр. Разработка Telegram бота для магазина"
                  className={`${inputClass} ${errors.title ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    setErrors(prev => ({ ...prev, title: validateField('title', e.target.value) }));
                  }}
                  maxLength={100}
                />
                <div className="flex justify-between mt-2">
                  {errors.title ? (
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.title}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Понятное название привлечёт больше исполнителей</p>
                  )}
                  <span className={`text-xs ${formData.title.length > 90 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {formData.title.length}/100
                  </span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Категория</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as JobCategory[])
                    .filter(c => c !== JobCategory.ALL)
                    .map((cat) => {
                      const isActive = formData.category === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            triggerHaptic('selection');
                            setFormData(prev => ({ ...prev, category: cat }));
                          }}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                            isActive
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
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
            </div>
          )}

          {/* Step 2: Description */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Детали задачи</h2>
                    <p className="text-xs text-slate-400">Чем подробнее — тем точнее отклики</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Описание *</label>
                <textarea
                  rows={8}
                  placeholder="Опишите задачу подробно:&#10;• Что нужно сделать?&#10;• Какой результат ожидаете?&#10;• Есть ли дедлайн?&#10;• Какие материалы предоставите?"
                  className={`${inputClass} resize-none ${errors.description ? 'border-rose-500' : ''}`}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setErrors(prev => ({ ...prev, description: validateField('description', e.target.value) }));
                  }}
                  maxLength={2000}
                />
                <div className="flex justify-between mt-2">
                  {errors.description ? (
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {formData.description.length < 20 
                        ? `Ещё ${20 - formData.description.length} символов` 
                        : 'Отлично! Можно продолжить'}
                    </p>
                  )}
                  <span className={`text-xs ${formData.description.length > 1900 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {formData.description.length}/2000
                  </span>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">💡 Советы</h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Укажите технологии и инструменты, если они важны</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Приложите примеры или референсы, если есть</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Опишите формат сдачи работы</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Budget & Promotions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Бюджет и продвижение</h2>
                    <p className="text-xs text-slate-400">Укажите бюджет и выберите опции</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Бюджет</label>
                <input
                  type="text"
                  placeholder="напр. 15000"
                  className={inputClass}
                  value={formData.budget}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\s]/g, '');
                    setFormData(prev => ({ ...prev, budget: val }));
                  }}
                />
                
                {/* Budget Suggestions */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {budgetSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        triggerHaptic('selection');
                        setFormData(prev => ({ 
                          ...prev, 
                          budget: suggestion === 'Договорная' ? '' : suggestion.replace(/\s/g, '') 
                        }));
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                        (suggestion === 'Договорная' && !formData.budget) ||
                        formData.budget === suggestion.replace(/\s/g, '')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {suggestion === 'Договорная' ? suggestion : `${suggestion} ₽`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promotions */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="text-orange-400" size={18} />
                    <h3 className="text-sm font-bold text-white">Продвижение</h3>
                  </div>
                  {totalPrice > 0 && (
                    <div className="px-3 py-1 bg-emerald-500/20 rounded-full">
                      <span className="text-xs font-bold text-emerald-400">+{totalPrice} ₽</span>
                    </div>
                  )}
                </div>

                {referralBonus > 0 && (
                  <div className="flex items-center gap-3 text-xs text-emerald-400 mb-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Sparkles size={14} />
                      Доступно реф-бонусов: {referralBonus}. Можно потратить на бесплатную подсветку.
                    </span>
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        setPromotions(p => ({ ...p, highlight: true }));
                        setBonusApplied(true);
                      }}
                      className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all"
                    >
                      Использовать бонус
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Pin */}
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setPromotions(p => ({ ...p, pin: !p.pin }));
                    }}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                      promotions.pin
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        promotions.pin ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        <Pin size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white text-sm">Закрепить в топе</div>
                        <div className="text-xs text-slate-400">24 часа в начале ленты</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{PROMOTION_PRICES.PIN} ₽</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        promotions.pin ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                      }`}>
                        {promotions.pin && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  </button>

                  {/* Highlight */}
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setPromotions(p => ({ ...p, highlight: !p.highlight }));
                    }}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                      promotions.highlight
                        ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        promotions.highlight ? 'bg-yellow-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        <Zap size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white text-sm">Выделить цветом</div>
                        <div className="text-xs text-slate-400">Яркая рамка и свечение</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {highlightIsFree ? '0 ₽ (реф-бонус)' : `${PROMOTION_PRICES.HIGHLIGHT} ₽`}
                      </span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        promotions.highlight ? 'bg-yellow-500 border-yellow-500' : 'border-slate-600'
                      }`}>
                        {promotions.highlight && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  </button>

                  {/* Urgent */}
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setPromotions(p => ({ ...p, urgent: !p.urgent }));
                    }}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                      promotions.urgent
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        promotions.urgent ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        <Flame size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white text-sm">Метка «Срочно»</div>
                        <div className="text-xs text-slate-400">Анимированный бейдж</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{PROMOTION_PRICES.URGENT} ₽</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        promotions.urgent ? 'bg-rose-500 border-rose-500' : 'border-slate-600'
                      }`}>
                        {promotions.urgent && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  </button>
                </div>

                {bonusApplied && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 mt-3">
                    <Sparkles size={14} />
                    Реф-бонус покроет подсветку заказа при публикации.
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Итого</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Публикация заказа</span>
                    <span className="text-emerald-400 font-medium">Бесплатно</span>
                  </div>
                  {promotions.pin && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Закрепление</span>
                      <span className="text-white">{PROMOTION_PRICES.PIN} ₽</span>
                    </div>
                  )}
                  {promotions.highlight && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Выделение</span>
                      <span className="text-white">
                        {highlightIsFree ? '0 ₽ (реф.)' : `${PROMOTION_PRICES.HIGHLIGHT} ₽`}
                      </span>
                    </div>
                  )}
                  {promotions.urgent && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Метка «Срочно»</span>
                      <span className="text-white">{PROMOTION_PRICES.URGENT} ₽</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between">
                    <span className="font-bold text-white">К оплате</span>
                    <span className="font-bold text-lg text-white">
                      {totalPrice > 0 ? `${totalPrice} ₽` : 'Бесплатно'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-rose-400 flex-shrink-0" size={20} />
            <p className="text-sm text-rose-400">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateJobWizard;
