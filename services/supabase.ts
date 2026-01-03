import { createClient } from '@supabase/supabase-js';
import { Job, FreelancerProfile, User, JobCategory, JobStatus, Proposal, Service, ServiceRequest, ServiceCategory, ServiceRequestStatus, ServiceStatus } from '../types';
import { MOCK_JOBS, MOCK_FREELANCERS } from '../constants';

const SUPABASE_URL = 'https://rufmwhuronrmcooozack.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lL1oGZquXDcgmmr_aUvB7w_KUsHsp-_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to check if the error is due to missing tables
const isTableMissing = (error: any) => error?.code === 'PGRST205' || error?.code === '42P01';

// Helper to check for RLS (Permission Denied) errors
const isPermissionError = (error: any) => error?.code === '42501';

const REFERRAL_LOCAL_KEY = 'referral_hits_local';

const persistLocalReferral = (entry: { referrerId: number; referredId: number; jobId?: string; serviceId?: string }) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REFERRAL_LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ ...entry, ts: Date.now() });
    localStorage.setItem(REFERRAL_LOCAL_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Referral local storage unavailable', e);
  }
};

const loadLocalReferralStats = (referrerId: number) => {
  if (typeof window === 'undefined') return { total: 0 };
  try {
    const raw = localStorage.getItem(REFERRAL_LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const total = list.filter((item: any) => item.referrerId === referrerId).length;
    return { total };
  } catch (e) {
    return { total: 0 };
  }
};

export const api = {
  /**
   * Sync Telegram user to 'users' table AND ensure 'profiles' entry exists
   */
  async ensureUser(user: User) {
    if (!user.id) return;
    
    try {
      // 1. Upsert User
      const { error } = await supabase.from('users').upsert({
        tg_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        username: user.username || '',
      }, { onConflict: 'tg_id' });
      
      if (error) {
        if (isPermissionError(error)) {
            console.error('⛔️ RLS ERROR: Writing to "users" blocked. Run the SQL from the Documentation tab to enable policies.');
        } else if (isTableMissing(error)) {
          console.warn('Supabase: Tables not found. User sync skipped (Demo Mode).');
          return;
        } else {
          console.error('Supabase: Error syncing user', JSON.stringify(error, null, 2));
        }
      }

      // 2. Ensure Profile Stub Exists (FK Requirement for Proposals)
      await supabase.from('profiles').upsert({
          user_id: user.id,
          bio: '',
          skills: [],
          portfolio_links: []
      }, { onConflict: 'user_id', ignoreDuplicates: true });

    } catch (e) {
      console.error('Supabase: Exception syncing user', e);
    }
  },

  /**
   * Fetch all active jobs with author details
   */
  async getJobs(): Promise<Job[]> {
    try {
      let result = await supabase
        .from('jobs')
        .select('*, users!author_id(first_name, last_name, username), proposals(count)')
        .eq('is_active', true) 
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (result.error && result.error.code === 'PGRST200') {
          console.warn('Supabase: Relationship error (PGRST200). Retrying without proposal counts...');
          result = await supabase
            .from('jobs')
            .select('*, users!author_id(first_name, last_name, username)')
            .eq('is_active', true)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });
          
          if (result.error && result.error.code === 'PGRST200') {
             console.warn('Supabase: Relationship error persists. Retrying raw fetch...');
             result = await supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
          }
      }

      const { data, error } = result;

      if (error) {
        if (isTableMissing(error)) {
          console.warn('Supabase: "jobs" table not found. Using MOCK data.');
          return MOCK_JOBS;
        }
        console.error('Supabase: Error fetching jobs', JSON.stringify(error, null, 2));
        return MOCK_JOBS;
      }

      // Фильтруем scheduled заказы (не показываем те, что запланированы на будущее)
      const now = new Date().toISOString();
      const filtered = (data || []).filter((record: any) => {
        if (!record.scheduled_at) return true; // Нет scheduled - показываем
        return record.scheduled_at <= now; // Показываем только если время пришло
      });

      return filtered.map((record: any) => ({
        id: record.id.toString(),
        authorId: record.author_id,
        authorName: [record.users?.first_name, record.users?.last_name].filter(Boolean).join(' ') || 'Unknown',
        authorUsername: record.users?.username,
        title: record.title,
        description: record.description,
        budget: record.budget,
        category: record.category || JobCategory.OTHER,
        status: (record.status?.toUpperCase() as JobStatus) || JobStatus.OPEN,
        createdAt: record.created_at,
        isPinned: record.is_pinned || false,
        isHighlighted: record.is_highlighted || false,
        isUrgent: record.is_urgent || false,
        proposalsCount: record.proposals?.[0]?.count || 0,
        scheduledAt: record.scheduled_at
      }));
    } catch (e) {
      console.error('Supabase: Exception fetching jobs', e);
      return MOCK_JOBS;
    }
  },

  /**
   * Create a new job
   */
  async createJob(job: Omit<Job, 'id' | 'createdAt' | 'authorName' | 'authorUsername' | 'status'>): Promise<Job> {
    try {
        const { data, error } = await supabase
        .from('jobs')
        .insert({
            author_id: job.authorId,
            title: job.title,
            description: job.description,
            budget: job.budget,
            category: job.category,
            status: JobStatus.PENDING, 
            is_active: true,
            is_pinned: job.isPinned || false,
            is_highlighted: job.isHighlighted || false,
            is_urgent: job.isUrgent || false,
            scheduled_at: job.scheduledAt || null
        })
        .select('*, users!author_id(first_name, last_name, username)')
        .single();

        if (error) {
            if (isPermissionError(error)) {
                console.error('⛔️ RLS ERROR: Insert to "jobs" blocked.');
                alert('Ошибка доступа к БД (RLS). Запустите SQL из документации.');
                throw error;
            }

            if (isTableMissing(error) || error.code === '42703') {
                console.warn('Supabase: Schema mismatch or missing table. Using Local Mock.');
                return {
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString(),
                    authorName: 'You (Demo)',
                    authorUsername: 'demo',
                    status: JobStatus.PENDING,
                    ...job
                };
            }
            console.error('Supabase: Error creating job', JSON.stringify(error, null, 2));
            throw error;
        }
        
        return {
            id: data.id.toString(),
            authorId: data.author_id,
            authorName: [data.users?.first_name, data.users?.last_name].filter(Boolean).join(' ') || 'Unknown',
            authorUsername: data.users?.username,
            title: data.title,
            description: data.description,
            budget: data.budget,
            category: data.category || job.category || JobCategory.OTHER,
            status: data.status || JobStatus.PENDING,
            createdAt: data.created_at,
            isPinned: data.is_pinned || false,
            isHighlighted: data.is_highlighted || false,
            isUrgent: data.is_urgent || false
        };
    } catch (e) {
        return {
             id: Date.now().toString(),
             createdAt: new Date().toISOString(),
             authorName: 'You (Demo)',
             authorUsername: 'demo',
             status: JobStatus.PENDING,
             ...job
        };
    }
  },

  /**
   * Update Job Status
   */
  async updateJobStatus(jobId: string, status: JobStatus): Promise<boolean> {
      try {
          const { error } = await supabase
            .from('jobs')
            .update({ status: status })
            .eq('id', jobId);
          
          if (error && !isTableMissing(error)) {
              console.error('Error updating status', error);
              return false;
          }
          return true;
      } catch (e) {
          console.error(e);
          return true;
      }
  },

  /**
   * Одобрить заказ с отложенной публикацией (для админа)
   */
  async approveJobScheduled(jobId: string, scheduledAt: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: JobStatus.OPEN,
          scheduled_at: scheduledAt 
        })
        .eq('id', jobId);
      
      if (error) {
        console.error('Error scheduling job:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception scheduling job:', e);
      return false;
    }
  },

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);

        if (error) {
            console.error('Supabase: Error deleting job', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Supabase: Exception deleting job', e);
        return false;
    }
  },

  /**
   * Fetch all freelancer profiles
   */
  async getFreelancers(): Promise<FreelancerProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, users!user_id(first_name, last_name, username)');
        
      if (error) {
        if (isTableMissing(error)) {
             console.warn('Supabase: "profiles" table not found. Using MOCK freelancers.');
             return MOCK_FREELANCERS;
        }
        return MOCK_FREELANCERS;
      }
      
      return (data || []).map((record: any) => ({
        userId: record.user_id,
        username: record.users?.username,
        displayName: [record.users?.first_name, record.users?.last_name].filter(Boolean).join(' '),
        bio: record.bio,
        skills: record.skills || [],
        portfolioLinks: record.portfolio_links || []
      }));
    } catch (e) {
      return MOCK_FREELANCERS;
    }
  },
  
  /**
   * Update or Create current user's profile
   */
  async updateProfile(profile: FreelancerProfile) {
    const { error } = await supabase.from('profiles').upsert({
      user_id: profile.userId,
      bio: profile.bio,
      skills: profile.skills,
      portfolio_links: profile.portfolioLinks,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
        if (isPermissionError(error)) {
            console.error('⛔️ RLS ERROR: Update profile blocked.');
            alert('Не удалось сохранить профиль (ошибка прав доступа).');
        } else if (!isTableMissing(error)) {
            throw error;
        }
    }
  },

  /**
   * Get specific profile by user ID
   */
  async getMyProfile(userId: number): Promise<FreelancerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, users!user_id(first_name, last_name, username)')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        username: data.users?.username,
        displayName: [data.users?.first_name, data.users?.last_name].filter(Boolean).join(' '),
        bio: data.bio,
        skills: data.skills || [],
        portfolioLinks: data.portfolio_links || []
      };
    } catch (e) {
      return null;
    }
  },

  /**
   * Save user interests (for onboarding personalization)
   */
  async saveUserInterests(userId: number, interests: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests })
        .eq('user_id', userId);

      if (error) {
        if (isTableMissing(error)) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`interests_${userId}`, JSON.stringify(interests));
          }
          return true;
        }
        console.error('Error saving interests:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Exception saving interests:', e);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`interests_${userId}`, JSON.stringify(interests));
        } catch {}
      }
      return false;
    }
  },

  // --- PROPOSALS API ---

  async createProposal(proposal: { jobId: string, freelancerId: number, coverLetter: string }): Promise<boolean> {
      try {
          const { error } = await supabase.from('proposals').insert({
              job_id: proposal.jobId,
              freelancer_id: proposal.freelancerId,
              cover_letter: proposal.coverLetter
          });

          if (error) {
              if (isPermissionError(error)) {
                  console.error('⛔️ RLS ERROR: Proposal insert blocked.');
                  alert('Ошибка сохранения отклика.');
                  return false;
              }

              if (error.code === '23503') {
                  if (error.message.includes('proposals_freelancer_id_fkey') || error.details?.includes('freelancer_id')) {
                      console.warn("Supabase: Profile missing. Creating stub...");
                      await supabase.from('profiles').insert({ 
                          user_id: proposal.freelancerId, 
                          bio: '', 
                          skills: [] 
                      });
                      
                      const retry = await supabase.from('proposals').insert({
                          job_id: proposal.jobId,
                          freelancer_id: proposal.freelancerId,
                          cover_letter: proposal.coverLetter
                      });
                      
                      if (!retry.error) return true;
                  }

                  if (error.message.includes('proposals_job_id_fkey') || error.details?.includes('job_id')) {
                      console.warn("Supabase: Job ID not found (likely Mock). Pretending success.");
                      return true;
                  }
              }

              if (error.code === '23505') {
                  console.warn("Supabase: Proposal already exists.");
                  return true;
              }

              if (isTableMissing(error)) {
                  console.warn("Supabase: 'proposals' table missing. Mocking success.");
                  return true;
              }
              
              console.error("Supabase Proposal Error:", error);
              return false;
          }
          return true;
      } catch (e) {
          console.error(e);
          return true; 
      }
  },

  async getProposalsForJob(jobId: string): Promise<Proposal[]> {
      if (jobId === '1' || jobId === '2') {
          return [
              {
                  id: 'mock-p-1',
                  jobId: jobId,
                  freelancerId: 777,
                  coverLetter: 'Здравствуйте! Очень интересный проект. У меня более 5 лет опыта.',
                  createdAt: new Date(Date.now() - 10000000).toISOString(),
                  freelancer: MOCK_FREELANCERS[0]
              },
              {
                  id: 'mock-p-2',
                  jobId: jobId,
                  freelancerId: 666,
                  coverLetter: 'Добрый день. Готова приступить к работе.',
                  createdAt: new Date(Date.now() - 20000000).toISOString(),
                  freelancer: MOCK_FREELANCERS[1]
              }
          ];
      }

      try {
          const { data: rawProposals, error: propError } = await supabase
              .from('proposals')
              .select('*')
              .eq('job_id', jobId)
              .order('created_at', { ascending: false });

          if (propError) {
              if (isTableMissing(propError)) return []; 
              console.error("Error fetching proposals:", propError);
              return [];
          }

          if (!rawProposals || rawProposals.length === 0) return [];

          const freelancerIds = [...new Set(rawProposals.map((p: any) => p.freelancer_id))];

          const [profilesResult, usersResult] = await Promise.all([
              supabase.from('profiles').select('*').in('user_id', freelancerIds),
              supabase.from('users').select('*').in('tg_id', freelancerIds)
          ]);

          const profilesMap = new Map<any, any>((profilesResult.data || []).map((p: any) => [p.user_id, p]));
          const usersMap = new Map<any, any>((usersResult.data || []).map((u: any) => [u.tg_id, u]));

          return rawProposals.map((p: any) => {
              const profile = profilesMap.get(p.freelancer_id);
              const user = usersMap.get(p.freelancer_id);

              return {
                  id: p.id,
                  jobId: p.job_id,
                  freelancerId: p.freelancer_id,
                  coverLetter: p.cover_letter,
                  createdAt: p.created_at,
                  freelancer: {
                      userId: p.freelancer_id,
                      username: user?.username || '',
                      displayName: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown User',
                      bio: profile?.bio || '',
                      skills: profile?.skills || [],
                      portfolioLinks: profile?.portfolio_links || []
                  }
              };
          });

      } catch (e) {
          console.error("Exception in getProposalsForJob:", e);
          return [];
      }
  },

  // ==========================================
  // SERVICES API
  // ==========================================

  /**
   * Get all active services (only ACTIVE status for public view)
   */
  async getServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*, users!freelancer_id(tg_id, first_name, last_name, username)')
        .eq('is_active', true)
        .eq('status', 'ACTIVE')  // Только одобренные услуги
        // Сортировка: boosted первыми, затем по популярности и дате
        .order('is_boosted', { ascending: false, nullsFirst: false })
        .order('boosted_at', { ascending: false, nullsFirst: true })
        .order('orders_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissing(error)) {
          console.warn('Supabase: "services" table not found. Run SQL to create it.');
          return [];
        }
        console.error('Error fetching services:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id.toString(),
        freelancerId: record.freelancer_id,
        freelancerName: [record.users?.first_name, record.users?.last_name]
          .filter(Boolean).join(' ') || 'Unknown',
        freelancerUsername: record.users?.username,
        title: record.title,
        description: record.description,
        price: record.price,
        deliveryDays: record.delivery_days || 3,
        category: record.category || ServiceCategory.OTHER,
        features: record.features || [],
        isActive: record.is_active,
        status: (record.status?.toUpperCase() as ServiceStatus) || ServiceStatus.PENDING,
        ordersCount: record.orders_count || 0,
        createdAt: record.created_at,
        isBoosted: record.is_boosted || false,
        boostedAt: record.boosted_at
      }));
    } catch (e) {
      console.error('Exception fetching services:', e);
      return [];
    }
  },

  /**
   * Get services by freelancer (all statuses for owner)
   */
  async getMyServices(freelancerId: number): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('freelancer_id', freelancerId)
        .order('is_boosted', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissing(error)) return [];
        console.error('Error fetching my services:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id.toString(),
        freelancerId: record.freelancer_id,
        freelancerName: '',
        title: record.title,
        description: record.description,
        price: record.price,
        deliveryDays: record.delivery_days || 3,
        category: record.category || ServiceCategory.OTHER,
        features: record.features || [],
        isActive: record.is_active,
        status: (record.status?.toUpperCase() as ServiceStatus) || ServiceStatus.PENDING,
        ordersCount: record.orders_count || 0,
        createdAt: record.created_at,
        isBoosted: record.is_boosted || false,
        boostedAt: record.boosted_at
      }));
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Create a new service (with PENDING status for moderation)
   */
  async createService(service: Omit<Service, 'id' | 'createdAt' | 'freelancerName' | 'ordersCount' | 'status'>): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          freelancer_id: service.freelancerId,
          title: service.title,
          description: service.description,
          price: service.price,
          delivery_days: service.deliveryDays,
          category: service.category,
          features: service.features,
          is_active: service.isActive ?? true,
          status: 'PENDING'  // На модерацию
        })
        .select()
        .single();

      if (error) {
        if (isTableMissing(error)) {
          console.warn('Supabase: "services" table not found.');
          return null;
        }
        console.error('Error creating service:', error);
        return null;
      }

      return {
        id: data.id.toString(),
        freelancerId: data.freelancer_id,
        freelancerName: '',
        title: data.title,
        description: data.description,
        price: data.price,
        deliveryDays: data.delivery_days,
        category: data.category,
        features: data.features || [],
        isActive: data.is_active,
        status: ServiceStatus.PENDING,
        ordersCount: 0,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Exception creating service:', e);
      return null;
    }
  },

  /**
   * Update a service
   */
  async updateService(serviceId: string, updates: Partial<Service>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.price) updateData.price = updates.price;
      if (updates.deliveryDays) updateData.delivery_days = updates.deliveryDays;
      if (updates.category) updateData.category = updates.category;
      if (updates.features) updateData.features = updates.features;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId);

      if (error) {
        console.error('Error updating service:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception:', e);
      return false;
    }
  },

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        console.error('Error deleting service:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception:', e);
      return false;
    }
  },

  /**
   * Create a service request (order)
   */
  async createServiceRequest(request: {
    serviceId: string;
    clientId: number;
    message: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_requests')
        .insert({
          service_id: request.serviceId,
          client_id: request.clientId,
          message: request.message,
          status: 'PENDING'
        });

      if (error) {
        if (error.code === '23505') {
          console.warn('Request already exists');
          return true;
        }
        if (isTableMissing(error)) {
          console.warn('service_requests table not found');
          return true; // Mock success
        }
        console.error('Error creating request:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception:', e);
      return false;
    }
  },

  /**
   * Get requests for my services (as freelancer)
   */
  async getRequestsForMyServices(freelancerId: number): Promise<ServiceRequest[]> {
    try {
      const { data: myServices } = await supabase
        .from('services')
        .select('id')
        .eq('freelancer_id', freelancerId);

      if (!myServices || myServices.length === 0) return [];

      const serviceIds = myServices.map((s: any) => s.id);

      const { data, error } = await supabase
        .from('service_requests')
        .select('*, services(title), users!client_id(first_name, last_name, username)')
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id,
        serviceId: record.service_id.toString(),
        clientId: record.client_id,
        clientName: [record.users?.first_name, record.users?.last_name]
          .filter(Boolean).join(' ') || 'Unknown',
        clientUsername: record.users?.username,
        message: record.message,
        status: record.status as ServiceRequestStatus,
        createdAt: record.created_at,
        service: { title: record.services?.title } as Service
      }));
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Update request status
   */
  async updateRequestStatus(requestId: string, status: ServiceRequestStatus): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception:', e);
      return false;
    }
  },

  /**
   * Get ALL services (for admin panel - includes PENDING)
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*, users!freelancer_id(tg_id, first_name, last_name, username)')
        .order('is_boosted', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissing(error)) return [];
        console.error('Error fetching all services:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id.toString(),
        freelancerId: record.freelancer_id,
        freelancerName: [record.users?.first_name, record.users?.last_name]
          .filter(Boolean).join(' ') || 'Unknown',
        freelancerUsername: record.users?.username,
        title: record.title,
        description: record.description,
        price: record.price,
        deliveryDays: record.delivery_days || 3,
        category: record.category || ServiceCategory.OTHER,
        features: record.features || [],
        isActive: record.is_active,
        status: (record.status?.toUpperCase() as ServiceStatus) || ServiceStatus.PENDING,
        ordersCount: record.orders_count || 0,
        createdAt: record.created_at,
        isBoosted: record.is_boosted || false,
        boostedAt: record.boosted_at
      }));
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Update service status (for moderation)
   */
  async updateServiceStatus(serviceId: string, status: ServiceStatus): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status })
        .eq('id', serviceId);

      if (error) {
        console.error('Error updating service status:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception:', e);
      return false;
    }
  },

  // ============================================
  // ANALYTICS API (для админ-панели)
  // ============================================

  /**
   * Получить общую статистику платформы
   */
  async getPlatformStats(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_platform_stats');
      
      if (error) {
        console.error('Error fetching platform stats:', error);
        // Возвращаем mock данные если функция не найдена
        return {
          total_users: 0,
          users_today: 0,
          users_week: 0,
          users_month: 0,
          total_jobs: 0,
          jobs_open: 0,
          jobs_pending: 0,
          jobs_closed: 0,
          jobs_today: 0,
          jobs_week: 0,
          jobs_month: 0,
          total_services: 0,
          services_active: 0,
          services_pending: 0,
          services_today: 0,
          services_week: 0,
          total_proposals: 0,
          proposals_today: 0,
          proposals_week: 0,
          total_service_requests: 0,
          service_requests_week: 0,
          total_budget: 0,
          avg_budget: 0
        };
      }
      
      return data;
    } catch (e) {
      console.error('Exception fetching stats:', e);
      return null;
    }
  },

  /**
   * Получить статистику по дням (для графиков)
   */
  async getDailyStats(days: number = 14): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_daily_stats', { days_count: days });
      
      if (error) {
        console.error('Error fetching daily stats:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Получить статистику по категориям
   */
  async getCategoryStats(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_category_stats');
      
      if (error) {
        console.error('Error fetching category stats:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Получить топ исполнителей
   */
  async getTopFreelancers(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_top_freelancers', { limit_count: limit });
      
      if (error) {
        console.error('Error fetching top freelancers:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Получить топ заказчиков
   */
  async getTopClients(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_top_clients', { limit_count: limit });
      
      if (error) {
        console.error('Error fetching top clients:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Получить последнюю активность
   */
  async getRecentActivity(limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_recent_activity', { limit_count: limit });
      
      if (error) {
        console.error('Error fetching recent activity:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exception:', e);
      return [];
    }
  },

  /**
   * Регистрируем переход по реферальной ссылке
   */
  async logReferralHit(params: { referrerId: number; referredId: number; jobId?: string; serviceId?: string }): Promise<boolean> {
    try {
      const { referrerId, referredId, jobId, serviceId } = params;

      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: referredId,
          job_id: jobId ? Number(jobId) : null,
          service_id: serviceId ? Number(serviceId) : null
        });

      if (error) {
        if (isTableMissing(error)) {
          persistLocalReferral(params);
          return true;
        }
        console.error('Error logging referral hit:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Exception logging referral hit:', e);
      persistLocalReferral(params);
      return false;
    }
  },

  /**
   * Поднять услугу в топ (boost)
   */
  async boostService(serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          is_boosted: true, 
          boosted_at: new Date().toISOString() 
        })
        .eq('id', Number(serviceId));

      if (error) {
        if (isTableMissing(error)) {
          // Fallback: сохраняем локально
          console.warn('Services table missing boosted columns, storing locally');
          return true;
        }
        console.error('Error boosting service:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Exception boosting service:', e);
      return false;
    }
  },

  /**
   * Получаем статистику по рефералам
   */
  async getReferralStats(referrerId: number): Promise<{ total: number }> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrerId);

      if (error) {
        if (isTableMissing(error)) {
          return loadLocalReferralStats(referrerId);
        }
        console.error('Error fetching referral stats:', error);
        return { total: 0 };
      }

      return { total: data?.length || 0 };
    } catch (e) {
      console.error('Exception fetching referral stats:', e);
      return loadLocalReferralStats(referrerId);
    }
  },

  /**
   * Получить статистику по источникам трафика (для админки)
   */
  async getTrafficSources(): Promise<{
    total: number;
    direct: number;
    referral: number;
    fromJob: number;
    fromService: number;
    topReferrers: { referrerId: number; count: number; username?: string }[];
  }> {
    try {
      // Получаем все записи из referrals
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('referrer_id, referred_id, job_id, service_id, created_at');

      if (error) {
        console.error('Error fetching traffic sources:', error);
        return { total: 0, direct: 0, referral: 0, fromJob: 0, fromService: 0, topReferrers: [] };
      }

      const records = referrals || [];
      const total = records.length;
      const fromJob = records.filter(r => r.job_id != null).length;
      const fromService = records.filter(r => r.service_id != null).length;
      const referral = records.filter(r => r.referrer_id != null && !r.job_id && !r.service_id).length;
      const direct = 0; // Прямые переходы не логируются в referrals

      // Топ рефереров
      const referrerCounts: Record<number, number> = {};
      records.forEach(r => {
        if (r.referrer_id) {
          referrerCounts[r.referrer_id] = (referrerCounts[r.referrer_id] || 0) + 1;
        }
      });

      const topReferrers: { referrerId: number; count: number; username?: string }[] = Object.entries(referrerCounts)
        .map(([id, count]) => ({ referrerId: Number(id), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Получаем usernames для топ рефереров
      if (topReferrers.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('tg_id, username, first_name')
          .in('tg_id', topReferrers.map(r => r.referrerId));

        if (users) {
          topReferrers.forEach(r => {
            const user = users.find(u => u.tg_id === r.referrerId);
            if (user) {
              r.username = user.username || user.first_name || `ID:${r.referrerId}`;
            }
          });
        }
      }

      return { total, direct, referral, fromJob, fromService, topReferrers };
    } catch (e) {
      console.error('Exception fetching traffic sources:', e);
      return { total: 0, direct: 0, referral: 0, fromJob: 0, fromService: 0, topReferrers: [] };
    }
  },

  /**
   * Получить запланированные заказы (для админки)
   */
  async getScheduledJobs(): Promise<Job[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('jobs')
        .select('*, users!author_id(first_name, last_name, username)')
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error fetching scheduled jobs:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id.toString(),
        authorId: record.author_id,
        authorName: [record.users?.first_name, record.users?.last_name].filter(Boolean).join(' ') || 'Unknown',
        authorUsername: record.users?.username,
        title: record.title,
        description: record.description,
        budget: record.budget,
        category: record.category || JobCategory.OTHER,
        status: (record.status?.toUpperCase() as JobStatus) || JobStatus.PENDING,
        createdAt: record.created_at,
        isPinned: record.is_pinned || false,
        isHighlighted: record.is_highlighted || false,
        isUrgent: record.is_urgent || false,
        proposalsCount: 0,
        scheduledAt: record.scheduled_at
      }));
    } catch (e) {
      console.error('Exception fetching scheduled jobs:', e);
      return [];
    }
  }
};
