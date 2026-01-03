// components/JobDetailModal.tsx
//
// Модальное окно с детальной информацией о заказе
// Использует BottomSheet для формы отклика
// и StickyHeader для бюджета при скролле

import React, { useState, useEffect, useRef } from 'react';
import { Job, JobStatus } from '../types';
import { api } from '../services/supabase';
import { getTelegramUser, triggerHaptic, openTelegramChat } from '../services/telegram';
import { CATEGORY_LABELS } from '../constants';
import BottomSheet from './BottomSheet';
import { 
  X, Send, Clock, User, Briefcase, DollarSign, 
  Pin, Flame, Zap, Loader2, AlertCircle, Share2,
  CheckCircle, ExternalLink, ChevronLeft
} from 'lucide-react';

interface JobDetailModalProps {
  jobId: string;
  onClose: () => void;
  onApply?: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ jobId, onClose, onApply }) => {
  const user = getTelegramUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Data state
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);
  
  // Apply state
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  
  useEffect(() => {
    loadJob();
  }, [jobId]);

  // Scroll listener для sticky header
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowStickyHeader(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loading]);
  
  const loadJob = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const jobs = await api.getJobs();
      const found = jobs.find(j => j.id === jobId || j.id === String(jobId));
      
      if (found) {
        setJob(found);
      } else {
        setError('Заказ не найден или был удалён');
      }
    } catch (e) {
      console.error(e);
      setError('Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApplySheet = () => {
    if (!job) return;
    
    if (job.authorId === user.id) {
      triggerHaptic('error');
      return;
    }
    
    triggerHaptic('medium');
    setShowApplySheet(true);
  };
  
  const handleApply = async () => {
    if (!job || submitting) return;
    
    if (coverLetter.length < 10) {
      triggerHaptic('error');
      alert('Напишите сопроводительное письмо (минимум 10 символов)');
      return;
    }
    
    setSubmitting(true);
    triggerHaptic('medium');
    
    try {
      const success = await api.createProposal({
        jobId: job.id,
        freelancerId: user.id,
        coverLetter
      });
      
      if (success) {
        triggerHaptic('success');
        setApplied(true);
        setShowApplySheet(false);
        onApply?.();
      } else {
        alert('Ошибка отправки отклика');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleShare = () => {
    if (!job) return;
    triggerHaptic('selection');
    
    const text = `🔥 ${job.title}\n💰 ${job.budget}\n\nОткликнуться:`;
    const url = `https://t.me/TeleLanceBot/app?startapp=job_${job.id}`;
    
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };
  
  const handleContactAuthor = () => {
    if (!job?.authorUsername) {
      alert('Username автора скрыт');
      return;
    }
    triggerHaptic('medium');
    openTelegramChat(job.authorUsername);
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Загрузка заказа...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !job) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center border border-slate-700">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Упс!</h2>
          <p className="text-slate-400 mb-6">{error || 'Заказ не найден'}</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }
  
  // Success state after applying
  if (applied) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center border border-slate-700">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Отклик отправлен!</h2>
          <p className="text-slate-400 mb-6">
            Заказчик получит уведомление и сможет связаться с вами
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500"
          >
            Отлично!
          </button>
        </div>
      </div>
    );
  }
  
  const isOwner = job.authorId === user.id;
  const isClosed = job.status === JobStatus.CLOSED;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col">
      
      {/* === STICKY HEADER === */}
      {showStickyHeader && (
        <div className="absolute top-0 left-0 right-0 z-50
                       bg-slate-900/95 backdrop-blur-md border-b border-slate-800
                       px-4 py-3 flex items-center justify-between
                       animate-in slide-in-from-top duration-200">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Бюджет</div>
            <div className="text-lg font-bold text-emerald-400">{job.budget}</div>
          </div>
          
          {!isOwner && !isClosed && (
            <button 
              onClick={handleOpenApplySheet}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl
                        shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
            >
              Откликнуться
            </button>
          )}
        </div>
      )}

      {/* === MAIN HEADER === */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        
        <button
          onClick={handleShare}
          className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>
      
      {/* === SCROLLABLE CONTENT === */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-5 pb-32">
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {job.isPinned && (
              <span className="flex items-center gap-1 text-xs font-bold 
                             bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full 
                             border border-blue-500/20">
                <Pin size={12} /> Закреплён
              </span>
            )}
            {job.isUrgent && (
              <span className="flex items-center gap-1 text-xs font-bold 
                             bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full 
                             border border-rose-500/20 animate-pulse">
                <Flame size={12} /> Срочно
              </span>
            )}
            {job.isHighlighted && (
              <span className="flex items-center gap-1 text-xs font-bold 
                             bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full 
                             border border-yellow-500/20">
                <Zap size={12} /> VIP
              </span>
            )}
            {isClosed && (
              <span className="text-xs font-bold bg-slate-700 text-slate-400 px-2 py-1 rounded-full">
                Закрыт
              </span>
            )}
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4 leading-tight">
            {job.title}
          </h1>
          
          {/* Meta */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <User size={16} />
              <span>{job.authorName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Briefcase size={16} />
              <span>{CATEGORY_LABELS[job.category]}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Clock size={16} />
              <span>{new Date(job.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
          
          {/* Budget Card */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 
                         rounded-2xl p-4 mb-6 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl 
                            flex items-center justify-center">
                <DollarSign className="text-emerald-400" size={24} />
              </div>
              <div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">
                  Бюджет
                </div>
                <div className="text-2xl font-bold text-white">{job.budget}</div>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Описание
            </h3>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>
          </div>
          
          {/* Author Contact */}
          {job.authorUsername && !isOwner && (
            <button
              onClick={handleContactAuthor}
              className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl 
                        text-slate-300 font-medium flex items-center justify-center gap-2 
                        hover:bg-slate-700 active:scale-[0.98] transition-all"
            >
              <ExternalLink size={18} />
              Написать заказчику
            </button>
          )}
        </div>
      </div>

      {/* === BOTTOM ACTION BAR === */}
      {!isOwner && !isClosed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 
                       bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent
                       pt-10">
          <button
            onClick={handleOpenApplySheet}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl 
                      flex items-center justify-center gap-2 
                      shadow-lg shadow-blue-500/20 
                      hover:bg-blue-500 active:scale-[0.98] transition-all"
          >
            <Send size={18} />
            Откликнуться
          </button>
        </div>
      )}
      
      {/* Owner Message */}
      {isOwner && (
        <div className="absolute bottom-0 left-0 right-0 p-4 
                       bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-10">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Это ваш заказ</p>
          </div>
        </div>
      )}
      
      {/* Closed Message */}
      {isClosed && !isOwner && (
        <div className="absolute bottom-0 left-0 right-0 p-4 
                       bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-10">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Этот заказ закрыт</p>
          </div>
        </div>
      )}

      {/* === APPLY BOTTOM SHEET === */}
      <BottomSheet
        isOpen={showApplySheet}
        onClose={() => setShowApplySheet(false)}
        title="Ваш отклик"
      >
        <div className="p-5 space-y-4">
          {/* Job preview */}
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Вы откликаетесь на:</div>
            <div className="font-medium text-white text-sm truncate">{job.title}</div>
            <div className="text-emerald-400 text-sm font-mono mt-1">{job.budget}</div>
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

          {/* Submit button */}
          <button
            onClick={handleApply}
            disabled={submitting || coverLetter.length < 10}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl 
                      flex items-center justify-center gap-2 
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      hover:bg-blue-500 active:scale-[0.98] transition-all"
          >
            {submitting ? (
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

          {/* Safe area padding for iOS */}
          <div className="h-4" />
        </div>
      </BottomSheet>
    </div>
  );
};

export default JobDetailModal;
