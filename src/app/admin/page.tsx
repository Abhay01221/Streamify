import { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Streamify',
};

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Total Users', value: '1,234', icon: '👥' },
              { label: 'Total Content', value: '456', icon: '🎬' },
              { label: 'Monthly Revenue', value: '$12,345', icon: '💰' },
              { label: 'Active Subscribers', value: '789', icon: '⭐' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-dark-card rounded-lg p-6 border border-gray-800"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Content */}
            <div className="lg:col-span-2 bg-dark-card rounded-lg p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Upload New Content</h2>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-white focus:outline-none focus:border-primary">
                      <option>Movie</option>
                      <option>Series</option>
                      <option>Anime</option>
                      <option>K-Drama</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Release Year
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-gray-600 text-white focus:outline-none focus:border-primary"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-primary text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Upload Content
                </button>
              </form>
            </div>

            {/* Recent Activity */}
            <div className="bg-dark-card rounded-lg p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: 'New user signup', time: '2 mins ago' },
                  { action: 'Content uploaded', time: '1 hour ago' },
                  { action: 'Subscription created', time: '3 hours ago' },
                  { action: 'Payment received', time: '5 hours ago' },
                ].map((item, i) => (
                  <div key={i} className="pb-4 border-b border-gray-700">
                    <p className="text-sm">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
