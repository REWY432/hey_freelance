import React, { useState, useEffect } from 'react';
import { getTelegramUser, triggerHaptic, openTelegramChat } from '../services/telegram';
import { api } from '../services/supabase';
import { FreelancerProfile, Job, JobStatus, Service, ServiceStatus, ServiceCategory } from '../types';
import ProposalsList from '../components/ProposalsList';
import { 
  X, Plus, Trash2, Eye, EyeOff, Link as LinkIcon, AlertTriangle, CheckCircle, 
  Bell, MessageSquare, ChevronRight, Package, Edit3, Clock, Loader2, Gift, Share2, Copy, ArrowUp
} from 'lucide-react';

interface ProfilePageProps {
  currentProfile?: FreelancerProfile;
  onSave: (profile: FreelancerProfile) => void;
  myJobs: Job[];
  onJobDelete: (id: string) => void;
  onJobStatusChange: (id: string, status: JobStatus) => void;
  myServices: Service[];
  onServiceDelete: (id: string) => void;
  onServiceEdit: (service: Service) => void;
  onCreateService: () => void;
  referralLink?: string;
  referralEarned?: number;
  referralBalance?: number;
  onShareReferral?: () => void;
  onBoostService?: (serviceId: string) => void;
  availableReferralBonuses?: number;
}

// Категории для отображения
const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.ALL]: 'Все',
  [ServiceCategory.DEVELOPMENT]: 'Разработка',
  [ServiceCategory.DESIGN]: 'Дизайн',
  [ServiceCategory.MARKETING]: 'Маркетинг',
  [ServiceCategory.COPYWRITING]: 'Тексты',
  [ServiceCategory.OTHER]: 'Другое'
};

