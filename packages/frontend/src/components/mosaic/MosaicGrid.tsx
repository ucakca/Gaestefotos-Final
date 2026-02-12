'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  interactive?: boolean;
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
  interactive = false,
}: MosaicGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());
  const prevTileIdsRef = useRef<Set<string>>(new Set());
  const [heroTile, setHeroTile] = useState<MosaicTileData | null>(null);

  // ── Zoom & pan state ───────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const wasDragged = useRef(false);

  // ── Tile preview ───────────────────────────────────────────────
  const [previewTile, setPreviewTile] = useState<MosaicTileData | null>(null);

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

  // ── Aspect-ratio containment ──────────────────────────────────
  const gridAspect = gridWidth / gridHeight;

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

  const { w: cw, h: ch } = containerSize;
  let innerW = 0, innerH = 0;
  if (cw > 0 && ch > 0) {
    const ca = cw / ch;
    if (gridAspect >= ca) {
      innerW = cw;
      innerH = cw / gridAspect;
    } else {
      innerH = ch;
      innerW = ch * gridAspect;
    }
  }

  // ── Zoom handlers ──────────────────────────────────────────────
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.4, 10)), []);
  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const next = Math.max(z / 1.4, 1);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const handleZoomHome = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(z => {
      const next = Math.max(1, Math.min(z * factor, 10));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [interactive, handleWheel]);

  // ── Pan handlers ───────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive || zoom <= 1) return;
    setIsPanning(true);
    wasDragged.current = false;
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [interactive, zoom, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDragged.current = true;
    setPan({
      x: panStart.current.px + dx,
      y: panStart.current.py + dy,
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => setIsPanning(false), []);

  // ── Tile click → preview ───────────────────────────────────────
  const handleTileClick = useCallback((tile: MosaicTileData) => {
    if (!interactive || !tile.url || wasDragged.current) return;
    setPreviewTile(tile);
  }, [interactive]);

  // Close preview on Escape
  useEffect(() => {
    if (!previewTile) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewTile(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [previewTile]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center bg-black overflow-hidden ${className}`}
      style={{
        perspective: animation === 'FLIP' ? '1000px' : undefined,
        cursor: interactive ? (zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'pointer') : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Aspect-ratio wrapper — object-fit: contain */}
      <div
        className="relative"
        style={innerW > 0 && innerH > 0 ? {
          width: `${innerW}px`,
          height: `${innerH}px`,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
          willChange: zoom > 1 ? 'transform' : undefined,
        } : { width: '100%', height: '100%' }}
      >
        {/* Grid */}
        <div
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridHeight}, minmax(0, 1fr))`,
            gap: 0,
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
                    style={{ gridColumn: x + 1, gridRow: y + 1 }}
                    onClick={tile?.url ? () => handleTileClick(tile) : undefined}
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
                          draggable={false}
                        />
                        {tile.hero && (
                          <div className="absolute inset-0 border-2 border-yellow-400 pointer-events-none" />
                        )}
                      </motion.div>
                    ) : targetImageUrl ? (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${targetImageUrl})`,
                          backgroundSize: `${gridWidth * 100}% ${gridHeight * 100}%`,
                          backgroundPosition: `${gridWidth > 1 ? (x / (gridWidth - 1)) * 100 : 0}% ${gridHeight > 1 ? (y / (gridHeight - 1)) * 100 : 0}%`,
                          opacity: 0.25,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-black" />
                    )}
                  </div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Zoom controls ─────────────────────────────────────────── */}
      {interactive && (
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            title="Zoom In"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            title="Zoom Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomHome(); }}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            title="Fit to Screen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          </button>
        </div>
      )}

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
                <span className="text-yellow-300 text-lg font-bold">Hero Moment</span>
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
              {showMilestone}%!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tile preview lightbox ─────────────────────────────────── */}
      <AnimatePresence>
        {previewTile && previewTile.url && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            style={{ cursor: 'default' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewTile(null)}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewTile.url}
                alt={`Tile ${previewTile.x},${previewTile.y}`}
                className="max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setPreviewTile(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg hover:bg-white transition-colors text-lg font-bold leading-none"
              >
                &times;
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                <p className="text-white/80 text-sm">
                  Position: {previewTile.x + 1}, {previewTile.y + 1}
                  {previewTile.hero && ' \u00B7 Hero'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
