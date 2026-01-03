import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Proposal, FreelancerProfile } from '../types';
import { triggerHaptic } from '../services/telegram';

interface UseLiveProposalsOptions {
  enabled?: boolean;
  onNewProposal?: (proposal: Proposal) => void;
}

interface UseLiveProposalsReturn {
  proposals: Proposal[];
  setProposals: React.Dispatch<React.SetStateAction<Proposal[]>>;
  newProposal: Proposal | null;
  clearNewProposal: () => void;
  isConnected: boolean;
  proposalsCount: number;
}

export function useLiveProposals(
  jobId: string | null,
  initialProposals: Proposal[] = [],
  options: UseLiveProposalsOptions = {}
): UseLiveProposalsReturn {
  const { enabled = true, onNewProposal } = options;

  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [newProposal, setNewProposal] = useState<Proposal | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clearNewProposal = useCallback(() => {
    setNewProposal(null);
  }, []);

  // Подписка на Realtime для конкретного заказа
  useEffect(() => {
    if (!enabled || !jobId) return;

    console.log(`🔌 Подписываемся на отклики для заказа ${jobId}...`);

    const channel = supabase
      .channel(`proposals-${jobId}`)
      // Новый отклик
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposals',
          filter: `job_id=eq.${jobId}`
        },
        async (payload) => {
          console.log('📨 Новый отклик:', payload.new);
          
          // Загружаем данные о фрилансере
          const freelancerData = await fetchFreelancerData(payload.new.freelancer_id);
          
          const proposal: Proposal = {
            id: payload.new.id,
            jobId: payload.new.job_id?.toString() || jobId,
            freelancerId: payload.new.freelancer_id,
            coverLetter: payload.new.cover_letter || '',
            createdAt: payload.new.created_at || new Date().toISOString(),
            freelancer: freelancerData
          };
          
          // Добавляем в список
          setProposals(prev => [proposal, ...prev]);
          setNewProposal(proposal);
          
          triggerHaptic('success');
          onNewProposal?.(proposal);
        }
      )
      // Удаление отклика
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'proposals',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('🗑 Отклик удалён:', payload.old);
          
          setProposals(prev => 
            prev.filter(p => p.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        console.log(`📡 Proposals Realtime статус:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log(`🔌 Отписываемся от откликов заказа ${jobId}...`);
      channel.unsubscribe();
    };
  }, [enabled, jobId, onNewProposal]);

  // Sync с initialProposals
  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  return {
    proposals,
    setProposals,
    newProposal,
    clearNewProposal,
    isConnected,
    proposalsCount: proposals.length
  };
}

// Вспомогательная функция для загрузки данных фрилансера
async function fetchFreelancerData(userId: number): Promise<FreelancerProfile | undefined> {
  try {
    const [profileResult, userResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('*').eq('tg_id', userId).single()
    ]);

    if (!userResult.data) return undefined;

    return {
      userId: userId,
      username: userResult.data.username || '',
      displayName: [userResult.data.first_name, userResult.data.last_name]
        .filter(Boolean)
        .join(' ') || 'Unknown',
      bio: profileResult.data?.bio || '',
      skills: profileResult.data?.skills || [],
      portfolioLinks: profileResult.data?.portfolio_links || []
    };
  } catch (e) {
    console.error('Error fetching freelancer data:', e);
    return undefined;
  }
}

// Хук для подписки на ВСЕ отклики пользователя (для заказчика)
export function useLiveMyProposals(
  userId: number,
  myJobIds: string[],
  options: UseLiveProposalsOptions = {}
): {
  newProposalNotification: { proposal: Proposal; jobTitle: string } | null;
  clearNotification: () => void;
  totalNewCount: number;
} {
  const { enabled = true, onNewProposal } = options;
  
  const [notification, setNotification] = useState<{ 
    proposal: Proposal; 
    jobTitle: string 
  } | null>(null);
  const [totalNewCount, setTotalNewCount] = useState(0);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!enabled || myJobIds.length === 0) return;

    console.log('🔌 Подписываемся на отклики для моих заказов...');

    const channel = supabase
      .channel('my-proposals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposals'
        },
        async (payload) => {
          const jobId = payload.new.job_id?.toString();
          
          // Проверяем что это отклик на наш заказ
          if (!myJobIds.includes(jobId)) return;
          
          console.log('📨 Новый отклик на мой заказ:', payload.new);
          
          // Загружаем данные о заказе и фрилансере
          const [jobResult, freelancerData] = await Promise.all([
            supabase.from('jobs').select('title').eq('id', jobId).single(),
            fetchFreelancerData(payload.new.freelancer_id)
          ]);
          
          const proposal: Proposal = {
            id: payload.new.id,
            jobId: jobId,
            freelancerId: payload.new.freelancer_id,
            coverLetter: payload.new.cover_letter || '',
            createdAt: payload.new.created_at || new Date().toISOString(),
            freelancer: freelancerData
          };
          
          setNotification({
            proposal,
            jobTitle: jobResult.data?.title || 'Заказ'
          });
          setTotalNewCount(prev => prev + 1);
          
          triggerHaptic('success');
          onNewProposal?.(proposal);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, myJobIds, onNewProposal]);

  return {
    newProposalNotification: notification,
    clearNotification,
    totalNewCount
  };
}

export default useLiveProposals;
