'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContentCard } from '@/components/content/content-card';
import { useContentByType } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';

const GENRES = ['Action', 'Comedy', 'Drama', 'Mystery', 'Thriller', 'Fantasy'];

function CardSkeleton() {
  return <div className="aspect-video bg-dark-card rounded-lg animate-pulse" />;
}

export default function TVShowsPage() {
  const router = useRouter();
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const { data, isLoading, error } = useContentByType('SERIES');

  const filtered = activeGenre
    ? data?.filter((item) => item.genres.includes(activeGenre))
    : data;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">TV Shows</h1>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
                  className={`px-4 py-2 rounded-full border transition text-sm ${
                    activeGenre === genre
                      ? 'bg-primary border-primary text-white'
                      : 'bg-dark-card border-gray-600 hover:border-primary'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="text-red-400 text-center py-12">Failed to load TV shows. Please try again.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {isLoading
                ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
                : filtered?.length === 0
                ? (
                  <p className="col-span-full text-center text-gray-400 py-12">
                    No TV shows found{activeGenre ? ` in ${activeGenre}` : ''}.
                  </p>
                )
                : filtered?.map((item) => (
                    <ContentCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      posterUrl={item.posterUrl}
                      rating={item.imdbRating ?? undefined}
                      year={item.releaseYear}
                      badge={item.isPremium ? 'PREMIUM' : undefined}
                      onClick={() => router.push(`/watch/${item.id}`)}
                      onPlay={() => router.push(`/watch/${item.id}`)}
                    />
                  ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
