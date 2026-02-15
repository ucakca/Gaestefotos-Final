'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { easings } from '@/hooks/useAnimation';

interface BentoGridProps {
  photos: Array<{ id: string; url: string; caption?: string }>;
  autoplay?: boolean;
  morphInterval?: number;
}

type BentoLayout = 'default' | 'featured' | 'gallery' | 'focus' | 'masonry';

interface BentoCell {
  id: string;
  url: string;
  rowSpan: number;
  colSpan: number;
  layout: BentoLayout;
}

const layouts: Record<BentoLayout, { rowSpan: number; colSpan: number }[]> = {
  default: [
    { rowSpan: 2, colSpan: 2 }, { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 }, { rowSpan: 2, colSpan: 2 },
    { rowSpan: 1, colSpan: 2 }, { rowSpan: 1, colSpan: 2 },
  ],
  featured: [
    { rowSpan: 3, colSpan: 3 }, { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 2, colSpan: 2 }, { rowSpan: 1, colSpan: 2 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
  ],
  gallery: [
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 2, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 }, { rowSpan: 2, colSpan: 1 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
  ],
  focus: [
    { rowSpan: 2, colSpan: 2 }, { rowSpan: 2, colSpan: 2 },
    { rowSpan: 1, colSpan: 1 }, { rowSpan: 1, colSpan: 1 },
    { rowSpan: 2, colSpan: 2 }, { rowSpan: 2, colSpan: 2 },
  ],
  masonry: [
    { rowSpan: 3, colSpan: 1 }, { rowSpan: 2, colSpan: 1 }, { rowSpan: 4, colSpan: 1 },
    { rowSpan: 2, colSpan: 1 }, { rowSpan: 3, colSpan: 1 }, { rowSpan: 2, colSpan: 1 },
    { rowSpan: 3, colSpan: 1 }, { rowSpan: 2, colSpan: 1 },
  ],
};

export default function BentoGridMorph({ 
  photos, 
  autoplay = true, 
  morphInterval = 8000 
}: BentoGridProps) {
  const [currentLayout, setCurrentLayout] = useState<BentoLayout>('default');
  const [cells, setCells] = useState<BentoCell[]>([]);

  const generateCells = useCallback((layout: BentoLayout): BentoCell[] => {
    const layoutConfig = layouts[layout];
    return layoutConfig.map((config, index) => ({
      id: `${photos[index % photos.length]?.id || index}`,
      url: photos[index % photos.length]?.url || '',
      rowSpan: config.rowSpan,
      colSpan: config.colSpan,
      layout,
    })).filter(cell => cell.url);
  }, [photos]);

  const morphToNextLayout = useCallback(() => {
    const layoutKeys = Object.keys(layouts) as BentoLayout[];
    const currentIndex = layoutKeys.indexOf(currentLayout);
    const nextLayout = layoutKeys[(currentIndex + 1) % layoutKeys.length];
    setCurrentLayout(nextLayout);
    setCells(generateCells(nextLayout));
  }, [currentLayout, generateCells]);

  useEffect(() => {
    setCells(generateCells(currentLayout));
  }, [currentLayout, generateCells]);

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(morphToNextLayout, morphInterval);
    return () => clearInterval(interval);
  }, [autoplay, morphInterval, morphToNextLayout]);

  const getGridCols = () => {
    switch (currentLayout) {
      case 'featured': return 'grid-cols-4';
      case 'masonry': return 'grid-cols-4';
      case 'focus': return 'grid-cols-4';
      default: return 'grid-cols-4';
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 overflow-hidden">
      {/* Layout Label */}
      <motion.div 
        className="absolute top-4 left-4 z-10"
        key={currentLayout}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          {currentLayout}
        </span>
      </motion.div>

      {/* Bento Grid */}
      <motion.div 
        className={`grid ${getGridCols()} gap-4 h-full auto-rows-fr`}
        layout
        transition={{ duration: 0.8, ease: easings.cinematic }}
      >
        <AnimatePresence mode="popLayout">
          {cells.map((cell, index) => (
            <motion.div
              key={`${cell.id}-${currentLayout}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                gridRow: `span ${cell.rowSpan}`,
                gridColumn: `span ${cell.colSpan}`,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                duration: 0.6, 
                ease: easings.cinematic,
                delay: index * 0.05,
              }}
              className="relative rounded-2xl overflow-hidden group cursor-pointer"
              style={{
                gridRow: `span ${cell.rowSpan}`,
                gridColumn: `span ${cell.colSpan}`,
              }}
            >
              <Image
                src={cell.url}
                alt=""
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Hover Overlay */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Ambient Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{ 
            x: [0, -30, 0], 
            y: [0, -50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>
    </div>
  );
}
