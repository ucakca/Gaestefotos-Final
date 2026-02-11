'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MosaicTileData {
  id: string;
  x: number;
  y: number;
  url: string | null;
  hero: boolean;
  auto: boolean;
  t: number; // timestamp ms
}

interface MosaicGridProps {
  tiles: MosaicTileData[];
  gridWidth: number;
  gridHeight: number;
  targetImageUrl?: string | null;
  overlayIntensity?: number; // 0-100
  animation?: 'PUZZLE' | 'FLIP' | 'PARTICLES' | 'ZOOM_FLY' | 'RIPPLE';
  progress?: number; // 0-100
  className?: string;
}

const ANIMATION_VARIANTS = {
  PUZZLE: {
    initial: { opacity: 0, scale: 0, rotate: -180 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    transition: { type: 'spring', stiffness: 200, damping: 15 },
  },
  FLIP: {
    initial: { opacity: 0, rotateY: 180, scale: 0.8 },
    animate: { opacity: 1, rotateY: 0, scale: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  PARTICLES: {
    initial: { opacity: 0, scale: 0, filter: 'blur(10px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    transition: { duration: 0.8, ease: 'easeOut' },
  },
  ZOOM_FLY: {
    initial: { opacity: 0, scale: 3, x: 0, y: 0 },
    animate: { opacity: 1, scale: 1, x: 0, y: 0 },
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  RIPPLE: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

export default function MosaicGrid({
  tiles,
  gridWidth,
  gridHeight,
  targetImageUrl,
  overlayIntensity = 10,
  animation = 'ZOOM_FLY',
  progress = 0,
  className = '',
}: MosaicGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());
  const prevTileIdsRef = useRef<Set<string>>(new Set());
  const [heroTile, setHeroTile] = useState<MosaicTileData | null>(null);

  // Build a 2D lookup for fast grid access
  const tileMap = useMemo(() => {
    const map = new Map<string, MosaicTileData>();
    for (const tile of tiles) {
      map.set(`${tile.x},${tile.y}`, tile);
    }
    return map;
  }, [tiles]);

  // Detect newly arrived tiles for animation
  useEffect(() => {
    const currentIds = new Set(tiles.map(t => t.id));
    const prevIds = prevTileIdsRef.current;
    const added = new Set<string>();

    for (const id of currentIds) {
      if (!prevIds.has(id)) added.add(id);
    }
    prevTileIdsRef.current = currentIds;

    if (added.size > 0) {
      setNewTileIds(prev => {
        const next = new Set(prev);
        for (const id of added) next.add(id);
        return next;
      });

      // Check if any new tile is a hero
      const newHero = tiles.find(t => added.has(t.id) && t.hero);
      if (newHero) {
        setHeroTile(newHero);
        setTimeout(() => setHeroTile(null), 5000);
      }

      // Clear new tile highlights after animation
      setTimeout(() => {
        setNewTileIds(prev => {
          const next = new Set(prev);
          for (const id of added) next.delete(id);
          return next;
        });
      }, 2000);
    }
  }, [tiles]);

  const animConfig = ANIMATION_VARIANTS[animation] || ANIMATION_VARIANTS.ZOOM_FLY;

  // Milestone glow effect
  const showMilestoneGlow = progress >= 80;
  const milestones = [25, 50, 75, 100];
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    for (const m of milestones) {
      if (prevProgressRef.current < m && progress >= m) {
        setShowMilestone(m);
        setTimeout(() => setShowMilestone(null), 3000);
        break;
      }
    }
    prevProgressRef.current = progress;
  }, [progress]);

  const gridAspect = gridWidth / gridHeight;

  // Measure container for proper "contain" fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Calculate inner grid dimensions to fit within container (object-fit: contain)
  const { w: cw, h: ch } = containerSize;
  const containerAspect = cw && ch ? cw / ch : gridAspect;
  let innerWidth: number | undefined;
  let innerHeight: number | undefined;
  if (cw > 0 && ch > 0) {
    if (gridAspect >= containerAspect) {
      // Grid is wider than container → constrain by width
      innerWidth = cw;
      innerHeight = cw / gridAspect;
    } else {
      // Grid is taller than container → constrain by height
      innerHeight = ch;
      innerWidth = ch * gridAspect;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center bg-black ${className}`}
      style={{ perspective: animation === 'FLIP' ? '1000px' : undefined }}
    >
      {/* Aspect-ratio wrapper — JS-calculated contain fit */}
      <div
        className="relative"
        style={innerWidth && innerHeight ? {
          width: `${innerWidth}px`,
          height: `${innerHeight}px`,
        } : {
          width: '100%',
          height: '100%',
        }}
      >
      {/* Target image overlay (ghosted behind) */}
      {targetImageUrl && overlayIntensity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${targetImageUrl})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            opacity: overlayIntensity / 100,
            filter: 'blur(1px)',
          }}
        />
      )}

      {/* Grid */}
      <div
        className="relative z-10 w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
          gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
          gap: '1px',
        }}
      >
        <AnimatePresence>
          {Array.from({ length: gridHeight }, (_, y) =>
            Array.from({ length: gridWidth }, (_, x) => {
              const key = `${x},${y}`;
              const tile = tileMap.get(key);
              const isNew = tile ? newTileIds.has(tile.id) : false;

              return (
                <div
                  key={key}
                  className="relative overflow-hidden"
                  style={{
                    gridColumn: x + 1,
                    gridRow: y + 1,
                  }}
                >
                  {tile?.url ? (
                    <motion.div
                      layoutId={tile.id}
                      initial={isNew ? animConfig.initial : false}
                      animate={{
                        ...(animConfig.animate as any),
                        boxShadow: isNew
                          ? '0 0 12px 4px rgba(255,215,0,0.6)'
                          : tile.hero
                            ? '0 0 8px 2px rgba(255,215,0,0.3)'
                            : 'none',
                      }}
                      transition={isNew ? animConfig.transition : { duration: 0 }}
                      className="w-full h-full"
                    >
                      <img
                        src={tile.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {tile.hero && (
                        <div className="absolute inset-0 border-2 border-yellow-400 pointer-events-none" />
                      )}
                    </motion.div>
                  ) : (
                    <div className="w-full h-full bg-black/20" />
                  )}
                </div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Coming to Life pulse at 80%+ */}
      {showMilestoneGlow && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none rounded"
          animate={{
            boxShadow: [
              'inset 0 0 30px rgba(255,215,0,0)',
              'inset 0 0 60px rgba(255,215,0,0.15)',
              'inset 0 0 30px rgba(255,215,0,0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Hero spotlight overlay */}
      <AnimatePresence>
        {heroTile && heroTile.url && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-yellow-400"
              initial={{ scale: 0.3, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{ width: '40vmin', height: '40vmin' }}
            >
              <img
                src={heroTile.url}
                alt="Hero Tile"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <span className="text-yellow-300 text-lg font-bold">⭐ Hero Moment</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone fireworks */}
      <AnimatePresence>
        {showMilestone !== null && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-6xl md:text-8xl font-black text-yellow-400 drop-shadow-2xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-20, 5, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {showMilestone}%! 🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end aspect-ratio wrapper */}
    </div>
  );
}
