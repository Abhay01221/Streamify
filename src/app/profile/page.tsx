'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { formatDuration, formatDate, getInitials } from '@/lib/utils';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

type Section = 'settings' | 'history' | 'lists' | 'subscription';

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 bg-dark-card rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<Section>('settings');

  const {
    data: watchHistory,
    isLoading: loadingHistory,
    error: historyError,
  } = useWatchHistory();

  const user = session?.user as any;
  const plan = user?.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS | undefined;
  const planDetails = plan ? SUBSCRIPTION_PLANS[plan] : null;

  const navItems: { key: Section; label: string }[] = [
    { key: 'settings', label: 'Profile Settings' },
    { key: 'history', label: 'Watch History' },
    { key: 'lists', label: 'My Lists' },
    { key: 'subscription', label: 'Subscription' },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-dark-card rounded-lg p-6 border border-gray-800">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
                  {user?.name ? getInitials(user.name) : 'U'}
                </div>
                <h2 className="text-xl font-bold text-center mb-1">
                  {user?.name ?? 'User'}
                </h2>
                <p className="text-gray-400 text-center text-sm mb-2">
                  {user?.email ?? ''}
                </p>
                {planDetails && (
                  <p className="text-center text-xs text-primary font-semibold mb-6">
                    {planDetails.name} Plan
                  </p>
                )}
                <nav className="space-y-1">
                  {navItems.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={`w-full text-left px-4 py-2 rounded transition text-sm ${
                        activeSection === key
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'hover:bg-dark-800 text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-2">

              {/* Profile Settings */}
              {activeSection === 'settings' && (
                <div className="bg-dark-card rounded-lg p-8 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
                  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <input
                        type="text"
                        defaultValue={user?.name ?? ''}
                        className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-white focus:outline-none focus:border-primary transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email ?? ''}
                        disabled
                        className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-gray-400 opacity-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                    </div>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>
              )}

              {/* Watch History */}
              {activeSection === 'history' && (
                <div className="bg-dark-card rounded-lg p-8 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-6">Watch History</h2>
                  {loadingHistory ? (
                    <HistorySkeleton />
                  ) : historyError ? (
                    <p className="text-red-400">Failed to load watch history.</p>
                  ) : watchHistory?.length === 0 ? (
                    <p className="text-gray-400">You haven&apos;t watched anything yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {watchHistory?.map((item) => {
                        const progress = item.content.durationMins > 0
                          ? Math.min(100, Math.round((item.progressSeconds / (item.content.durationMins * 60)) * 100))
                          : 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/watch/${item.contentId}`)}
                            className="flex items-center gap-4 p-3 rounded-lg border border-gray-800 hover:border-primary transition cursor-pointer group"
                          >
                            {/* Poster */}
                            <div className="w-20 h-12 rounded overflow-hidden shrink-0 bg-gray-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.content.posterUrl}
                                alt={item.content.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate group-hover:text-primary transition">
                                {item.content.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatDate(item.watchedAt)}
                              </p>
                              {/* Progress bar */}
                              <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden w-full">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-400">
                                {formatDuration(Math.round(item.progressSeconds / 60))} watched
                              </p>
                              {item.completed && (
                                <span className="text-xs text-green-400">✓ Completed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* My Lists shortcut */}
              {activeSection === 'lists' && (
                <div className="bg-dark-card rounded-lg p-8 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-4">My Lists</h2>
                  <p className="text-gray-400 mb-6">
                    Manage your favorites and watchlist from the dedicated page.
                  </p>
                  <button
                    onClick={() => router.push('/mylist')}
                    className="bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                  >
                    Go to My Lists →
                  </button>
                </div>
              )}

              {/* Subscription */}
              {activeSection === 'subscription' && (
                <div className="bg-dark-card rounded-lg p-8 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-6">Subscription</h2>
                  {planDetails ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
                        <div>
                          <p className="font-bold text-lg">{planDetails.name}</p>
                          <p className="text-gray-400 text-sm">
                            {planDetails.price === 0
                              ? 'Free Trial'
                              : `$${planDetails.price}/month`}
                          </p>
                        </div>
                        <span className="text-primary font-semibold text-sm bg-primary/10 px-3 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {planDetails.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="text-green-400">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => router.push('/plans')}
                        className="mt-4 bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400">No active subscription found.</p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
