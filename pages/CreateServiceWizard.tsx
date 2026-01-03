import React, { useState, useEffect } from 'react';
import { getTelegramUser, triggerHaptic } from '../services/telegram';
import { Service, ServiceCategory } from '../types';
import { 
  FileText, Sparkles, Wallet, Check, AlertCircle, Plus, X,
  ChevronLeft, ChevronRight, Rocket, Clock
} from 'lucide-react';

// Категории
const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: ServiceCategory.DEVELOPMENT, label: 'Разработка' },
  { value: ServiceCategory.DESIGN, label: 'Дизайн' },
  { value: ServiceCategory.MARKETING, label: 'Маркетинг' },
  { value: ServiceCategory.COPYWRITING, label: 'Тексты' },
  { value: ServiceCategory.OTHER, label: 'Другое' }
];

// Шаги
const STEPS = [
  { id: 1, title: 'Название', subtitle: 'Опишите услугу', icon: FileText },
  { id: 2, title: 'Детали', subtitle: 'Подробности и фичи', icon: Sparkles },
  { id: 3, title: 'Цена', subtitle: 'Стоимость и сроки', icon: Wallet },
];

interface CreateServiceWizardProps {
  editingService?: Service | null;
  onServiceCreated: (service: Service) => void;
  onCancel: () => void;
  onSubmit: (data: Omit<Service, 'id' | 'createdAt' | 'freelancerName' | 'ordersCount' | 'status'>) => Promise<Service | null>;
}

