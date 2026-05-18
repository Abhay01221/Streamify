'use client';

import { motion } from 'framer-motion';

interface ContentRowProps {
  title: string;
  items: any[];
  onItemClick?: (id: string) => void;
}

export function ContentRow({ title, items, onItemClick }: ContentRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-12"
    >
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 pb-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id || i}
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 w-48 cursor-pointer"
              onClick={() => onItemClick?.(item.id)}
            >
              <div className="aspect-video bg-dark-card rounded-lg overflow-hidden group">
                <div className="w-full h-full bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center group-hover:brightness-110 transition">
                  <span className="text-white font-bold text-xl">
                    {item.title || `Item ${i + 1}`}
                  </span>
                </div>
              </div>
              <p className="text-sm mt-2 truncate text-gray-300">
                {item.title}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
