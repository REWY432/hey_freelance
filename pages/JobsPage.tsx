import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Job, JobCategory, JobStatus } from '../types';
import { openTelegramChat, triggerHaptic, getTelegramUser, shareContent, buildReferralLink } from '../services/telegram';
import { api } from '../services/supabase';
import { CATEGORY_LABELS } from '../constants';
import BottomSheet from '../components/BottomSheet';
import NewJobsBanner, { ConnectionIndicator } from '../components/NewJobsBanner';
import { useLiveJobs } from '../hooks/useLiveJobs';
import { JobListSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PullToRefresh from '../components/PullToRefresh';
import { useLazyLoadList } from '../hooks/useIntersectionObserver';
import { Send, Clock, Briefcase, Heart, Filter, Pin, Flame, ChevronDown, ChevronUp, X, Check, Search, Share2, Loader2 } from 'lucide-react';

// Хук для debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Цвета категорий
const CATEGORY_COLORS: Record<JobCategory, string> = {
  [JobCategory.ALL]: 'bg-slate-800 text-slate-400 border-slate-700',
  [JobCategory.DEVELOPMENT]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [JobCategory.DESIGN]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [JobCategory.MARKETING]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [JobCategory.COPYWRITING]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [JobCategory.OTHER]: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface JobsPageProps {
  jobs: Job[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const JobsPage: React.FC<JobsPageProps> = ({ jobs: initialJobs, isLoading = false, hasError = false, onRetry, onNotify }) => {
  const user = getTelegramUser();
  
  // === LIVE UPDATES ===
  const {
    jobs,
    newJobsCount,
    applyPendingJobs,
    isConnected,
    refetch
  } = useLiveJobs(initialJobs, {
    enabled: true,
    onNewJob: (job) => {
      console.log('🆕 Получен новый заказ:', job.title);
    }
  });

  // === UI STATE ===
  const [activeCategory, setActiveCategory] = useState<JobCategory>(JobCategory.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [expandedJobs, setExpandedJobs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const lastScrollY = useRef(0);
  
  // === BOTTOM SHEET STATE ===
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  // Load saved data
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarked_jobs');
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    
    const savedApplied = localStorage.getItem('applied_jobs');
    if (savedApplied) setAppliedJobs(JSON.parse(savedApplied));
  }, []);

  // === SCROLL HANDLER - Hide filters on scroll down ===
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY.current;
      
      // Show filters when near top or scrolling up
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

  // === HANDLERS ===
  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (onNotify) {
      onNotify(message, type);
    }
  }, [onNotify]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    
    setBookmarks(prev => {
      const newVal = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem('bookmarked_jobs', JSON.stringify(newVal));
      return newVal;
    });
  };

  const enableNotifications = () => {
    openTelegramChat('telelance_notify_bot', '/start');
  };

  const handleShare = (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    const text = `🔥 ${job.title}\n💰 Бюджет: ${job.budget}\n\nПодробности в приложении:`;
    const link = buildReferralLink({ type: 'job', targetId: job.id, referrerId: user.id });
    shareContent(text, link);
  };

  const toggleExpand = (id: string) => {
    triggerHaptic('selection');
    setExpandedJobs(prev => 
      prev.includes(id) ? prev.filter(jobId => jobId !== id) : [...prev, id]
    );
  };

  const handleApplyClick = (job: Job) => {
    if (job.authorId === user.id) {
      triggerHaptic('error');
      notify('Это ваш собственный заказ', 'error');
      return;
    }
    
    if (appliedJobs.includes(job.id)) {
      triggerHaptic('error');
      notify('Вы уже откликались на этот заказ', 'error');
      return;
    }
    
    triggerHaptic('medium');
    setApplyingJob(job);
    setCoverLetter('');
  };

  const submitProposal = async () => {
    if (!applyingJob) return;
    if (coverLetter.length < 10) {
      triggerHaptic('error');
      notify('Напишите чуть больше о себе (минимум 10 символов)', 'error');
      return;
    }
    
    setIsSending(true);
    triggerHaptic('light');
    
    try {
      const success = await api.createProposal({
        jobId: applyingJob.id,
        freelancerId: user.id,
        coverLetter
      });
      
      if (success) {
        triggerHaptic('success');
        
        const newApplied = [...appliedJobs, applyingJob.id];
        setAppliedJobs(newApplied);
        localStorage.setItem('applied_jobs', JSON.stringify(newApplied));
        
        setApplyingJob(null);
        setCoverLetter('');
        notify('Отклик отправлен!', 'success');
      } else {
        notify('Ошибка отправки', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Ошибка отправки', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handlePullRefresh = async () => {
    if (refetch) {
      await refetch();
    }
  };

  // === FILTERING with debounced search ===
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (job.status !== JobStatus.OPEN) return false;
      if (activeCategory !== JobCategory.ALL && job.category !== activeCategory) return false;
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesDesc = job.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [jobs, activeCategory, debouncedSearch]);

  // Подсчёт по категориям для filter chips
  const categoryCounts = useMemo(() => {
    const counts: Record<JobCategory, number> = {
      [JobCategory.ALL]: 0,
      [JobCategory.DEVELOPMENT]: 0,
      [JobCategory.DESIGN]: 0,
      [JobCategory.MARKETING]: 0,
      [JobCategory.COPYWRITING]: 0,
      [JobCategory.OTHER]: 0,
    };
    
    jobs.filter(j => j.status === JobStatus.OPEN).forEach(job => {
      counts[JobCategory.ALL]++;
      if (job.category in counts) {
        counts[job.category]++;
      }
    });
    
    return counts;
  }, [jobs]);

  // Lazy loading - показываем по 10 карточек и подгружаем ещё при скролле
  const { visibleItems: visibleJobs, loadMoreRef, hasMore } = useLazyLoadList(
    filteredJobs,
    10, // initial count
    8   // load more count
  );

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <div className="p-0 space-y-4">
        
        {/* === NEW JOBS BANNER (LIVE!) === */}
        <NewJobsBanner 
          count={newJobsCount} 
          onRefresh={applyPendingJobs}
          isConnected={isConnected}
          onEnableNotifications={enableNotifications}
        />

        {/* === HEADER === */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-4 px-4">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Лента заказов</h1>
              <ConnectionIndicator isConnected={isConnected} />
            </div>
            <button 
              onClick={() => setShowFilters(prev => !prev)}
              className={`p-2 rounded-full border transition-all ${
                showFilters 
                  ? 'bg-slate-800 border-slate-700 text-slate-400' 
                  : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
              }`}
            >
              <Filter size={16} />
            </button>
          </div>

          {/* Collapsible Filters */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showFilters ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Search */}
            <div className="relative py-2">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500" />
              </div>
              <input 
                type="text" 
                placeholder="Поиск по ключевым словам..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Categories with counts and gradient indicators */}
            <div className="relative">
              {/* Gradient fade right */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
              
              <div className="flex overflow-x-auto gap-2 pb-3 hide-scrollbar pr-6">
                {Object.keys(CATEGORY_LABELS).map((catKey) => {
                  const cat = catKey as JobCategory;
                  const isActive = activeCategory === cat;
                  const count = categoryCounts[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        triggerHaptic('selection');
                        setActiveCategory(cat);
                      }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all active:scale-95 ${
                        isActive 
                          ? 'bg-white text-slate-900 border-white' 
                          : CATEGORY_COLORS[cat]
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
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
          </div>
        </div>
        
        {/* === JOBS LIST === */}
        <div className="px-4 pb-20 space-y-4">
          {hasError ? (
            <EmptyState 
              type="error" 
              errorMessage="Не удалось загрузить заказы"
              onRetry={onRetry || refetch}
            />
          ) : isLoading ? (
            <JobListSkeleton count={4} />
          ) : filteredJobs.length === 0 ? (
            <EmptyState 
              type={debouncedSearch ? 'no-results' : 'no-jobs'} 
              searchQuery={debouncedSearch}
            />
          ) : (
            <>
            {visibleJobs.map((job, index) => {
              const isBookmarked = bookmarks.includes(job.id);
              const isExpanded = expandedJobs.includes(job.id);
              const isApplied = appliedJobs.includes(job.id);
              const isHighlighted = job.isHighlighted;
              
              const containerClasses = isHighlighted
                ? "highlighted-card"
                : "bg-slate-800/50 border-slate-700/50";
                
              return (
                <div 
                  key={job.id} 
                  className={`group relative overflow-hidden rounded-2xl p-4 border backdrop-blur-sm transition-all stagger-item ${containerClasses}`}
                  style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                >
                  {isHighlighted && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/20 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
                  )}

                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1 pr-14">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {CATEGORY_LABELS[job.category]}
                        </span>
                        {job.isPinned && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                            <Pin size={8} fill="currentColor" /> PIN
                          </span>
                        )}
                        {job.isUrgent && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 animate-pulse">
                            <Flame size={8} fill="currentColor" /> СРОЧНО
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-white leading-tight mt-1">
                        {job.title}
                      </h2>
                    </div>
                    
                    {/* Actions - with larger touch targets */}
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button 
                        onClick={(e) => handleShare(job, e)}
                        className="p-3 text-slate-500 hover:text-blue-400 transition-colors bg-slate-800/50 rounded-full hover:bg-slate-700 active:scale-90 touch-target"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          toggleBookmark(job.id, e);
                          if (!isBookmarked) triggerHaptic('success');
                        }}
                        className={`p-3 transition-colors bg-slate-800/50 rounded-full hover:bg-slate-700 active:scale-90 touch-target ${
                          isBookmarked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'
                        }`}
                      >
                        <Heart 
                          size={18} 
                          fill={isBookmarked ? "currentColor" : "none"} 
                          className={isBookmarked ? "animate-heart-beat" : ""} 
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="relative mb-4">
                    <p className={`text-sm text-slate-300 leading-relaxed whitespace-pre-line transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {job.description}
                    </p>
                    {job.description.length > 100 && (
                      <button 
                        onClick={() => toggleExpand(job.id)}
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

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 relative z-10">
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${isHighlighted ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {job.budget}
                      </span>
                      <div className="text-[10px] text-slate-500 flex items-center mt-1">
                        <Clock size={10} className="mr-1" />
                        {new Date(job.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleApplyClick(job)}
                      disabled={isApplied}
                      className={`flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg text-white shadow-lg transition-all ${
                        isApplied
                          ? 'bg-slate-700 cursor-not-allowed shadow-none'
                          : isHighlighted 
                            ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-600/20 active:scale-95' 
                              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 active:scale-95'
                      } ${!isApplied ? 'btn-bounce btn-glow' : ''}`}
                    >
                      {isApplied ? (
                        <>
                          <Check size={12} className="mr-2" />
                          Отправлен
                        </>
                      ) : (
                        <>
                          <Send size={12} className="mr-2" />
                          Откликнуться
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Загрузка...
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* === APPLY BOTTOM SHEET === */}
        <BottomSheet
          isOpen={!!applyingJob}
          onClose={() => {
            setApplyingJob(null);
            setCoverLetter('');
          }}
          title="Ваш отклик"
        >
          {applyingJob && (
            <div className="p-5 space-y-4">
              {/* Job preview */}
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                <div className="text-xs text-slate-500 mb-1">Вы откликаетесь на:</div>
                <div className="font-medium text-white text-sm truncate">{applyingJob.title}</div>
                <div className="text-emerald-400 text-sm font-mono mt-1">{applyingJob.budget}</div>
              </div>

              {/* Cover letter */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Сопроводительное письмо
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Почему вы подходите для этой задачи? Расскажите о своём опыте..."
                  rows={5}
                  autoFocus
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl 
                            text-white placeholder-slate-500 resize-none 
                            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {coverLetter.length < 10 
                      ? `Ещё ${10 - coverLetter.length} символов` 
                      : '✓ Готово к отправке'}
                  </span>
                  <span className={`text-xs ${coverLetter.length > 450 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {coverLetter.length}/500
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={submitProposal}
                disabled={isSending || coverLetter.length < 10}
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
                    Отправить отклик
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

export default JobsPage;
