import { useQuery } from '@tanstack/react-query';
import { fetchWatchHistory } from '@/lib/api';

/** Watch history for the profile page — /api/watch-progress */
export function useWatchHistory() {
  return useQuery({
    queryKey: ['user', 'watch-history'],
    queryFn: fetchWatchHistory,
  });
}
