import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateProgressPayload {
  contentId: string;
  episodeId?: string | null;
  progressSeconds: number;
  completed: boolean;
}

async function postProgress(payload: UpdateProgressPayload): Promise<void> {
  const res = await fetch('/api/watch-progress', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to save progress: ${res.status}`);
  }
}

/**
 * Mutation hook for persisting watch progress.
 * Invalidates the watch-history query on success so the profile page
 * reflects the latest progress without a manual refresh.
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postProgress,
    onSuccess: () => {
      // Silently refresh watch history cache in the background
      queryClient.invalidateQueries({ queryKey: ['user', 'watch-history'] });
    },
    // Fire-and-forget — don't surface save errors to the user
    onError: (err) => {
      console.warn('[useUpdateProgress] Failed to save progress:', err);
    },
  });
}