const ProfilePage: React.FC<ProfilePageProps> = ({ 
  currentProfile, 
  onSave, 
  myJobs, 
  onJobDelete, 
  onJobStatusChange,
  myServices,
  onServiceDelete,
  onServiceEdit,
  onCreateService,
  referralLink,
  referralEarned = 0,
  referralBalance = 0,
  onShareReferral,
  onBoostService,
  availableReferralBonuses = 0
}) => {
  const user = getTelegramUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'jobs' | 'services'>('profile');
  
  // Profile State
  const [isSaving, setIsSaving] = useState(false);
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [skills, setSkills] = useState<string[]>(currentProfile?.skills || []);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(currentProfile?.portfolioLinks || []);
  const [skillInput, setSkillInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Proposals Viewing State
  const [viewingProposalsJobId, setViewingProposalsJobId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // Service Delete State
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    if (currentProfile) {
      setBio(prev => prev || currentProfile.bio);
      setSkills(prev => prev.length ? prev : currentProfile.skills);
      setPortfolioLinks(prev => prev.length ? prev : (currentProfile.portfolioLinks || []));
    }
  }, [currentProfile]);

  // Main Button Logic for "Save Profile"
  useEffect(() => {
    if (activeTab !== 'profile' || viewingProposalsJobId) {
      window.Telegram?.WebApp?.MainButton.hide();
      return;
    }

    const tg = window.Telegram?.WebApp;
    if (tg) {
      const handleSave = () => { triggerHaptic('medium'); saveProfile(); };
      tg.MainButton.onClick(handleSave);
      tg.MainButton.setParams({
        text: isSaving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ПРОФИЛЬ',
        color: '#7c3aed',
        is_visible: true,
        is_active: !isSaving
      });
      return () => { tg.MainButton.offClick(handleSave); tg.MainButton.hide(); };
    }
  }, [activeTab, isSaving, bio, skills, portfolioLinks, viewingProposalsJobId]);

  const saveProfile = async () => {
    setIsSaving(true);
    window.Telegram?.WebApp?.MainButton.showProgress(false);

    try {
      const updated: FreelancerProfile = {
        userId: user.id,
        username: user.username,
        displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
        bio: bio,
        skills: skills,
        portfolioLinks: portfolioLinks
      };
      await api.updateProfile(updated);
      onSave(updated);
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
    } finally {
      setIsSaving(false);
      window.Telegram?.WebApp?.MainButton.hideProgress();
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput('');
      triggerHaptic('light');
    }
  };

  const addLink = () => {
    const l = linkInput.trim();
    if (l) {
      setPortfolioLinks([...portfolioLinks, l]);
      setLinkInput('');
      triggerHaptic('light');
    }
  };

  // Job handlers
  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить этот заказ навсегда?')) return;
    triggerHaptic('medium');
    const success = await api.deleteJob(id);
    if (success) onJobDelete(id);
  };

  const handleToggleJobStatus = async (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = job.status === JobStatus.OPEN ? JobStatus.CLOSED : JobStatus.OPEN;
    triggerHaptic('light');
    const success = await api.updateJobStatus(job.id, newStatus);
    if (success) onJobStatusChange(job.id, newStatus);
  };

  const handleViewProposals = async (job: Job) => {
    setViewingProposalsJobId(job.id);
    setIsLoadingProposals(true);
    triggerHaptic('selection');
    try {
      const data = await api.getProposalsForJob(job.id);
      setProposals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  // Service handlers
  const handleDeleteService = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить эту услугу навсегда?')) return;
    
    setDeletingServiceId(id);
    triggerHaptic('medium');
    
    try {
      const success = await api.deleteService(id);
      if (success) {
        onServiceDelete(id);
        triggerHaptic('success');
      }
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleEditService = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onServiceEdit(service);
  };

  // Styles
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";
  const inputClass = "w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all disabled:opacity-50";
  const canBoostWithReferral = availableReferralBonuses > 0;

  const copyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    triggerHaptic('selection');
  };

  // RENDER PROPOSALS VIEW
  if (viewingProposalsJobId) {
    const currentJob = myJobs.find(j => j.id === viewingProposalsJobId);
    return (
      <ProposalsList 
        proposals={proposals} 
        jobTitle={currentJob?.title || 'Заказ'} 
        onClose={() => setViewingProposalsJobId(null)} 
      />
    );
  }

  // Status badge helper
  const getServiceStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.PENDING:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
            <AlertTriangle size={10} /> На модерации
          </span>
        );
      case ServiceStatus.ACTIVE:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle size={10} /> Активна
          </span>
        );
      case ServiceStatus.REJECTED:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full border border-rose-500/20">
            <X size={10} /> Отклонена
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-32">
      {/* Header Profile Card */}
      <div className="p-5 pb-0">
        <div className="relative mb-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl shadow-purple-500/20 text-center overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-2xl font-black mb-2 shadow-2xl">
              {user.first_name[0]}
            </div>
            <h1 className="text-xl font-black text-white leading-none">
              {user.first_name} {user.last_name}
            </h1>
            {user.username && (
              <p className="text-xs text-white/60 mt-1">@{user.username}</p>
            )}
          </div>
        </div>

        {/* NOTIFICATION BOT CONNECT */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Bell size={20} />
            </div>
            <div className="text-sm">
              <div className="font-bold text-white">Уведомления</div>
              <div className="text-xs text-slate-400">Включить бота</div>
            </div>
          </div>
          <button 
            onClick={() => openTelegramChat("hey_birazhabot", "/start")}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 active:scale-95 transition-transform"
          >
            Включить
          </button>
        </div>

        {referralLink && (
          <div className="mb-6 bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-white font-bold">
                  <Gift size={18} className="text-emerald-400" />
                  Реферальная программа
                </div>
                <div className="text-xs text-slate-400">
                  Бонусы за друзей: бесплатная подсветка заказа или «подъём» услуги
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-400 leading-none">{referralBalance}</div>
                <div className="text-[10px] text-slate-500 uppercase">бонусов</div>
                <div className="text-[11px] text-slate-500">Приглашено: {referralEarned}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3">
              <div className="flex-1 text-sm text-white truncate">{referralLink}</div>
              <button 
                onClick={copyReferral}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Copy size={16} />
              </button>
              <button 
                onClick={() => { triggerHaptic('selection'); onShareReferral?.(); }}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <Share2 size={16} />
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              1 бонус = бесплатная подсветка при создании заказа или «подъём» одной услуги. Остаток: {referralBalance}.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'profile' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'
            }`}
          >
            ПРОФИЛЬ
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'jobs' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'
            }`}
          >
            ЗАКАЗЫ ({myJobs.length})
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'services' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'
            }`}
          >
            УСЛУГИ ({myServices.length})
          </button>
        </div>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="px-5 space-y-8 animate-in slide-in-from-left-4 fade-in duration-300">
          <div>
            <label className={labelClass}>О себе</label>
            <textarea
              rows={4}
              disabled={isSaving}
              className={inputClass}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Расскажите о своем опыте..."
            />
          </div>

          <div>
            <label className={labelClass}>Навыки</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                disabled={isSaving}
                className={`${inputClass} !p-3`}
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addSkill()}
                placeholder="напр. React"
              />
              <button onClick={addSkill} className="p-3 rounded-xl bg-slate-700 text-white active:scale-95">
                <Plus size={24} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <div key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm">
                  {skill}
                  <button onClick={() => setSkills(skills.filter(s => s !== skill))}>
                    <X size={14} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Портфолио (Ссылки)</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                disabled={isSaving}
                className={`${inputClass} !p-3`}
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                placeholder="https://..."
              />
              <button onClick={addLink} className="p-3 rounded-xl bg-slate-700 text-white active:scale-95">
                <Plus size={24} />
              </button>
            </div>
            <div className="space-y-2">
              {portfolioLinks.map((link, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <LinkIcon size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate text-blue-300">{link}</span>
                  </div>
                  <button onClick={() => setPortfolioLinks(portfolioLinks.filter(l => l !== link))}>
                    <X size={14} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JOBS TAB */}
      {activeTab === 'jobs' && (
        <div className="px-5 space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
          {myJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 animate-in fade-in duration-300">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 blur-2xl opacity-20 rounded-full scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 
                              flex items-center justify-center shadow-lg">
                  <MessageSquare size={28} className="text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">У вас пока нет заказов</h3>
              <p className="text-sm text-slate-400 text-center max-w-[200px] mb-4">
                Создайте первый заказ, чтобы найти исполнителя
              </p>
              <button
                onClick={() => window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/hey_birazhabot')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold 
                         rounded-xl transition-all active:scale-95"
              >
                Создать заказ
              </button>
            </div>
          ) : (
            myJobs.map(job => (
              <div 
                key={job.id} 
                onClick={() => handleViewProposals(job)}
                className={`group p-4 rounded-xl border relative transition-all active:scale-[0.98] ${
                  job.status === JobStatus.CLOSED 
                    ? 'bg-slate-800/30 border-slate-800 opacity-60' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {job.status === JobStatus.PENDING && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
                      <AlertTriangle size={10} /> Модерация
                    </span>
                  )}
                  {job.status === JobStatus.OPEN && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle size={10} /> Активен
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start mb-2 pr-24">
                  <h3 className="font-bold text-white text-sm line-clamp-1">{job.title}</h3>
                </div>
                <span className="text-emerald-400 text-xs font-mono">{job.budget}</span>

                {/* Proposals Count Badge */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                    <MessageSquare size={14} />
                    <span className="text-xs font-bold">{job.proposalsCount || 0} Откликов</span>
                    <ChevronRight size={12} className="opacity-50" />
                  </div>

                  <div className="flex gap-2">
                    {job.status !== JobStatus.PENDING && (
                      <button 
                        onClick={(e) => handleToggleJobStatus(job, e)}
                        className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                      >
                        {job.status === JobStatus.OPEN ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SERVICES TAB */}
      {activeTab === 'services' && (
        <div className="px-5 space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
          {/* Create Service Button */}
          <button
            onClick={onCreateService}
            className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 text-slate-400
                     hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5
                     transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span className="font-medium">Создать услугу</span>
          </button>

          {myServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 animate-in fade-in duration-300">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 blur-2xl opacity-20 rounded-full scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 
                              flex items-center justify-center shadow-lg animate-float">
                  <Package size={28} className="text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">У вас пока нет услуг</h3>
              <p className="text-sm text-slate-400 text-center max-w-[220px] mb-4">
                Создайте услугу и получайте заявки от клиентов
              </p>
              <button
                onClick={onCreateService}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold 
                         rounded-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={16} />
                Создать услугу
              </button>
            </div>
          ) : (
            myServices.map(service => (
              <div 
                key={service.id}
                className={`p-4 rounded-xl border transition-all ${
                  service.status === ServiceStatus.REJECTED 
                    ? 'bg-slate-800/30 border-rose-500/20 opacity-60'
                    : service.status === ServiceStatus.PENDING
                      ? 'bg-slate-800/80 border-yellow-500/30'
                      : 'bg-slate-800 border-slate-700'
                }`}
              >
                {/* Header with status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {CATEGORY_LABELS[service.category]}
                      </span>
                      {getServiceStatusBadge(service.status)}
                      {service.isBoosted && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30">
                          <ArrowUp size={10} /> Поднято
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm line-clamp-1">{service.title}</h3>
                  </div>
                  <div className="text-emerald-400 font-mono text-sm font-bold">
                    {service.price.toLocaleString()} ₽
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {service.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {service.deliveryDays} дн.
                  </span>
                  <span className="flex items-center gap-1">
                    <Package size={12} />
                    {service.ordersCount || 0} заказов
                  </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                  {onBoostService && canBoostWithReferral && service.status === ServiceStatus.ACTIVE && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onBoostService(service.id); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
                    >
                      <ArrowUp size={14} />
                      Поднять (бонус)
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditService(service, e)}
                    disabled={service.status === ServiceStatus.REJECTED}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 
                             hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 size={14} />
                    Изменить
                  </button>
                  <button
                    onClick={(e) => handleDeleteService(service.id, e)}
                    disabled={deletingServiceId === service.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 
                             border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >
                    {deletingServiceId === service.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
