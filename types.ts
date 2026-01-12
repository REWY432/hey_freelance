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
// NOTIFICATIONS
// ==========================================

export enum NotificationType {
  NEW_PROPOSAL = 'NEW_PROPOSAL',           // Новый отклик на заказ
  SERVICE_REQUEST = 'SERVICE_REQUEST',     // Заявка на услугу
  JOB_APPROVED = 'JOB_APPROVED',           // Заказ одобрен
  JOB_REJECTED = 'JOB_REJECTED',           // Заказ отклонён
  SERVICE_APPROVED = 'SERVICE_APPROVED',   // Услуга одобрена
  SERVICE_REJECTED = 'SERVICE_REJECTED',   // Услуга отклонена
}

export interface AppNotification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  // Ссылки на объекты
  jobId?: string;
  serviceId?: string;
  proposalId?: string;
  requestId?: string;
}

// ==========================================
// ПАРТНЁРСКИЕ КАНАЛЫ (White-label)
// ==========================================

export enum ChannelJobStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  DELETED = 'deleted'
}

export interface Channel {
  id: string;
  channelId: number;         // Telegram channel ID
  channelUsername?: string;  // @username
  channelTitle: string;      // Название из TG
  ownerId: number;
  categories: JobCategory[]; // Фильтр категорий
  minBudget: number;         // Мин. бюджет (0 = все)
  isActive: boolean;
  subscribersCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelJob {
  id: string;
  jobId: string;
  channelId: string;
  telegramMessageId?: number;
  status: ChannelJobStatus;
  publishedAt?: string;
  createdAt: string;
  // Joined data
  channel?: Channel;
  job?: Job;
}

// ==========================================
// NAVIGATION
// ==========================================

export enum ViewState {
  JOBS = 'JOBS',
  SERVICES = 'SERVICES',
  CREATE_JOB = 'CREATE_JOB',
  CREATE_SERVICE = 'CREATE_SERVICE',
  FREELANCERS = 'FREELANCERS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  CHANNEL_CONNECT = 'CHANNEL_CONNECT',     // Подключение канала
  CHANNEL_DASHBOARD = 'CHANNEL_DASHBOARD'  // Статистика канала
}
