import React, { useState, useEffect } from 'react';
import { Job, JobStatus, Service, ServiceStatus } from '../types';
import { api } from '../services/supabase';
import { triggerHaptic } from '../services/telegram';
import { 
  Trash2, ShieldAlert, User, Clock, Check, AlertTriangle, Hash, FileCode,
  Package, TrendingUp, Users, Briefcase, DollarSign, Activity,
  BarChart3, PieChart, ArrowUp, RefreshCw, MessageSquare, X, Loader2
} from 'lucide-react';
import DeveloperDocs from './DeveloperDocs';

// ============================================
// TYPES
// ============================================

interface PlatformStats {
  total_users: number;
  users_today: number;
  users_week: number;
  users_month: number;
  total_jobs: number;
  jobs_open: number;
  jobs_pending: number;
  jobs_closed: number;
  jobs_today: number;
  jobs_week: number;
  jobs_month: number;
  total_services: number;
  services_active: number;
  services_pending: number;
  services_today: number;
  services_week: number;
  total_proposals: number;
  proposals_today: number;
  proposals_week: number;
  total_service_requests: number;
  service_requests_week: number;
  total_budget: number;
  avg_budget: number;
}

interface DailyStat {
  date: string;
  users: number;
  jobs: number;
  services: number;
  proposals: number;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

// ============================================
// CATEGORY CONFIG
// ============================================

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  'DEVELOPMENT': { emoji: '💻', label: 'Разработка', color: 'bg-blue-500' },
  'DESIGN': { emoji: '🎨', label: 'Дизайн', color: 'bg-pink-500' },
  'MARKETING': { emoji: '📈', label: 'Маркетинг', color: 'bg-green-500' },
  'COPYWRITING': { emoji: '✍️', label: 'Тексты', color: 'bg-yellow-500' },
  'OTHER': { emoji: '📦', label: 'Разное', color: 'bg-slate-500' },
};

// ============================================
// PROPS
// ============================================

interface AdminPageProps {
  jobs: Job[];
  services: Service[];
  onJobDeleted: (jobId: string) => void;
  onJobStatusChange: (jobId: string, status: JobStatus) => void;
  onServiceDeleted: (serviceId: string) => void;
  onServiceStatusChange: (serviceId: string, status: ServiceStatus) => void;
}

// ============================================
// COMPONENT
// ============================================

