import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  id: string;
  title: string;
  posterUrl: string;
  rating?: number;
  year?: number;
  onPlay?: () => void;
  onAddToFavorites?: () => void;
  onClick?: () => void;
  badge?: string;
}

export function ContentCard({
  id,
  title,
  posterUrl,
  rating,
  year,
  onPlay,
  onAddToFavorites,
  onClick,
  badge,
}: ContentCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-dark-card">
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 right-2 bg-primary px-2 py-1 rounded text-xs font-bold text-white">
            {badge}
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-4">
            {onPlay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="bg-white text-black p-3 rounded-full hover:bg-gray-200 transition"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
            {onAddToFavorites && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToFavorites();
                }}
                className="bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition border border-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3">
        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition">
          {title}
        </h3>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
          {rating && <span>⭐ {rating}</span>}
          {year && <span>{year}</span>}
        </div>
      </div>
    </motion.div>
  );
}
