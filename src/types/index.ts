// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  subscriptionPlan: 'FREE_TRIAL' | 'BASIC' | 'STANDARD' | 'PREMIUM';
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';
  trialStart?: Date;
  trialEnd?: Date;
  trialUsed: boolean;
  createdAt: Date;
}

// Content types
export type ContentType = 'MOVIE' | 'SERIES' | 'ANIME' | 'KDRAMA';

export interface Content {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: ContentType;
  genres: string[];
  language: string;
  releaseYear: number;
  durationMins: number;
  imdbRating?: number;
  malRating?: number;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string;
  isPremium: boolean;
  ageRating?: 'G' | 'PG' | 'PG_13' | 'R' | 'NC_17';
  createdAt: Date;
}

export interface Episode {
  id: string;
  contentId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description?: string;
  durationMins: number;
  thumbnailUrl?: string;
  hlsUrl?: string;
  skipIntroStart?: number;
  skipIntroEnd?: number;
}

export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  episodeId?: string;
  progressSeconds: number;
  completed: boolean;
  watchedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  contentId: string;
  addedAt: Date;
}

export interface PlanToWatch {
  id: string;
  userId: string;
  contentId: string;
  addedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
