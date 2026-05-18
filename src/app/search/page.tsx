'use client';

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContentCard } from '@/components/content/content-card';
import { useSearch } from '@/hooks/useContent';
import { useSearchStore } from '@/store';
import { useRouter } from 'next/navigation';

const CONTENT_TYPES = [
  { label: 'All', value: '' },
  { label: 'Movies', value: 'MOVIE' },
  { label: 'TV Shows', value: 'SERIES' },
  { label: 'Anime', value: 'ANIME' },
  { label: 'K-Dramas', value: 'KDRAMA' },
];

function CardSkeleton() {
  return <div className="aspect-video bg-dark-card rounded-lg animate-pulse" />;
}

export default function SearchPage() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, filters, setFilters } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isLoading, error, isFetching } = useSearch({
    q: searchQuery,
    type: filters.type,
    genre: filters.genre,
  });

  const showSkeleton = isLoading || isFetching;
  const hasQuery = searchQuery.length > 1;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">

          {/* Search Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, shows, anime, K-dramas..."
              className="w-full px-6 py-4 rounded-lg bg-dark-card border border-gray-600 text-white focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {CONTENT_TYPES.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setFilters({ ...filters, type: value || undefined })}
                className={`px-4 py-2 rounded-full border transition text-sm ${
                  (filters.type ?? '') === value
                    ? 'bg-primary border-primary text-white'
                    : 'bg-dark-card border-gray-600 hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Results */}
          {!hasQuery ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">Start typing to search...</p>
            </div>
          ) : error ? (
            <p className="text-red-400 text-center py-12">Search failed. Please try again.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {showSkeleton
                    ? 'Searching...'
                    : `Results for "${searchQuery}"${data?.length ? ` (${data.length})` : ''}`}
                </h2>
              </div>

              {!showSkeleton && data?.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-lg">No results found for &quot;{searchQuery}&quot;</p>
                  <p className="text-sm mt-2">Try a different search term or remove filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {showSkeleton
                    ? Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
                    : data?.map((item) => (
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
            </>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
