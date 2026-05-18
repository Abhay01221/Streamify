/**
 * Shared fetcher utilities for React Query.
 * All functions return the `data` field from the API response directly.
 */

import { Content, WatchHistory, Favorite, PlanToWatch } from '@/types';

// ---------------------------------------------------------------------------
// Types that mirror API response shapes
// ---------------------------------------------------------------------------

export interface ContentDetail extends Content {
  episodes: import('@/types').Episode[];
  videoSources: {
    id: string;
    quality: number;
    hlsUrl: string;
    fileSizeMb: number;
    language: string;
    isDubbed: boolean;
  }[];
  subtitles: {
    id: string;
    language: string;
    label: string;
    vttUrl: string;
  }[];
}

export interface WatchHistoryItem extends WatchHistory {
  content: Content;
}

export interface FavoriteItem extends Favorite {
  content: Content;
}

export interface PlanToWatchItem extends PlanToWatch {
  content: Content;
}

export interface SearchParams {
  q?: string;
  type?: string;
  genre?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Base fetcher — throws on non-ok responses so React Query treats them as errors
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  // All our API routes wrap data in { success, data }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Content fetchers
// ---------------------------------------------------------------------------

/** Fetch latest content (used by /browse "What's Popular") */
export function fetchContent(): Promise<Content[]> {
  return apiFetch<Content[]>('/api/content');
}

/** Fetch trending content (used by /browse "Trending Now") */
export function fetchTrending(): Promise<Content[]> {
  return apiFetch<Content[]>('/api/content/trending');
}

/** Fetch content filtered by type (MOVIE | SERIES | ANIME | KDRAMA) */
export function fetchContentByType(type: string): Promise<Content[]> {
  return apiFetch<Content[]>(`/api/content/category?type=${type}`);
}

/** Fetch a single content item with episodes, sources, and subtitles */
export function fetchContentById(id: string): Promise<ContentDetail> {
  return apiFetch<ContentDetail>(`/api/content/${id}`);
}

/** Search content with optional filters */
export function fetchSearch(params: SearchParams): Promise<Content[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.type) qs.set('type', params.type);
  if (params.genre) qs.set('genre', params.genre);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetch<Content[]>(`/api/content/search?${qs.toString()}`);
}

// ---------------------------------------------------------------------------
// User fetchers (require auth — will throw 401 if not logged in)
// ---------------------------------------------------------------------------

export function fetchWatchHistory(): Promise<WatchHistoryItem[]> {
  return apiFetch<WatchHistoryItem[]>('/api/watch-progress');
}

export function fetchFavorites(): Promise<FavoriteItem[]> {
  return apiFetch<FavoriteItem[]>('/api/user/favorites');
}

export function fetchPlanToWatch(): Promise<PlanToWatchItem[]> {
  return apiFetch<PlanToWatchItem[]>('/api/user/plantowatch');
}
