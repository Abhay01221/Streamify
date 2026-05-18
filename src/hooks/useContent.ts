import { useQuery } from '@tanstack/react-query';
import {
  fetchContent,
  fetchTrending,
  fetchContentByType,
  fetchContentById,
  fetchSearch,
  fetchFavorites,
  fetchPlanToWatch,
  SearchParams,
} from '@/lib/api';

/** Latest content — /browse "What's Popular" */
export function useContent() {
  return useQuery({
    queryKey: ['content'],
    queryFn: fetchContent,
  });
}

/** Trending content — /browse "Trending Now" */
export function useTrending() {
  return useQuery({
    queryKey: ['content', 'trending'],
    queryFn: fetchTrending,
  });
}

/** Category pages — /browse/movies, /browse/anime, etc. */
export function useContentByType(type: string) {
  return useQuery({
    queryKey: ['content', 'type', type],
    queryFn: () => fetchContentByType(type),
    enabled: !!type,
  });
}

/** Watch page — /watch/[id] */
export function useContentById(id: string) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => fetchContentById(id),
    enabled: !!id,
  });
}

/**
 * Search page — only fires when query.length > 1.
 * Pass the full SearchParams object; the hook handles the enabled guard.
 */
export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['content', 'search', params],
    queryFn: () => fetchSearch(params),
    enabled: (params.q?.length ?? 0) > 1,
  });
}

/** My List — favorites tab */
export function useFavorites() {
  return useQuery({
    queryKey: ['user', 'favorites'],
    queryFn: fetchFavorites,
  });
}

/** My List — plan to watch tab */
export function usePlanToWatch() {
  return useQuery({
    queryKey: ['user', 'plantowatch'],
    queryFn: fetchPlanToWatch,
  });
}
