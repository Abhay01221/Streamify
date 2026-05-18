'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { VideoPlayer } from '@/components/content/video-player';
import { ContentCard } from '@/components/content/content-card';
import { useContentById, useContent } from '@/hooks/useContent';
import { formatDuration } from '@/lib/utils';

function WatchSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="aspect-video bg-dark-card rounded-lg animate-pulse mb-8" />
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-4">
          <div className="h-8 bg-dark-card rounded animate-pulse w-2/3" />
          <div className="h-4 bg-dark-card rounded animate-pulse w-1/3" />
          <div className="h-24 bg-dark-card rounded animate-pulse" />
        </div>
        <div className="bg-dark-card rounded-lg p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: content, isLoading, error } = useContentById(id);
  // Grab a few items for the "Related" sidebar (same type, exclude current)
  const { data: allContent } = useContent();
  const related = allContent
    ?.filter((c) => c.id !== id && c.type === content?.type)
    .slice(0, 5);

  // Pick the best available video source (highest quality HLS)
  const videoSrc =
    content?.videoSources?.sort((a, b) => b.quality - a.quality)[0]?.hlsUrl ??
    content?.trailerUrl ??
    '';

  // Resume position: use watch history if available (passed via query param
  // or could be wired from useWatchHistory — kept simple here as seconds)
  const startAt = 0; // extend later: read from useWatchHistory data

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-dark-900">
          <WatchSkeleton />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !content) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">
              {error ? 'Failed to load content.' : 'Content not found.'}
            </p>
            <button
              onClick={() => router.back()}
              className="text-primary hover:underline"
            >
              ← Go back
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">

          {/* Video Player */}
          <div className="mb-8">
            {videoSrc ? (
              <VideoPlayer
                src={videoSrc}
                title={content.title}
                startAt={startAt}
                contentId={content.id}
                durationMins={content.durationMins}
              />
            ) : (
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <p className="text-gray-400">No video source available yet.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Content Info */}
            <div className="lg:col-span-3">
              <h1 className="text-3xl font-bold mb-3">{content.title}</h1>
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className="text-gray-400">{content.releaseYear}</span>
                {content.imdbRating && (
                  <span className="text-yellow-400">⭐ {content.imdbRating}</span>
                )}
                {content.malRating && (
                  <span className="text-blue-400">MAL {content.malRating}</span>
                )}
                <span className="text-gray-400">{formatDuration(content.durationMins)}</span>
                {content.ageRating && (
                  <span className="border border-gray-500 px-2 py-0.5 rounded text-gray-300 text-xs">
                    {content.ageRating.replace('_', '-')}
                  </span>
                )}
                {content.isPremium && (
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-semibold">
                    PREMIUM
                  </span>
                )}
              </div>

              {/* Genres */}
              {content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {content.genres.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1 rounded-full bg-dark-card border border-gray-700 text-xs text-gray-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-gray-300 leading-relaxed mb-6">{content.description}</p>

              {/* Episodes list for series/anime/kdrama */}
              {content.episodes && content.episodes.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Episodes</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {content.episodes.map((ep) => (
                      <div
                        key={ep.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-dark-card border border-gray-800 hover:border-primary transition cursor-pointer"
                      >
                        {ep.thumbnailUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ep.thumbnailUrl}
                            alt={ep.title}
                            className="w-24 h-14 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            S{ep.season} E{ep.episodeNumber} — {ep.title}
                          </p>
                          {ep.description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {ep.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatDuration(ep.durationMins)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Related Content Sidebar */}
            <div className="bg-dark-card rounded-lg p-4 border border-gray-800 h-fit">
              <h3 className="font-semibold mb-4">More Like This</h3>
              {related && related.length > 0 ? (
                <div className="space-y-3">
                  {related.map((item) => (
                    <ContentCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      posterUrl={item.posterUrl}
                      rating={item.imdbRating ?? undefined}
                      year={item.releaseYear}
                      onClick={() => router.push(`/watch/${item.id}`)}
                      onPlay={() => router.push(`/watch/${item.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No related content found.</p>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