const CreateServiceWizard: React.FC<CreateServiceWizardProps> = ({ 
  editingService,
  onServiceCreated, 
  onCancel,
  onSubmit 
}) => {
  const user = getTelegramUser();
  const isEditing = !!editingService;
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form Data - инициализируем из editingService если редактируем
  const [formData, setFormData] = useState({
    title: editingService?.title || '',
    description: editingService?.description || '',
    category: editingService?.category || ServiceCategory.OTHER,
    features: editingService?.features || [] as string[],
    price: editingService?.price?.toString() || '',
    deliveryDays: editingService?.deliveryDays || 3
  });
  
  // Feature Input
  const [featureInput, setFeatureInput] = useState('');
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Сбрасываем форму при изменении editingService
  useEffect(() => {
    if (editingService) {
      setFormData({
        title: editingService.title,
        description: editingService.description,
        category: editingService.category,
        features: editingService.features || [],
        price: editingService.price.toString(),
        deliveryDays: editingService.deliveryDays
      });
    }
  }, [editingService]);

  // Telegram Buttons
  useEffect(() => {
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
    
    let buttonText = 'ПРОДОЛЖИТЬ';
    if (isSubmitting) {
      buttonText = isEditing ? 'СОХРАНЕНИЕ...' : 'СОЗДАНИЕ...';
    } else if (isLastStep) {
      buttonText = isEditing ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОЗДАТЬ УСЛУГУ';
    }
    
    tg.MainButton.setParams({
      text: buttonText,
      color: isLastStep ? '#10b981' : '#2563eb',
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
  }, [currentStep, formData, isSubmitting, isEditing]);

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.title.length >= 10 && formData.category !== ServiceCategory.ALL;
      case 2:
        return formData.description.length >= 30;
      case 3:
        return parseInt(formData.price) > 0 && formData.deliveryDays > 0;
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

  // Add Feature
  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !formData.features.includes(f) && formData.features.length < 6) {
      setFormData(prev => ({ ...prev, features: [...prev.features, f] }));
      setFeatureInput('');
      triggerHaptic('light');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({ 
      ...prev, 
      features: prev.features.filter(f => f !== feature) 
    }));
    triggerHaptic('light');
  };

  // Submit
  const submitForm = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    window.Telegram?.WebApp?.MainButton.showProgress(false);

    try {
      const serviceData = {
        freelancerId: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        features: formData.features,
        price: parseInt(formData.price),
        deliveryDays: formData.deliveryDays,
        isActive: true
      };

      const newService = await onSubmit(serviceData);

      if (newService) {
        triggerHaptic('success');
        onServiceCreated(newService);
      } else {
        triggerHaptic('error');
        setErrors({ submit: isEditing ? 'Ошибка при обновлении услуги' : 'Ошибка при создании услуги' });
      }
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
      setErrors({ submit: isEditing ? 'Ошибка при обновлении услуги' : 'Ошибка при создании услуги' });
    } finally {
      setIsSubmitting(false);
      window.Telegram?.WebApp?.MainButton.hideProgress();
    }
  };

  // Styles
  const inputClass = "w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";

  // Price Suggestions
  const priceSuggestions = [3000, 5000, 10000, 15000, 25000];
  const daySuggestions = [1, 3, 5, 7, 14];

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {isEditing ? 'Редактирование услуги' : 'Новая услуга'}
            </h1>
            <p className="text-xs text-slate-500">Шаг {currentStep} из {STEPS.length}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <Rocket size={14} className="text-emerald-400" />
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
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
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
                    {isCompleted ? <Check size={14} /> : <span className="text-xs font-bold">{step.id}</span>}
                  </div>
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
          {/* STEP 1: Title & Category */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Что вы предлагаете?</h2>
                    <p className="text-xs text-slate-400">Опишите услугу понятно для клиента</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Название услуги *</label>
                <input
                  type="text"
                  placeholder="напр. Создам Telegram бота под ключ"
                  className={inputClass}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={80}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-slate-500">Минимум 10 символов</p>
                  <span className={`text-xs ${formData.title.length > 70 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {formData.title.length}/80
                  </span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Категория *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map(({ value, label }) => {
                    const isActive = formData.category === value;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          triggerHaptic('selection');
                          setFormData(prev => ({ ...prev, category: value }));
                        }}
                        className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                          isActive
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{label}</span>
                          {isActive && <Check size={16} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Description & Features */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Подробности</h2>
                    <p className="text-xs text-slate-400">Опишите что входит в услугу</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Описание *</label>
                <textarea
                  rows={5}
                  placeholder="Опишите услугу подробно:&#10;• Что вы сделаете?&#10;• Какой результат получит клиент?&#10;• Какие инструменты используете?"
                  className={`${inputClass} resize-none`}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-slate-500">
                    {formData.description.length < 30 
                      ? `Ещё ${30 - formData.description.length} символов` 
                      : '✓ Отлично!'}
                  </p>
                  <span className="text-xs text-slate-500">{formData.description.length}/1000</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Что входит в услугу (до 6 пунктов)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="напр. Исходный код"
                    className={`${inputClass} !p-3`}
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    maxLength={30}
                  />
                  <button 
                    onClick={addFeature}
                    disabled={formData.features.length >= 6}
                    className="p-3 rounded-xl bg-slate-700 text-white active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map(feature => (
                    <div 
                      key={feature} 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm"
                    >
                      <Check size={12} className="text-emerald-400" />
                      {feature}
                      <button onClick={() => removeFeature(feature)}>
                        <X size={14} className="text-slate-500 hover:text-rose-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Price & Delivery */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Стоимость и сроки</h2>
                    <p className="text-xs text-slate-400">Укажите цену и время выполнения</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Цена (₽) *</label>
                <input
                  type="number"
                  placeholder="напр. 5000"
                  className={inputClass}
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {priceSuggestions.map(price => (
                    <button
                      key={price}
                      onClick={() => {
                        triggerHaptic('selection');
                        setFormData(prev => ({ ...prev, price: price.toString() }));
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                        formData.price === price.toString()
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {price.toLocaleString()} ₽
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Clock size={12} className="inline mr-1" />
                  Срок выполнения (дней) *
                </label>
                <div className="flex gap-2">
                  {daySuggestions.map(days => (
                    <button
                      key={days}
                      onClick={() => {
                        triggerHaptic('selection');
                        setFormData(prev => ({ ...prev, deliveryDays: days }));
                      }}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        formData.deliveryDays === days
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mt-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Превью вашей услуги
                </h4>
                <div className="space-y-2">
                  <div className="text-white font-medium">{formData.title || 'Название услуги'}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-400 font-bold">
                      {formData.price ? `${parseInt(formData.price).toLocaleString()} ₽` : '—'}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      {formData.deliveryDays} дн.
                    </span>
                  </div>
                  {formData.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.features.map(f => (
                        <span key={f} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
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

export default CreateServiceWizard;
