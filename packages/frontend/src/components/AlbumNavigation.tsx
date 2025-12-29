'use client';

import { motion } from 'framer-motion';
import { Category } from '@gaestefotos/shared';
import * as LucideIcons from 'lucide-react';
import { Folder } from 'lucide-react';

interface AlbumNavigationProps {
  categories: Category[];
  selectedAlbum: string | null;
  onAlbumSelect: (categoryId: string | null) => void;
  totalPhotos?: number;
}

export default function AlbumNavigation({
  categories,
  selectedAlbum,
  onAlbumSelect,
  totalPhotos = 0,
}: AlbumNavigationProps) {
  const getIcon = (iconKey?: string | null) => {
    if (!iconKey) return Folder;
    const Comp = (LucideIcons as any)[String(iconKey)];
    return typeof Comp === 'function' ? Comp : Folder;
  };

  const allAlbums = [
    { id: null, name: 'Alle', photoCount: totalPhotos },
    ...categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      photoCount: 0, // Would need to be fetched from API
      iconKey: cat.iconKey ?? null,
    })),
  ];

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-md mx-auto px-4 py-3">
        {/* Horizontal Scrollable Album Navigation */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {allAlbums.map((album, index) => {
            const isSelected = selectedAlbum === album.id;
            
            return (
              <motion.button
                key={album.id || 'all'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAlbumSelect(album.id)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px] ${
                  isSelected ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {/* Album Icon - Instagram Stories Style */}
                <div
                  className={`relative w-14 h-14 rounded-full p-0.5 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 scale-110'
                      : 'bg-gray-200'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {album.id ? (
                      // Category with image or icon
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        {(() => {
                          const IconComp = getIcon((album as any).iconKey);
                          return <IconComp className="w-6 h-6 text-purple-500" />;
                        })()}
                      </div>
                    ) : (
                      // All Photos - Grid Icon
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Album Label */}
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected
                      ? 'text-purple-600'
                      : 'text-gray-600'
                  }`}
                >
                  {album.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}



