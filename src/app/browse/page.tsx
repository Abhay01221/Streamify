'use client';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContentCard } from '@/components/content/content-card';
import { useContent, useTrending } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';

function CardSkeleton() {
  return <div className="aspect-video bg-dark-card rounded-lg animate-pulse" />;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="col-span-full py-8 text-center text-red-400 text-sm">
      {message}
    </div>
  );
}

export default function BrowsePage() {
  const router = useRouter();
  const { data: popular, isLoading: loadingPopular, error: errorPopular } = useContent();
  const { data: trending, isLoading: loadingTrending, error: errorTrending } = useTrending();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">

          {/* What's Popular */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-8">What&apos;s Popular</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {loadingPopular
                ? Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
                : errorPopular
                ? <ErrorMessage message="Failed to load content. Please try again." />
                : popular?.map((item) => (
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
          </div>

          {/* Trending Now */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Trending Now</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {loadingTrending
                ? Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
                : errorTrending
                ? <ErrorMessage message="Failed to load trending content." />
                : trending?.map((item) => (
                    <ContentCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      posterUrl={item.posterUrl}
                      rating={item.imdbRating ?? undefined}
                      year={item.releaseYear}
                      badge="TRENDING"
                      onClick={() => router.push(`/watch/${item.id}`)}
                      onPlay={() => router.push(`/watch/${item.id}`)}
                    />
                  ))}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