const AdminPage: React.FC<AdminPageProps> = ({ 
  jobs, 
  services,
  onJobDeleted, 
  onJobStatusChange,
  onServiceDeleted,
  onServiceStatusChange
}) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'services' | 'docs'>('dashboard');
  const [jobsFilter, setJobsFilter] = useState<'pending' | 'all'>('pending');
  const [servicesFilter, setServicesFilter] = useState<'pending' | 'all'>('pending');
  
  // Analytics State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [topFreelancers, setTopFreelancers] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<{
    total: number;
    direct: number;
    referral: number;
    fromJob: number;
    fromService: number;
    topReferrers: { referrerId: number; count: number; username?: string }[];
  } | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Action States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  
  // Expanded descriptions
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Scheduled Approval Modal
  const [schedulingJobId, setSchedulingJobId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Load Analytics
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [
        platformStats,
        daily,
        categories,
        freelancers,
        clients,
        activity,
        traffic,
        scheduled
      ] = await Promise.all([
        api.getPlatformStats?.() || null,
        api.getDailyStats?.(14) || [],
        api.getCategoryStats?.() || [],
        api.getTopFreelancers?.(5) || [],
        api.getTopClients?.(5) || [],
        api.getRecentActivity?.(10) || [],
        api.getTrafficSources?.() || null,
        api.getScheduledJobs?.() || []
      ]);

      setStats(platformStats);
      setDailyStats(daily || []);
      setCategoryStats(categories || []);
      setTrafficSources(traffic);
      setScheduledJobs(scheduled || []);
      setTopFreelancers(freelancers || []);
      setTopClients(clients || []);
      setRecentActivity(activity || []);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    await loadAnalytics();
    setIsRefreshing(false);
    triggerHaptic('success');
  };

  // Job Actions
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Удалить этот заказ?")) return;
    
    setDeletingId(jobId);
    triggerHaptic('medium');
    
    try {
      const success = await api.deleteJob(jobId);
      if (success) {
        triggerHaptic('success');
        onJobDeleted(jobId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveJob = async (jobId: string) => {
    setApprovingId(jobId);
    triggerHaptic('medium');
    try {
      const success = await api.updateJobStatus(jobId, JobStatus.OPEN);
      if (success) {
        triggerHaptic('success');
        onJobStatusChange(jobId, JobStatus.OPEN);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  // Открыть модалку для отложенной публикации
  const openScheduleModal = (jobId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('10:00');
    setSchedulingJobId(jobId);
    triggerHaptic('light');
  };

  // Одобрить с отложенной публикацией
  const handleScheduledApprove = async () => {
    if (!schedulingJobId || !scheduleDate || !scheduleTime) return;
    
    setApprovingId(schedulingJobId);
    triggerHaptic('medium');
    
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const success = await api.approveJobScheduled(schedulingJobId, scheduledAt);
      if (success) {
        triggerHaptic('success');
        // Убираем из списка (заказ scheduled, не должен показываться в ленте)
        onJobDeleted(schedulingJobId);
        // Перезагружаем scheduled jobs для дашборда
        const scheduled = await api.getScheduledJobs?.() || [];
        setScheduledJobs(scheduled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
      setSchedulingJobId(null);
    }
  };

  // Service Actions
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm("Удалить эту услугу?")) return;
    
    setDeletingId(serviceId);
    triggerHaptic('medium');
    
    try {
      const success = await api.deleteService(serviceId);
      if (success) {
        triggerHaptic('success');
        onServiceDeleted(serviceId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveService = async (serviceId: string) => {
    setApprovingId(serviceId);
    triggerHaptic('medium');
    try {
      const success = await api.updateServiceStatus(serviceId, ServiceStatus.ACTIVE);
      if (success) {
        triggerHaptic('success');
        onServiceStatusChange(serviceId, ServiceStatus.ACTIVE);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectService = async (serviceId: string) => {
    if (!window.confirm("Отклонить эту услугу?")) return;
    
    setApprovingId(serviceId);
    triggerHaptic('medium');
    try {
      const success = await api.updateServiceStatus(serviceId, ServiceStatus.REJECTED);
      if (success) {
        triggerHaptic('success');
        onServiceStatusChange(serviceId, ServiceStatus.REJECTED);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  // Filtered Data
  const pendingJobs = jobs.filter(j => j.status === JobStatus.PENDING);
  const displayedJobs = jobsFilter === 'pending' ? pendingJobs : jobs;
  
  const pendingServices = services.filter(s => s.status === ServiceStatus.PENDING);
  const displayedServices = servicesFilter === 'pending' ? pendingServices : services;

  // Show Docs
  if (activeTab === 'docs') {
    return (
      <div className="relative">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className="absolute top-4 right-4 z-10 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
        >
          Назад
        </button>
        <DeveloperDocs />
      </div>
    );
  }

  // ============================================
  // RENDER DASHBOARD
  // ============================================
  const renderDashboard = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      );
    }

    const formatNumber = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num?.toString() || '0';
    };

    const formatCurrency = (num: number) => {
      return (num || 0).toLocaleString('ru-RU') + ' ₽';
    };

    // Calculate chart max
    const chartMax = Math.max(...dailyStats.map(d => d.jobs + d.services + d.proposals), 1);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 
                     rounded-lg text-xs text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Users */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Пользователи</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_users || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUp size={12} className="text-emerald-400" />
              <span className="text-xs text-emerald-400">+{stats?.users_week || 0} за неделю</span>
            </div>
          </div>

          {/* Jobs */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={18} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Заказы</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_jobs || 0)}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400">{stats?.jobs_open || 0} откр.</span>
              <span>•</span>
              <span className="text-yellow-400">{stats?.jobs_pending || 0} ожид.</span>
            </div>
          </div>

          {/* Services */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Услуги</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_services || 0)}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-purple-400">{stats?.services_active || 0} акт.</span>
              <span>•</span>
              <span className="text-yellow-400">{stats?.services_pending || 0} ожид.</span>
            </div>
          </div>

          {/* Proposals */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={18} className="text-orange-400" />
              <span className="text-xs text-orange-400 font-medium">Отклики</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_proposals || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUp size={12} className="text-emerald-400" />
              <span className="text-xs text-emerald-400">+{stats?.proposals_week || 0} за неделю</span>
            </div>
          </div>
        </div>

        {/* Budget Stats */}
        <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={18} className="text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">Общий бюджет заказов</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats?.total_budget || 0)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">Средний бюджет</div>
              <div className="text-lg font-bold text-yellow-400">{formatCurrency(stats?.avg_budget || 0)}</div>
            </div>
          </div>
        </div>

        {/* Traffic Sources */}
        {trafficSources && trafficSources.total > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-cyan-400" />
              <span className="text-sm font-medium text-white">Источники трафика</span>
              <span className="text-xs text-slate-500 ml-auto">{trafficSources.total} переходов</span>
            </div>
            
            {/* Traffic breakdown */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-400">{trafficSources.referral}</div>
                <div className="text-[10px] text-slate-400">Рефералы</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">{trafficSources.fromJob}</div>
                <div className="text-[10px] text-slate-400">С заказов</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-400">{trafficSources.fromService}</div>
                <div className="text-[10px] text-slate-400">С услуг</div>
              </div>
            </div>

            {/* Top Referrers */}
            {trafficSources.topReferrers.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-2">Топ рефереров</div>
                <div className="space-y-1">
                  {trafficSources.topReferrers.slice(0, 5).map((ref, i) => (
                    <div key={ref.referrerId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <span className="text-slate-300">@{ref.username || ref.referrerId}</span>
                      </div>
                      <span className="text-cyan-400 font-medium">{ref.count} чел.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scheduled Jobs */}
        {scheduledJobs.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-cyan-400" />
              <span className="text-sm font-medium text-white">Запланированные публикации</span>
              <span className="text-xs text-slate-500 ml-auto">{scheduledJobs.length} заказов</span>
            </div>
            
            <div className="space-y-2">
              {scheduledJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{job.title}</div>
                    <div className="text-xs text-slate-400">@{job.authorUsername || job.authorName}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-xs font-medium text-cyan-400">
                      {job.scheduledAt && new Date(job.scheduledAt).toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {job.scheduledAt && new Date(job.scheduledAt).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Chart */}
        {dailyStats.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-white">Активность за 14 дней</span>
            </div>
            
            <div className="flex items-end gap-1 h-24">
              {dailyStats.map((day, i) => {
                const total = day.jobs + day.services + day.proposals;
                const height = (total / chartMax) * 100;
                const date = new Date(day.date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className={`w-full rounded-t transition-all ${
                        isToday ? 'bg-blue-500' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${total} действий`}
                    />
                    <span className="text-[8px] text-slate-500">
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Заказы
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Услуги
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Отклики
              </span>
            </div>
          </div>
        )}

        {/* Category Distribution */}
        {categoryStats.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-white">Категории заказов</span>
            </div>
            
            <div className="space-y-2">
              {categoryStats.map((cat, i) => {
                const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG['OTHER'];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg">{config.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{config.label}</span>
                        <span className="text-slate-400">{cat.count} ({cat.percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${config.color} rounded-full transition-all`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Users */}
        <div className="grid grid-cols-2 gap-3">
          {/* Top Freelancers */}
          {topFreelancers.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-emerald-400" />
                <span className="text-xs font-medium text-white">Топ исполнителей</span>
              </div>
              <div className="space-y-2">
                {topFreelancers.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{f.name}</div>
                      <div className="text-[10px] text-slate-500">{f.proposals_count} откликов</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Clients */}
          {topClients.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-400" />
                <span className="text-xs font-medium text-white">Топ заказчиков</span>
              </div>
              <div className="space-y-2">
                {topClients.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.jobs_count} заказов</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-slate-400" />
              <span className="text-xs font-medium text-white">Последняя активность</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivity.map((a, i) => {
                const typeConfig: Record<string, { icon: any; color: string }> = {
                  'job': { icon: Briefcase, color: 'text-emerald-400' },
                  'service': { icon: Package, color: 'text-purple-400' },
                  'proposal': { icon: MessageSquare, color: 'text-orange-400' },
                  'user': { icon: User, color: 'text-blue-400' },
                };
                const config = typeConfig[a.type] || typeConfig['user'];
                const Icon = config.icon;
                
                return (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Icon size={14} className={config.color} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{a.title}</div>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(a.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER JOBS MODERATION
  // ============================================
  const renderJobsModeration = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter */}
      <div className="flex bg-slate-800 rounded-lg p-1">
        <button 
          onClick={() => setJobsFilter('pending')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            jobsFilter === 'pending' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          Ожидают ({pendingJobs.length})
        </button>
        <button 
          onClick={() => setJobsFilter('all')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            jobsFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          Все ({jobs.length})
        </button>
      </div>

      {displayedJobs.length === 0 ? (
        <div className="text-center text-slate-500 py-10">Список пуст</div>
      ) : (
        displayedJobs.map((job) => (
          <div 
            key={job.id} 
            className={`rounded-xl p-4 border flex flex-col gap-3 relative overflow-hidden ${
              job.status === JobStatus.PENDING 
                ? 'bg-slate-800/80 border-yellow-500/30' 
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {job.status === JobStatus.PENDING && (
              <div className="absolute top-0 right-0 bg-yellow-500/20 px-2 py-0.5 rounded-bl-lg text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                <AlertTriangle size={8} /> На модерации
              </div>
            )}

            <div className="flex justify-between items-start mt-2">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-mono mb-2 border border-slate-600/50">
                  <Hash size={10} /> ID: <span className="text-white font-bold">{job.id}</span>
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-1">{job.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <User size={10} /> {job.authorName}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded">
                {job.budget}
              </div>
            </div>

            <div 
              onClick={() => {
                const newSet = new Set(expandedJobs);
                if (newSet.has(job.id)) {
                  newSet.delete(job.id);
                } else {
                  newSet.add(job.id);
                }
                setExpandedJobs(newSet);
              }}
              className={`text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50 cursor-pointer hover:bg-slate-900/70 transition-colors ${
                expandedJobs.has(job.id) ? '' : 'line-clamp-2'
              }`}
            >
              {job.description}
              {!expandedJobs.has(job.id) && job.description.length > 120 && (
                <span className="text-cyan-400 ml-1">▼</span>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700/50 gap-2">
              {job.status === JobStatus.PENDING && (
                <>
                  <button
                    onClick={() => openScheduleModal(job.id)}
                    disabled={!!approvingId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                  >
                    <Clock size={14} />
                    Позже
                  </button>
                  <button
                    onClick={() => handleApproveJob(job.id)}
                    disabled={!!approvingId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                  >
                    <Check size={14} />
                    {approvingId === job.id ? '...' : 'Сейчас'}
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeleteJob(job.id)}
                disabled={deletingId === job.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                <Trash2 size={14} />
                {deletingId === job.id ? '...' : 'Удалить'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================
  // RENDER SERVICES MODERATION
  // ============================================
  const renderServicesModeration = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter */}
      <div className="flex bg-slate-800 rounded-lg p-1">
        <button 
          onClick={() => setServicesFilter('pending')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            servicesFilter === 'pending' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          Ожидают ({pendingServices.length})
        </button>
        <button 
          onClick={() => setServicesFilter('all')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            servicesFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          Все ({services.length})
        </button>
      </div>

      {displayedServices.length === 0 ? (
        <div className="text-center text-slate-500 py-10">Список пуст</div>
      ) : (
        displayedServices.map((service) => (
          <div 
            key={service.id}
            className={`rounded-xl p-4 border flex flex-col gap-3 relative overflow-hidden ${
              service.status === ServiceStatus.PENDING 
                ? 'bg-slate-800/80 border-yellow-500/30' 
                : service.status === ServiceStatus.REJECTED
                  ? 'bg-slate-800/50 border-rose-500/30'
                  : 'bg-slate-800 border-slate-700'
            }`}
          >
            {/* Status Badge */}
            <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"
              style={{
                backgroundColor: service.status === ServiceStatus.PENDING 
                  ? 'rgba(234, 179, 8, 0.2)' 
                  : service.status === ServiceStatus.REJECTED 
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                color: service.status === ServiceStatus.PENDING 
                  ? '#facc15' 
                  : service.status === ServiceStatus.REJECTED 
                    ? '#f87171'
                    : '#34d399'
              }}
            >
              {service.status === ServiceStatus.PENDING && <><AlertTriangle size={8} /> На модерации</>}
              {service.status === ServiceStatus.ACTIVE && <><Check size={8} /> Активна</>}
              {service.status === ServiceStatus.REJECTED && <><X size={8} /> Отклонена</>}
            </div>

            <div className="flex justify-between items-start mt-2">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-mono mb-2 border border-slate-600/50">
                  <Hash size={10} /> ID: <span className="text-white font-bold">{service.id}</span>
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-1">{service.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <User size={10} /> {service.freelancerName}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> {service.deliveryDays} дн.
                  </span>
                </div>
              </div>
              <div className="text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded">
                {service.price?.toLocaleString()} ₽
              </div>
            </div>

            <div 
              onClick={() => {
                const newSet = new Set(expandedServices);
                if (newSet.has(service.id)) {
                  newSet.delete(service.id);
                } else {
                  newSet.add(service.id);
                }
                setExpandedServices(newSet);
              }}
              className={`text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50 cursor-pointer hover:bg-slate-900/70 transition-colors ${
                expandedServices.has(service.id) ? '' : 'line-clamp-2'
              }`}
            >
              {service.description}
              {!expandedServices.has(service.id) && service.description.length > 120 && (
                <span className="text-cyan-400 ml-1">▼</span>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700/50 gap-2">
              {service.status === ServiceStatus.PENDING && (
                <>
                  <button
                    onClick={() => handleApproveService(service.id)}
                    disabled={!!approvingId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                  >
                    <Check size={14} />
                    {approvingId === service.id ? '...' : 'Одобрить'}
                  </button>
                  <button
                    onClick={() => handleRejectService(service.id)}
                    disabled={!!approvingId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all"
                  >
                    <X size={14} />
                    Отклонить
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeleteService(service.id)}
                disabled={deletingId === service.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                <Trash2 size={14} />
                {deletingId === service.id ? '...' : 'Удалить'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="p-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-rose-500" size={24} />
          <div>
            <h1 className="text-lg font-bold text-white">Админ Панель</h1>
            <p className="text-xs text-rose-300">
              {pendingJobs.length + pendingServices.length} на модерации
            </p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('docs')}
          className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-700"
        >
          <FileCode size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 ${
            activeTab === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          <BarChart3 size={14} />
          Аналитика
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 ${
            activeTab === 'jobs' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          <Briefcase size={14} />
          Заказы
          {pendingJobs.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full">
              {pendingJobs.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 ${
            activeTab === 'services' ? 'bg-slate-700 text-white' : 'text-slate-400'
          }`}
        >
          <Package size={14} />
          Услуги
          {pendingServices.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full">
              {pendingServices.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'jobs' && renderJobsModeration()}
      {activeTab === 'services' && renderServicesModeration()}

      {/* Schedule Modal */}
      {schedulingJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSchedulingJobId(null)}
          />
          <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-cyan-400" />
              Отложенная публикация
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Дата публикации</label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-2">Время</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {scheduleDate && scheduleTime && (
                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-cyan-400">
                    Заказ будет опубликован {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSchedulingJobId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleScheduledApprove}
                disabled={!scheduleDate || !scheduleTime || !!approvingId}
                className="flex-1 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approvingId ? 'Сохранение...' : 'Запланировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
