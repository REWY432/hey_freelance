export interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface WebAppInitData {
  query_id?: string;
  user?: User;
  auth_date?: number;
  hash?: string;
}

export enum JobCategory {
  ALL = 'ALL',
  DEVELOPMENT = 'DEVELOPMENT',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  COPYWRITING = 'COPYWRITING',
  OTHER = 'OTHER'
}

export enum JobStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

// Domain Types
export interface Job {
  id: string;
  authorId: number;
  authorUsername?: string;
  authorName: string;
  title: string;
  description: string;
  budget: string;
  category: JobCategory;
  status: JobStatus;
  createdAt: string;
  isPinned?: boolean;
  isHighlighted?: boolean;
  isUrgent?: boolean;
  proposalsCount?: number;
  scheduledAt?: string;  // Запланированная публикация
}

export interface FreelancerProfile {
  userId: number;
  username?: string;
  displayName: string;
  bio: string;
  skills: string[];
  portfolioLinks: string[];
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: number;
  coverLetter: string;
  createdAt: string;
  freelancer?: FreelancerProfile;
}

// ==========================================
// УСЛУГИ (Services) - Kwork-style
// ==========================================

export enum ServiceCategory {
  ALL = 'ALL',
  DEVELOPMENT = 'DEVELOPMENT',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  COPYWRITING = 'COPYWRITING',
  OTHER = 'OTHER'
}

export enum ServiceStatus {
  PENDING = 'PENDING',   // На модерации
  ACTIVE = 'ACTIVE',     // Одобрена
  REJECTED = 'REJECTED'  // Отклонена
}

export enum ServiceRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export interface Service {
  id: string;
  freelancerId: number;
  freelancerName: string;
  freelancerUsername?: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  category: ServiceCategory;
  features: string[];
  isActive: boolean;
  status: ServiceStatus;  // Статус модерации
  ordersCount: number;
  isOnline?: boolean;
  createdAt: string;
  isBoosted?: boolean;
  boostedAt?: string;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  clientId: number;
  clientName?: string;
  clientUsername?: string;
  message: string;
  status: ServiceRequestStatus;
  createdAt: string;
  service?: Service;
}

// ==========================================
// NAVIGATION
// ==========================================

export enum ViewState {
  JOBS = 'JOBS',
  SERVICES = 'SERVICES',      // Новая вкладка!
  CREATE_JOB = 'CREATE_JOB',
  CREATE_SERVICE = 'CREATE_SERVICE',  // Создание услуги
  FREELANCERS = 'FREELANCERS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN'
}
