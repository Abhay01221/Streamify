'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContentCard } from '@/components/content/content-card';
import { useFavorites, usePlanToWatch } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';

type Tab = 'favorites' | 'plantowatch';

function CardSkeleton() {
  return <div className="aspect-video bg-dark-card rounded-lg animate-pulse" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full text-center py-16">
      <p className="text-gray-400 text-lg">{message}</p>
    </div>
  );
}

export default function MyListsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('favorites');

  const {
    data: favorites,
    isLoading: loadingFavorites,
    error: errorFavorites,
  } = useFavorites();

  const {
    data: planToWatch,
    isLoading: loadingPlan,
    error: errorPlan,
  } = usePlanToWatch();

  const isLoading = activeTab === 'favorites' ? loadingFavorites : loadingPlan;
  const error = activeTab === 'favorites' ? errorFavorites : errorPlan;
  const items = activeTab === 'favorites' ? favorites : planToWatch;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">My Lists</h1>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-3 transition font-semibold border-b-2 ${
                activeTab === 'favorites'
                  ? 'border-primary text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Favorites ❤️
              {favorites && favorites.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('plantowatch')}
              className={`px-4 py-3 transition font-semibold border-b-2 ${
                activeTab === 'plantowatch'
                  ? 'border-primary text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Plan to Watch 📌
              {planToWatch && planToWatch.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {planToWatch.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          {error ? (
            <p className="text-red-400 text-center py-12">
              Failed to load your list. Please try again.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
              ) : items?.length === 0 ? (
                <EmptyState
                  message={
                    activeTab === 'favorites'
                      ? 'No favorites yet. Browse content and add some!'
                      : 'Your watchlist is empty. Start adding shows to watch later!'
                  }
                />
              ) : (
                items?.map((item) => (
                  <ContentCard
                    key={item.id}
                    id={item.contentId}
                    title={item.content.title}
                    posterUrl={item.content.posterUrl}
                    rating={item.content.imdbRating ?? undefined}
                    year={item.content.releaseYear}
                    badge={item.content.isPremium ? 'PREMIUM' : undefined}
                    onClick={() => router.push(`/watch/${item.contentId}`)}
                    onPlay={() => router.push(`/watch/${item.contentId}`)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
