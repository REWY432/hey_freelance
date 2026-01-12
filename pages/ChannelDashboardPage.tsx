import React, { useState, useEffect } from 'react';
import { getTelegramUser, triggerHaptic } from '../services/telegram';
import { api } from '../services/supabase';
import { Channel, ChannelJob, JobCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { 
  Hash, Users, BarChart3, Calendar, Settings, Trash2, 
  Loader2, RefreshCw, Check, AlertTriangle, ExternalLink,
  TrendingUp, FileText, ChevronRight
} from 'lucide-react';
import ConfirmSheet from '../components/ConfirmSheet';

interface ChannelDashboardPageProps {
  channel: Channel;
  onEditFilters: (channel: Channel) => void;
  onDisconnect: (channelId: string) => void;
  onBack: () => void;
}

const ChannelDashboardPage: React.FC<ChannelDashboardPageProps> = ({
  channel,
  onEditFilters,
  onDisconnect,
  onBack
}) => {
  const user = getTelegramUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    totalJobs: number;
    publishedJobs: number;
    jobsThisWeek: number;
  }>({ totalJobs: 0, publishedJobs: 0, jobsThisWeek: 0 });
  const [channelJobs, setChannelJobs] = useState<ChannelJob[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
    
    // Set up Telegram back button
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.BackButton.show();
      tg.BackButton.onClick(onBack);
      tg.MainButton.hide();
    }
    
    return () => {
      tg?.BackButton.offClick(onBack);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, jobs] = await Promise.all([
        api.getChannelStats(channel.id),
        // Note: We'd need to add this API method to get jobs for a channel
        // For now, use empty array
        Promise.resolve([])
      ]);
      
      setStats(statsData);
      setChannelJobs(jobs as ChannelJob[]);
    } catch (e) {
      console.error('Failed to load channel data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    await loadData();
    setIsRefreshing(false);
    triggerHaptic('success');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    triggerHaptic('medium');
    
    try {
      const success = await api.deleteChannel(channel.id);
      if (success) {
        triggerHaptic('success');
        onDisconnect(channel.id);
      } else {
        triggerHaptic('error');
      }
    } catch (e) {
      console.error('Failed to delete channel:', e);
      triggerHaptic('error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-500/20 to-transparent px-5 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Мой канал</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Channel Card */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Hash className="text-white" size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white text-lg truncate">{channel.channelTitle}</h2>
              {channel.channelUsername && (
                <p className="text-sm text-slate-400">@{channel.channelUsername}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users size={12} />
                  <span>{channel.subscribersCount.toLocaleString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  channel.isActive 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {channel.isActive ? 'Активен' : 'Отключён'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalJobs}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Всего</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.publishedJobs}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Опублик.</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.jobsThisWeek}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">За неделю</div>
          </div>
        </div>

        {/* Current Filters */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings size={16} className="text-slate-400" />
              Текущие фильтры
            </h3>
            <button
              onClick={() => onEditFilters(channel)}
              className="text-xs text-purple-400 font-medium flex items-center gap-1 hover:text-purple-300 transition-colors"
            >
              Изменить
              <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Категории</span>
              <span className="text-white">
                {channel.categories.length === 0 
                  ? 'Все' 
                  : channel.categories.map(c => CATEGORY_LABELS[c as JobCategory]).join(', ')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Мин. бюджет</span>
              <span className="text-white">
                {channel.minBudget > 0 
                  ? `от ${channel.minBudget.toLocaleString()} ₽` 
                  : 'Любой'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            Последние публикации
          </h3>
          
          {channelJobs.length === 0 ? (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30 text-center">
              <TrendingUp size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Пока нет публикаций</p>
              <p className="text-xs text-slate-500 mt-1">
                Заказы появятся после одобрения модератором
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {channelJobs.slice(0, 5).map((cj) => (
                <div 
                  key={cj.id}
                  className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {cj.job?.title || `Заказ #${cj.jobId}`}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        cj.status === 'published' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : cj.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-700 text-slate-400'
                      }`}>
                        {cj.status === 'published' ? 'Опубликован' : 
                         cj.status === 'pending' ? 'Ожидает' : 'Удалён'}
                      </span>
                      {cj.publishedAt && (
                        <span className="text-[10px] text-slate-500">
                          {new Date(cj.publishedAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                  {cj.telegramMessageId && (
                    <a
                      href={`https://t.me/c/${Math.abs(channel.channelId)}/${cj.telegramMessageId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 
                     flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
          >
            <Trash2 size={18} />
            Отключить канал
          </button>
          <p className="text-xs text-slate-500 text-center mt-2">
            Публикации в канале останутся, но новые заказы не будут публиковаться
          </p>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Отключить канал?"
        message={`Канал "${channel.channelTitle}" будет отключён. Существующие публикации останутся, но новые заказы не будут публиковаться.`}
        confirmText="Отключить"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ChannelDashboardPage;
