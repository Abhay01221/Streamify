'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUpdateProgress } from '@/hooks/useWatchProgress';

// Plyr ships its own CSS — import once at the component level.
// Next.js will bundle this through its CSS pipeline.
import 'plyr/dist/plyr.css';

export interface VideoPlayerProps {
  /** HLS manifest URL (.m3u8) or any direct video URL */
  src: string;
  title: string;
  /** Resume position in seconds */
  startAt?: number;
  /** Content ID passed to the progress mutation */
  contentId?: string;
  /** Episode ID passed to the progress mutation (series/anime) */
  episodeId?: string | null;
  /** Total duration in minutes — used to decide "completed" threshold */
  durationMins?: number;
}

const PROGRESS_INTERVAL_MS = 15_000; // save every 15 s
const COMPLETED_THRESHOLD = 0.9;     // 90 % watched → mark completed

export function VideoPlayer({
  src,
  title,
  startAt = 0,
  contentId,
  episodeId,
  durationMins,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep mutable refs so the interval closure always sees the latest values
  // without triggering re-renders.
  const plyrRef = useRef<import('plyr') | null>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);

  const { mutate: saveProgress } = useUpdateProgress();

  // ------------------------------------------------------------------
  // Helper: persist current position
  // ------------------------------------------------------------------
  function flushProgress(video: HTMLVideoElement) {
    if (!contentId) return;
    const progressSeconds = Math.floor(video.currentTime);
    const totalSeconds = (durationMins ?? 0) * 60;
    const completed =
      totalSeconds > 0
        ? video.currentTime / totalSeconds >= COMPLETED_THRESHOLD
        : false;

    saveProgress({ contentId, episodeId: episodeId ?? null, progressSeconds, completed });
  }

  // ------------------------------------------------------------------
  // Main effect — runs whenever src changes (e.g. episode switch)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    let destroyed = false;

    async function init() {
      // Dynamically import so SSR never touches these browser-only libs
      const [PlyrModule, HlsModule] = await Promise.all([
        import('plyr'),
        import('hls.js'),
      ]);

      if (destroyed) return;

      const Plyr = PlyrModule.default;
      const Hls = HlsModule.default;

      // ----------------------------------------------------------------
      // 1. Wire up HLS or fall back to native
      // ----------------------------------------------------------------
      const isHls =
        src.includes('.m3u8') ||
        src.startsWith('blob:') ||
        // treat any URL without a known extension as potentially HLS
        (!src.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) && src.includes('.m3u8'));

      if (isHls && Hls.isSupported()) {
        // MSE path — Chrome, Firefox, Edge
        const hls = new Hls({
          startLevel: -1,          // auto quality selection
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (destroyed) return;
          if (startAt > 0) {
            video.currentTime = startAt;
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[VideoPlayer] HLS fatal error:', data.type, data.details);
          }
        });
      } else if (
        isHls &&
        video.canPlayType('application/vnd.apple.mpegurl')
      ) {
        // Native HLS path — Safari / iOS
        video.src = src;
        video.addEventListener(
          'loadedmetadata',
          () => {
            if (startAt > 0) video.currentTime = startAt;
          },
          { once: true }
        );
      } else {
        // Plain MP4 / WebM fallback
        video.src = src;
        if (startAt > 0) {
          video.addEventListener(
            'loadedmetadata',
            () => { video.currentTime = startAt; },
            { once: true }
          );
        }
      }

      // ----------------------------------------------------------------
      // 2. Mount Plyr on top of the <video> element
      // ----------------------------------------------------------------
      const plyr = new Plyr(video, {
        // Cast to `any` for `title` — the bundled .d.ts for plyr@3 omits it
        // but it is a valid runtime option documented at https://plyr.io
        ...(title ? { title } : {}),
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'mute',
          'volume',
          'fullscreen',
        ],
        // Disable Plyr's own keyboard shortcuts so they don't conflict
        // with the page when the player isn't focused.
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
        // Let hls.js handle quality — don't show Plyr's quality menu
        quality: { default: 0, options: [] },
      });
      plyrRef.current = plyr;

      // ----------------------------------------------------------------
      // 3. Track play/pause state for the progress interval
      // ----------------------------------------------------------------
      plyr.on('play', () => { isPlayingRef.current = true; });
      plyr.on('pause', () => { isPlayingRef.current = false; });
      plyr.on('ended', () => {
        isPlayingRef.current = false;
        // Save a final "completed" progress entry
        flushProgress(video);
      });

      // ----------------------------------------------------------------
      // 4. Start the 15-second progress interval
      // ----------------------------------------------------------------
      if (contentId) {
        progressIntervalRef.current = setInterval(() => {
          if (isPlayingRef.current && !video.paused && !video.ended) {
            flushProgress(video);
          }
        }, PROGRESS_INTERVAL_MS);
      }
    }

    init();

    // ----------------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------------
    return () => {
      destroyed = true;

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Final progress save on unmount (e.g. user navigates away)
      if (videoRef.current && contentId && videoRef.current.currentTime > 0) {
        flushProgress(videoRef.current);
      }

      if (plyrRef.current) {
        try { plyrRef.current.destroy(); } catch { /* ignore */ }
        plyrRef.current = null;
      }

      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch { /* ignore */ }
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]); // re-init only when the source URL changes

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-black rounded-lg overflow-hidden"
    >
      {/* Plyr wraps this element — keep it clean, no React-managed attributes */}
      <video
        ref={videoRef}
        className="w-full"
        playsInline
        // title is set via Plyr options; aria-label covers accessibility
        aria-label={title}
      />
    </motion.div>
  );
}
