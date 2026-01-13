'use client';

import { motion } from 'framer-motion';
import { Category } from '@gaestefotos/shared';
import * as LucideIcons from 'lucide-react';
import { Folder, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AlbumNavigationProps {
  categories: Category[];
  selectedAlbum: string | null;
  onAlbumSelect: (categoryId: string | null) => void;
  totalPhotos?: number;
}

const MotionButton = motion(Button);

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
    <div className="sticky top-0 z-30 bg-app-card/95 backdrop-blur border-b border-app-border pt-safe-top">
      <div className="max-w-md mx-auto px-4 py-3">
        {/* Horizontal Scrollable Album Navigation */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {allAlbums.map((album, index) => {
            const isSelected = selectedAlbum === album.id;
            
            return (
              <MotionButton
                key={album.id || 'all'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAlbumSelect(album.id)}
                variant="ghost"
                size="sm"
                className={`h-auto p-0 flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px] ${
                  isSelected ? '' : 'text-app-muted'
                }`}
              >
                {/* Album Icon - Instagram Stories Style */}
                <div
                  className={`relative w-14 h-14 rounded-full p-0.5 transition-all ${
                    isSelected
                      ? 'bg-app-accent scale-110'
                      : 'bg-app-border'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-app-card flex items-center justify-center overflow-hidden">
                    {album.id ? (
                      // Category with image or icon
                      <div className="w-full h-full bg-app-bg flex items-center justify-center">
                        {(() => {
                          const IconComp = getIcon((album as any).iconKey);
                          return <IconComp className="w-6 h-6 text-app-fg" />;
                        })()}
                      </div>
                    ) : (
                      // All Photos - Grid Icon
                      <div className="w-full h-full bg-app-bg flex items-center justify-center">
                        <Grid3x3 className="w-6 h-6 text-app-muted" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Album Label */}
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected
                      ? 'text-app-fg'
                      : 'text-app-muted'
                  }`}
                >
                  {album.name}
                </span>
              </MotionButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}



