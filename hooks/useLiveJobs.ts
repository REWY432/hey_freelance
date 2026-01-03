import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, api } from '../services/supabase';
import { Job, JobStatus, JobCategory } from '../types';
import { triggerHaptic } from '../services/telegram';

interface UseLiveJobsOptions {
  enabled?: boolean;
  onNewJob?: (job: Job) => void;
  onJobUpdated?: (job: Job) => void;
  onJobDeleted?: (jobId: string) => void;
  pollingIntervalMs?: number;
}

interface UseLiveJobsReturn {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  newJobsCount: number;
  pendingJobs: Job[];
  applyPendingJobs: () => void;
  isConnected: boolean;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

export function useLiveJobs(
  initialJobs: Job[],
  options: UseLiveJobsOptions = {}
): UseLiveJobsReturn {
  const { enabled = true, pollingIntervalMs = 25000 } = options;

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const jobsRef = useRef<Job[]>(initialJobs);
  const pendingRef = useRef<Job[]>([]);
  
  // Используем refs для коллбэков чтобы избежать переподключений
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Ref для отслеживания подписки
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Функция преобразования записи БД в Job
  const transformDbRecord = (record: any): Job => {
    return {
      id: record.id?.toString() || '',
      authorId: record.author_id,
      authorName: record.author_name || 'Unknown',
      authorUsername: record.author_username,
      title: record.title || '',
      description: record.description || '',
      budget: record.budget || 'Договорная',
      category: record.category || JobCategory.OTHER,
      status: record.status || JobStatus.OPEN,
      createdAt: record.created_at || new Date().toISOString(),
      isPinned: record.is_pinned || false,
      isHighlighted: record.is_highlighted || false,
      isUrgent: record.is_urgent || false,
      proposalsCount: record.proposals_count || 0
    };
  };

  // Применить pending заказы к основному списку
  const applyPendingJobs = useCallback(() => {
    if (pendingJobs.length === 0) return;
    
    triggerHaptic('medium');
    
    setJobs(prev => {
      const existingIds = new Set(prev.map(j => j.id));
      const newJobs = pendingJobs.filter(j => !existingIds.has(j.id));
      return [...newJobs, ...prev];
    });
    
    setPendingJobs([]);
    setNewJobsCount(0);
  }, [pendingJobs]);

  // Ручное обновление списка (для pull-to-refresh)
  const refetch = useCallback(async () => {
    try {
      const latest = await api.getJobs();
      setJobs(latest.filter(job => job.status === JobStatus.OPEN));
      setPendingJobs([]);
      setNewJobsCount(0);
      setLastUpdate(new Date());
      triggerHaptic('success');
    } catch (e) {
      console.error('Refetch failed', e);
      triggerHaptic('error');
    }
  }, []);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    pendingRef.current = pendingJobs;
  }, [pendingJobs]);

  const pollLatestJobs = useCallback(async () => {
    if (!enabled) return;
    try {
      const latest = await api.getJobs();
      const existingIds = new Set([
        ...jobsRef.current.map(j => j.id),
        ...pendingRef.current.map(j => j.id)
      ]);

      const newIncoming = latest.filter(
        (job) => job.status === JobStatus.OPEN && !existingIds.has(job.id)
      );

      if (newIncoming.length) {
        setPendingJobs(prev => [...newIncoming, ...prev]);
        setNewJobsCount(prev => prev + newIncoming.length);
        triggerHaptic('light');
        newIncoming.forEach(job => optionsRef.current.onNewJob?.(job));
      }

      setJobs(prev => {
        const latestMap = new Map(latest.map(j => [j.id, j]));
        const merged = prev
          .map(job => latestMap.get(job.id) || job)
          .filter(job => job.status === JobStatus.OPEN);
        return merged;
      });

      setLastUpdate(new Date());
    } catch (e) {
      console.warn('Fallback polling failed', e);
    }
  }, [enabled]);

  // Стабильная ссылка для интервала, чтобы избежать пересоздания
  const pollRef = useRef(pollLatestJobs);
  useEffect(() => {
    pollRef.current = pollLatestJobs;
  }, [pollLatestJobs]);

  // Подписка на Realtime - запускается ОДИН раз
  useEffect(() => {
    if (!enabled) return;
    
    // Предотвращаем двойную подписку
    if (isSubscribedRef.current) {
      console.log('⚠️ Уже подписаны, пропускаем...');
      return;
    }

    console.log('🔌 Подключаемся к Supabase Realtime...');
    isSubscribedRef.current = true;

    const channel = supabase
      .channel('live-jobs-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('🆕 Новый заказ:', payload.new);
          
          const newJob = transformDbRecord(payload.new);
          
          if (newJob.status === JobStatus.OPEN) {
            setPendingJobs(prev => [newJob, ...prev]);
            setNewJobsCount(prev => prev + 1);
            setLastUpdate(new Date());
            
            triggerHaptic('light');
            optionsRef.current.onNewJob?.(newJob);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('📝 Заказ обновлён:', payload.new);
          
          const updatedJob = transformDbRecord(payload.new);
          setLastUpdate(new Date());
          
          const oldStatus = payload.old?.status;
          
          if (oldStatus !== JobStatus.OPEN && updatedJob.status === JobStatus.OPEN) {
            setPendingJobs(prev => [updatedJob, ...prev]);
            setNewJobsCount(prev => prev + 1);
            triggerHaptic('light');
            optionsRef.current.onNewJob?.(updatedJob);
          } 
          else if (updatedJob.status === JobStatus.CLOSED) {
            setJobs(prev => prev.filter(j => j.id !== updatedJob.id));
            setPendingJobs(prev => prev.filter(j => j.id !== updatedJob.id));
          }
          else {
            setJobs(prev => 
              prev.map(job => 
                job.id === updatedJob.id ? updatedJob : job
              )
            );
            optionsRef.current.onJobUpdated?.(updatedJob);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('🗑 Заказ удалён:', payload.old);
          
          const deletedId = payload.old?.id?.toString();
          if (deletedId) {
            setJobs(prev => prev.filter(job => job.id !== deletedId));
            setPendingJobs(prev => prev.filter(job => job.id !== deletedId));
            setLastUpdate(new Date());
            optionsRef.current.onJobDeleted?.(deletedId);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime статус:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Подключено к Realtime!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Ошибка подключения к Realtime');
        }
      });

    subscriptionRef.current = channel;

    // Cleanup - только при полном размонтировании
    return () => {
      console.log('🔌 Отключаемся от Realtime...');
      isSubscribedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [enabled]); // Только enabled в зависимостях!

  // Резервный поллинг если live-канал недоступен
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (!isConnected) {
        pollRef.current();
      }
    }, pollingIntervalMs);

    return () => clearInterval(id);
  }, [enabled, isConnected, pollingIntervalMs]);

  // Синхронизация с initialJobs при первой загрузке
  useEffect(() => {
    if (initialJobs.length > 0 && jobs.length === 0) {
      setJobs(initialJobs);
    }
  }, [initialJobs]);

  return {
    jobs,
    setJobs,
    newJobsCount,
    pendingJobs,
    applyPendingJobs,
    isConnected,
    lastUpdate,
    refetch
  };
}

export default useLiveJobs;
