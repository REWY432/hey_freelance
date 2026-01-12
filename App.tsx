import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import JobsPage from './pages/JobsPage';
import ServicesPage from './pages/ServicesPage';
import CreateJobWizard from './pages/CreateJobWizard';
import CreateServiceWizard from './pages/CreateServiceWizard';
import FreelancersPage from './pages/FreelancersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ChannelConnectPage from './pages/ChannelConnectPage';
import ChannelDashboardPage from './pages/ChannelDashboardPage';
import Toast, { ToastType } from './components/Toast';
import OfflineBanner from './components/OfflineBanner';
import JobDetailModal from './components/JobDetailModal';
import SuccessAnimation from './components/SuccessAnimation';
import { useDeepLink } from './hooks/useDeepLink';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { ViewState, Job, Service, FreelancerProfile, JobStatus, ServiceStatus, JobCategory, Channel } from './types';
import { getTelegramUser, triggerHaptic, buildReferralLink, shareContent } from './services/telegram';
import { api } from './services/supabase';
import { Loader2 } from 'lucide-react';
import { ADMIN_IDS } from './constants';
import { useOnboarding } from './hooks/useOnboarding';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [view, setView] = useState<ViewState>(ViewState.JOBS);
  
  // Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]); // Для админки (включая PENDING)
  const [myServices, setMyServices] = useState<Service[]>([]); // Мои услуги
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [referralWallet, setReferralWallet] = useState<{ earned: number; balance: number }>({ earned: 0, balance: 0 });
  
  // UI
  const [notification, setNotification] = useState<{message: string, type: ToastType} | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null); // Для редактирования
  const [showOnboarding, setShowOnboarding] = useState(false); // Онбординг для новых пользователей
  const [unreadNotifications, setUnreadNotifications] = useState(0); // Счётчик непрочитанных уведомлений
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false); // Success animation после отклика
  
  // Channels
  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null); // Для дашборда/редактирования
  
  const deepLink = useDeepLink();
  const isOnline = useOnlineStatus();
  const user = getTelegramUser();
  const referralLogged = useRef(false);
  const referralStorageKey = `referral_wallet_${user.id}`;
  const referralLink = buildReferralLink({ referrerId: user.id });
  const { isCompleted: onboardingCompleted, isLoading: onboardingLoading, complete: completeOnboarding } = useOnboarding();

  const persistReferralWallet = (next: { earned: number; balance: number }) => {
    setReferralWallet(next);
    try {
      localStorage.setItem(referralStorageKey, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist referral wallet', e);
    }
  };

  const loadReferralWallet = async () => {
    const stats = await api.getReferralStats(user.id);
    let stored: { earned?: number; balance?: number } = {};
    try {
      const raw = localStorage.getItem(referralStorageKey);
      stored = raw ? JSON.parse(raw) : {};
    } catch (e) {
      stored = {};
    }

    const storedEarned = stored.earned ?? 0;
    const storedBalance = stored.balance ?? storedEarned;
    const earned = Math.max(stats?.total ?? 0, storedEarned);
    const delta = Math.max(earned - storedEarned, 0);
    const balance = Math.max(storedBalance + delta, 0);

    persistReferralWallet({ earned, balance });
  };

  const spendReferralBonus = () => {
    if (referralWallet.balance <= 0) return false;
    persistReferralWallet({
      earned: referralWallet.earned,
      balance: Math.max(referralWallet.balance - 1, 0)
    });
    return true;
  };

  const shareReferral = () => {
    const text = 'Присоединяйся к "Эй, биржа!": заказы и исполнители в Telegram.';
    shareContent(text, referralLink);
    triggerHaptic('selection');
  };
  
  const [myProfile, setMyProfile] = useState<FreelancerProfile>({
    userId: user.id,
    displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
    username: user.username,
    bio: '',
    skills: [],
    portfolioLinks: []
  });

  // Handle Deep Link
  useEffect(() => {
    if (deepLink.type === 'job' && deepLink.id) {
      setOpenJobId(deepLink.id);
    }
    if (deepLink.type === 'referral' && deepLink.id) {
      console.log('Referral from user:', deepLink.id);
    }
    if (deepLink.type === 'service' && deepLink.id) {
      // Переходим на страницу услуг при открытии по ссылке
      setView(ViewState.SERVICES);
    }

    // Логируем реферальный переход с валидацией
    if (deepLink.referrerId && !referralLogged.current) {
      const refId = Number(deepLink.referrerId);
      // Проверяем что ID валидный и это не сам пользователь
      if (!isNaN(refId) && refId > 0 && refId !== user.id) {
        referralLogged.current = true;
        api.logReferralHit({
          referrerId: refId,
          referredId: user.id,
          jobId: deepLink.type === 'job' ? deepLink.id || undefined : undefined,
          serviceId: deepLink.type === 'service' ? deepLink.id || undefined : undefined
        }).catch(console.error);
        showNotify('Вы пришли по приглашению — бонус начислен автору', 'info');
        localStorage.removeItem('referrer_id');
      }
    }
  }, [deepLink, user.id]);

  // Initial Load
  const initApp = async () => {
    setHasError(false);
    try {
      await api.ensureUser(user);

      const [fetchedJobs, fetchedFreelancers, fetchedProfile] = await Promise.all([
        api.getJobs(),
        api.getFreelancers(),
        api.getMyProfile(user.id)
      ]);

      setJobs(fetchedJobs);
      setFreelancers(fetchedFreelancers);
      if (fetchedProfile) {
        setMyProfile(fetchedProfile);
      }

      // Загружаем услуги
      const fetchedServices = await api.getServices();
      setServices(fetchedServices);

      // Загружаем мои услуги
      if (api.getMyServices) {
        const fetchedMyServices = await api.getMyServices(user.id);
        setMyServices(fetchedMyServices);
      }

      // Для админов загружаем все услуги (включая PENDING)
      if (ADMIN_IDS.includes(user.id) && api.getAllServices) {
        const fetchedAllServices = await api.getAllServices();
        setAllServices(fetchedAllServices);
      }

      await loadReferralWallet();
      
      // Загружаем счётчик непрочитанных уведомлений
      const unreadCount = await api.getUnreadCount(user.id);
      setUnreadNotifications(unreadCount);
      
      // Загружаем каналы пользователя
      const fetchedChannels = await api.getMyChannels(user.id);
      setMyChannels(fetchedChannels);

    } catch (error) {
      console.error("Initialization failed:", error);
      setHasError(true);
      showNotify("Ошибка подключения к базе данных", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Polling для обновления счётчика уведомлений (каждые 30 сек)
  useEffect(() => {
    if (isLoading) return;
    
    const pollNotifications = async () => {
      const count = await api.getUnreadCount(user.id);
      setUnreadNotifications(count);
    };

    const interval = setInterval(pollNotifications, 30000);
    return () => clearInterval(interval);
  }, [isLoading, user.id]);

  // Handlers
  const showNotify = (message: string, type: ToastType = 'success') => {
    setNotification({ message, type });
    triggerHaptic(type === 'error' ? 'error' : 'success');
  };

  // Success animation handler
  const showSuccess = () => {
    setShowSuccessAnimation(true);
    triggerHaptic('success');
    setTimeout(() => setShowSuccessAnimation(false), 2000);
  };

  const handleOnboardingComplete = async (data?: { interests?: JobCategory[] }) => {
    const interests = data?.interests || [];
    try {
      completeOnboarding({ interests });
      localStorage.setItem('onboarding_interests', JSON.stringify(interests));
      if (interests.length) {
        api.saveUserInterests?.(user.id, interests).catch(console.warn);
      }
    } catch (e) {
      console.warn('Failed to persist onboarding interests', e);
    } finally {
      setShowOnboarding(false);
    }
  };

  const handleViewChange = (newView: ViewState) => {
    if (newView === view) return;

    if (newView === ViewState.ADMIN && !ADMIN_IDS.includes(user.id)) {
        showNotify("Доступ запрещен", 'error');
        return;
    }

    triggerHaptic('light');
    setView(newView);
    
    // Сброс скролла при смене вкладки
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Загружаем услуги при переходе на вкладку
    if (newView === ViewState.SERVICES && services.length === 0) {
        api.getServices().then(setServices).catch(console.error);
    }
    
    // Загружаем все услуги для админки (всегда обновляем с сервера)
    if (newView === ViewState.ADMIN && api.getAllServices) {
        api.getAllServices().then(setAllServices).catch(console.error);
    }
    
    if (newView === ViewState.FREELANCERS && freelancers.length === 0) {
        api.getFreelancers().then(setFreelancers).catch(console.error);
    }
  };

  // Jobs
  const handleCreateJob = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
    setView(ViewState.PROFILE);
    showNotify('Заказ отправлен на модерацию', 'info');
  };

  const handleJobDeleted = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    showNotify('Заказ удален');
  };
  
  const handleJobStatusChange = (jobId: string, status: JobStatus) => {
      setJobs(prev => prev.map(j => j.id === jobId ? {...j, status} : j));
      showNotify(`Статус обновлен`);
  };

  // Services
  const handleCreateService = async (serviceData: any): Promise<Service | null> => {
    const newService = await api.createService(serviceData);
    if (newService) {
      // Добавляем в мои услуги
      setMyServices(prev => [newService, ...prev]);
    }
    return newService;
  };

  const handleServiceCreated = (newService: Service) => {
    setEditingService(null); // Сбрасываем режим редактирования
    setView(ViewState.PROFILE);
    showNotify('Услуга отправлена на модерацию', 'info');
  };

  // Редактирование услуги
  const handleEditService = (service: Service) => {
    setEditingService(service);
    setView(ViewState.CREATE_SERVICE);
  };

  // Удаление своей услуги (из профиля)
  const handleMyServiceDeleted = (serviceId: string) => {
    setMyServices(prev => prev.filter(s => s.id !== serviceId));
    setServices(prev => prev.filter(s => s.id !== serviceId));
    setAllServices(prev => prev.filter(s => s.id !== serviceId));
    showNotify('Услуга удалена');
  };

  // Обновление услуги после редактирования
  const handleServiceUpdated = async (serviceData: any): Promise<Service | null> => {
    if (!editingService) return null;
    
    const success = await api.updateService(editingService.id, serviceData);
    if (success) {
      const updatedService = { ...editingService, ...serviceData };
      
      // Обновляем во всех списках
      setMyServices(prev => prev.map(s => s.id === editingService.id ? updatedService : s));
      setServices(prev => prev.map(s => s.id === editingService.id ? updatedService : s));
      setAllServices(prev => prev.map(s => s.id === editingService.id ? updatedService : s));
      
      setEditingService(null);
      setView(ViewState.PROFILE);
      showNotify('Услуга обновлена', 'success');
      return updatedService;
    }
    return null;
  };

  // Service moderation handlers (for admin)
  const handleServiceDeleted = (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    setAllServices(prev => prev.filter(s => s.id !== serviceId));
    setMyServices(prev => prev.filter(s => s.id !== serviceId));
    showNotify('Услуга удалена');
  };

  const handleServiceStatusChange = (serviceId: string, status: ServiceStatus) => {
    // Обновляем в allServices
    setAllServices(prev => prev.map(s => s.id === serviceId ? {...s, status} : s));
    
    // Если одобрена - добавляем в публичный список (если ещё нет)
    if (status === ServiceStatus.ACTIVE) {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        setServices(prev => {
          // Проверяем что услуги ещё нет в списке
          if (prev.some(s => s.id === serviceId)) {
            return prev.map(s => s.id === serviceId ? {...s, status} : s);
          }
          return [{...service, status}, ...prev];
        });
      }
      showNotify('Услуга одобрена');
    } else if (status === ServiceStatus.REJECTED) {
      // Если отклонена - убираем из публичного списка
      setServices(prev => prev.filter(s => s.id !== serviceId));
      showNotify('Услуга отклонена');
    }
  };

  const handleServiceBoost = async (serviceId: string) => {
    const exists = myServices.find(s => s.id === serviceId) || services.find(s => s.id === serviceId);
    if (!exists) {
      showNotify('Услуга не найдена', 'error');
      return;
    }

    if (referralWallet.balance <= 0) {
      showNotify('Нет доступных реф-бонусов', 'error');
      return;
    }

    // Сохраняем в БД
    const success = await api.boostService(serviceId);
    if (!success) {
      showNotify('Ошибка при подъёме услуги', 'error');
      return;
    }

    // Списываем бонус только после успешного сохранения
    spendReferralBonus();

    const applyBoost = (list: Service[]) => {
      const idx = list.findIndex(s => s.id === serviceId);
      if (idx === -1) return list;
      const boosted = { ...list[idx], isBoosted: true, boostedAt: new Date().toISOString() };
      return [boosted, ...list.filter((_, i) => i !== idx)];
    };

    setMyServices(applyBoost);
    setServices(applyBoost);
    setAllServices(applyBoost);
    showNotify('Услуга поднята за счёт реферального бонуса', 'success');
  };

  const handleCreateServiceRequest = async (serviceId: string, message: string): Promise<boolean> => {
    const success = await api.createServiceRequest({
      serviceId,
      clientId: user.id,
      message
    });
    
    if (success) {
      showNotify('Заявка отправлена!', 'success');
    }
    return success;
  };

  // Profile
  const handleUpdateProfile = (updatedProfile: FreelancerProfile) => {
    setMyProfile(updatedProfile);
    setFreelancers(prev => {
        const exists = prev.find(f => f.userId === updatedProfile.userId);
        if (exists) return prev.map(f => f.userId === updatedProfile.userId ? updatedProfile : f);
        return [...prev, updatedProfile];
    });
    showNotify('Профиль обновлен');
  };

  useEffect(() => {
    if (onboardingLoading || onboardingCompleted === null) return;
    setShowOnboarding(onboardingCompleted === false);
  }, [onboardingCompleted, onboardingLoading]);

  // Channel Handlers
  const handleChannelConnected = (channel: Channel) => {
    setMyChannels(prev => {
      const exists = prev.find(c => c.id === channel.id);
      if (exists) {
        return prev.map(c => c.id === channel.id ? channel : c);
      }
      return [channel, ...prev];
    });
    setSelectedChannel(null);
    setView(ViewState.PROFILE);
    showNotify('Канал подключён!', 'success');
  };

  const handleChannelDisconnected = (channelId: string) => {
    setMyChannels(prev => prev.filter(c => c.id !== channelId));
    setSelectedChannel(null);
    setView(ViewState.PROFILE);
    showNotify('Канал отключён');
  };

  const handleOpenChannelDashboard = (channel: Channel) => {
    setSelectedChannel(channel);
    setView(ViewState.CHANNEL_DASHBOARD);
  };

  const handleEditChannelFilters = (channel: Channel) => {
    setSelectedChannel(channel);
    setView(ViewState.CHANNEL_CONNECT);
  };

  // Render Content
  const renderContent = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {(() => {
                switch (view) {
                    case ViewState.JOBS:
                        return (
                          <JobsPage 
                            jobs={jobs} 
                            isLoading={isLoading}
                            hasError={hasError}
                            onRetry={initApp}
                            onNotify={showNotify} 
                          />
                        );
                    
                    case ViewState.SERVICES:
                        return (
                          <ServicesPage 
                            services={services}
                            onCreateRequest={handleCreateServiceRequest}
                            onNotify={showNotify}
                            onRefresh={async () => {
                              const fetched = await api.getServices();
                              setServices(fetched);
                            }}
                          />
                        );
                    
                    case ViewState.CREATE_JOB:
                        return (
                          <CreateJobWizard 
                            onJobCreated={handleCreateJob} 
                            onCancel={() => handleViewChange(ViewState.JOBS)} 
                            referralBonus={referralWallet.balance}
                            onUseReferralBonus={spendReferralBonus}
                          />
                        );
                    
                    case ViewState.CREATE_SERVICE:
                        return (
                          <CreateServiceWizard
                            editingService={editingService}
                            onServiceCreated={handleServiceCreated}
                            onCancel={() => {
                              setEditingService(null);
                              handleViewChange(ViewState.PROFILE);
                            }}
                            onSubmit={editingService ? handleServiceUpdated : handleCreateService}
                          />
                        );
                    
                    case ViewState.FREELANCERS:
                        return <FreelancersPage freelancers={freelancers} />;
                    
                    case ViewState.PROFILE:
                        return (
                            <ProfilePage 
                                currentProfile={myProfile} 
                                onSave={handleUpdateProfile}
                                myJobs={jobs.filter(j => j.authorId === user.id)}
                                onJobDelete={handleJobDeleted}
                                onJobStatusChange={handleJobStatusChange}
                                myServices={myServices}
                                onServiceDelete={handleMyServiceDeleted}
                                onServiceEdit={handleEditService}
                                onCreateService={() => {
                                  setEditingService(null);
                                  setView(ViewState.CREATE_SERVICE);
                                }}
                                referralLink={referralLink}
                                referralEarned={referralWallet.earned}
                                referralBalance={referralWallet.balance}
                                onShareReferral={shareReferral}
                                onBoostService={handleServiceBoost}
                                availableReferralBonuses={referralWallet.balance}
                                myChannels={myChannels}
                                onConnectChannel={() => {
                                  setSelectedChannel(null);
                                  setView(ViewState.CHANNEL_CONNECT);
                                }}
                                onOpenChannel={handleOpenChannelDashboard}
                            />
                        );
                    
                    case ViewState.ADMIN:
                        return (
                         <AdminPage 
  jobs={jobs}
  services={allServices}
  onJobDeleted={handleJobDeleted}
  onJobStatusChange={handleJobStatusChange}
  onServiceDeleted={handleServiceDeleted}
  onServiceStatusChange={handleServiceStatusChange}
/>
                        );
                    
                    case ViewState.CHANNEL_CONNECT:
                        return (
                          <ChannelConnectPage
                            existingChannel={selectedChannel || undefined}
                            onChannelConnected={handleChannelConnected}
                            onCancel={() => {
                              setSelectedChannel(null);
                              setView(ViewState.PROFILE);
                            }}
                          />
                        );
                    
                    case ViewState.CHANNEL_DASHBOARD:
                        return selectedChannel ? (
                          <ChannelDashboardPage
                            channel={selectedChannel}
                            onEditFilters={handleEditChannelFilters}
                            onDisconnect={handleChannelDisconnected}
                            onBack={() => {
                              setSelectedChannel(null);
                              setView(ViewState.PROFILE);
                            }}
                          />
                        ) : (
                          <JobsPage jobs={jobs} />
                        );
                    
                    default:
                        return <JobsPage jobs={jobs} />;
                }
            })()}
        </div>
    );
  };

  // Loading
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
        <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
            <Loader2 size={48} className="text-blue-500 animate-spin relative z-10" />
        </div>
        <h2 className="mt-6 text-white font-black text-2xl tracking-[0.3em] animate-pulse">Эй, биржа!</h2>
        <div className="mt-2 text-slate-500 text-xs font-mono">Подключаемся...</div>
      </div>
    );
  }

  // Хандлер навигации из уведомлений
  const handleNavigateFromNotification = (targetView: ViewState, objectId?: string) => {
    setView(targetView);
    if (objectId && targetView === ViewState.PROFILE) {
      // Можно добавить логику открытия конкретного заказа/услуги
    }
    // Обновляем счётчик после просмотра
    api.getUnreadCount(user.id).then(setUnreadNotifications);
  };

  return (
    <Layout 
      currentView={view} 
      setView={handleViewChange}
      unreadNotifications={unreadNotifications}
      onNavigateToObject={handleNavigateFromNotification}
      isOffline={!isOnline}
    >
      {/* Offline Banner */}
      <OfflineBanner isOffline={!isOnline} />

      {/* Toast Notification */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Success Animation */}
      {showSuccessAnimation && <SuccessAnimation />}
      
      {renderContent()}
      
      {openJobId && (
        <JobDetailModal
          jobId={openJobId}
          onClose={() => setOpenJobId(null)}
          onApply={() => {
            showNotify('Отклик отправлен!', 'success');
            showSuccess();
          }}
        />
      )}

      {/* Onboarding для новых пользователей */}
      {showOnboarding && (
        <Onboarding
          userName={user.first_name}
          onComplete={handleOnboardingComplete}
          referralLink={referralLink}
          onShareReferral={shareReferral}
        />
      )}
    </Layout>
  );
};

export default App;
