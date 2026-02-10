'use client';

import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

/**
 * AlbumFilter - v0-Style Album/Category Filter
 * 
 * Horizontal scrolling filter for categories/albums.
 * Cleaner than AlbumNavigation (3.9KB)
 * 
 * Features:
 * - Horizontal scroll
 * - Icon support (from category config)
 * - Active state
 * - Photo count badges
 */

export interface AlbumFilterProps {
  categories: Array<{
    id: string;
    name: string;
    icon?: string;
    photoCount?: number;
  }>;
  selectedAlbum: string | null;
  onAlbumSelect: (albumId: string | null) => void;
  totalPhotos?: number;
}

export default function AlbumFilter({
  categories,
  selectedAlbum,
  onAlbumSelect,
  totalPhotos = 0,
}: AlbumFilterProps) {
  // Get Lucide icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Camera;
    
    // Try to find icon in Lucide
    const Icon = (LucideIcons as any)[iconName];
    return Icon || Camera;
  };

  // Filter visible categories (with photos)
  const visibleCategories = categories.filter((cat) => (cat.photoCount || 0) > 0);

  if (visibleCategories.length === 0) {
    return null; // No categories with photos
  }

  return (
    <div className="w-full bg-app-bg border-b border-app-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Horizontal Scroll Container */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {/* "Alle" Filter */}
          <motion.button
            onClick={() => onAlbumSelect(null)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              selectedAlbum === null
                ? 'bg-app-accent text-white shadow-lg'
                : 'bg-app-card text-app-fg border border-app-border hover:bg-app-bg'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Camera className="w-4 h-4" />
            <span>Alle</span>
            {totalPhotos > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedAlbum === null
                  ? 'bg-white/20 text-white'
                  : 'bg-app-bg text-app-muted'
              }`}>
                {totalPhotos}
              </span>
            )}
          </motion.button>

          {/* Category Filters */}
          {visibleCategories.map((category) => {
            const Icon = getIcon(category.icon);
            const isActive = selectedAlbum === category.id;

            return (
              <motion.button
                key={category.id}
                onClick={() => onAlbumSelect(category.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  isActive
                    ? 'bg-app-accent text-white shadow-lg'
                    : 'bg-app-card text-app-fg border border-app-border hover:bg-app-bg'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
                {(category.photoCount || 0) > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-app-bg text-app-muted'
                  }`}>
                    {category.photoCount}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
