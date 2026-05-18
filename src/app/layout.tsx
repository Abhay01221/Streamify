import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RootLayoutClient from './layout-client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Streamify - Stream Everything. Anywhere.',
  description: 'Full-stack video streaming platform for movies, TV shows, anime, and K-dramas',
  keywords: 'streaming, netflix, video, movies, anime, kdrama',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-dark-900 text-white`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
