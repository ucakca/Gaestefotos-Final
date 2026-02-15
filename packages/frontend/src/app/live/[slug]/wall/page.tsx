'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { wsManager } from '@/lib/websocket';
import QRCode from '@/components/QRCode';
import { Button } from '@/components/ui/Button';
import MosaicGrid, { MosaicTileData } from '@/components/mosaic/MosaicGrid';
import MosaicTicker from '@/components/mosaic/MosaicTicker';

// Lazy load new animation components
const CinematicFlow = lazy(() => import('@/components/wall/CinematicFlow'));
const PolaroidRain = lazy(() => import('@/components/wall/PolaroidRain'));
const CoverFlowCarousel = lazy(() => import('@/components/wall/CoverFlowCarousel'));
const BentoGridMorph = lazy(() => import('@/components/wall/BentoGridMorph'));
const LiquidTransition = lazy(() => import('@/components/wall/LiquidTransition'));
const GenerativeScramble = lazy(() => import('@/components/wall/GenerativeScramble'));
const InfiniteScroll = lazy(() => import('@/components/wall/InfiniteScroll'));
const TimeTravelStack = lazy(() => import('@/components/wall/TimeTravelStack'));
const HolographicMode = lazy(() => import('@/components/wall/PremiumModes').then(m => ({ default: m.HolographicMode })));
const AISmartMode = lazy(() => import('@/components/wall/PremiumModes').then(m => ({ default: m.AISmartMode })));
const CinemaMode = lazy(() => import('@/components/wall/PremiumModes').then(m => ({ default: m.CinemaMode })));

export default function LiveWallPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get('mode') || 'grid') as any;
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow' | 'collage' | 'masonry' | 'floating' | 'mosaic' | 'mixed' | 'cinematic' | 'polaroid' | 'coverflow' | 'bento' | 'liquid' | 'scramble' | 'infinite' | 'timetravel' | 'holographic' | 'ai-smart' | 'cinema'>(initialMode);
  const [sortMode, setSortMode] = useState<'newest' | 'random'>('newest');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mosaic state (for mosaic + mixed modes)
  const [mosaicWall, setMosaicWall] = useState<any>(null);
  const [mosaicTiles, setMosaicTiles] = useState<MosaicTileData[]>([]);
  const [mosaicStats, setMosaicStats] = useState<any>(null);
  const [mosaicProgress, setMosaicProgress] = useState(0);
  const [hasMosaic, setHasMosaic] = useState(false);
  const lastTileTimeRef = useRef<string | null>(null);

  // Mixed mode: alternate between gallery slideshow and mosaic view
  const [mixedPhase, setMixedPhase] = useState<'mosaic' | 'photos'>('mosaic');
  const [mixedPhotoIndex, setMixedPhotoIndex] = useState(0);
  const mixedPhotosPerCycle = 3;
  const mixedMosaicDuration = 10000; // 10s mosaic
  const mixedPhotoDuration = 5000;   // 5s per photo

  // Fullscreen API + cursor auto-hide
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch { /* Fullscreen not supported */ }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen]);

  // Cursor auto-hide after 3s inactivity
  useEffect(() => {
    const resetCursor = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener('mousemove', resetCursor);
    window.addEventListener('mousedown', resetCursor);
    cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 3000);
    return () => {
      window.removeEventListener('mousemove', resetCursor);
      window.removeEventListener('mousedown', resetCursor);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  useEffect(() => {
    if (event?.id) {
      loadPhotos();
    }
  }, [event?.id]);

  useEffect(() => {
    // Simple tiering switch:
    // - If realtime is disabled via env, fall back to polling.
    // - Otherwise default to realtime.
    const disabledByEnv = process.env.NEXT_PUBLIC_DISABLE_REALTIME === 'true';
    setRealtimeEnabled(!disabledByEnv);
  }, []);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!event?.id) return;

    try {
      const { data } = await api.get(`/events/${event.id}/photos`, {
        params: { status: 'APPROVED' },
      });
      setPhotos(data.photos || []);
    } catch (err) {
      void err;
    }
  };

  // Realtime updates
  const realtimePhotos = useEventRealtime(event?.id || '', photos, { enabled: realtimeEnabled });

  useEffect(() => {
    setPhotos(realtimePhotos);
  }, [realtimePhotos]);

  // Polling fallback (Free tier / realtime disabled)
  useEffect(() => {
    if (!event?.id) return;
    if (realtimeEnabled) return;
    const interval = setInterval(() => {
      void loadPhotos();
    }, 10_000);
    return () => clearInterval(interval);
  }, [event?.id, realtimeEnabled]);

  // ── Mosaic data loading ──
  const loadMosaicDisplay = useCallback(async (evId: string) => {
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/display`);
      setMosaicWall(data.wall);
      setMosaicTiles(data.tiles || []);
      setMosaicProgress(data.progress || 0);
      setHasMosaic(true);
      const tileList = data.tiles || [];
      if (tileList.length > 0) {
        const maxT = Math.max(...tileList.map((t: MosaicTileData) => t.t));
        lastTileTimeRef.current = new Date(maxT).toISOString();
      }
    } catch {
      setHasMosaic(false);
    }
  }, []);

  const loadMosaicStats = useCallback(async (evId: string) => {
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/stats`);
      setMosaicStats(data.stats);
    } catch { /* non-critical */ }
  }, []);

  const loadNewMosaicTiles = useCallback(async (evId: string) => {
    if (!lastTileTimeRef.current) return;
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/tiles`, {
        params: { since: lastTileTimeRef.current },
      });
      const newTiles = (data.tiles || []).map((t: any) => ({
        id: t.id, x: t.gridX, y: t.gridY, url: t.croppedImageUrl,
        hero: t.isHero, auto: t.isAutoFilled, t: new Date(t.createdAt).getTime(),
      }));
      if (newTiles.length > 0) {
        setMosaicTiles(prev => {
          const existing = new Set(prev.map(t => t.id));
          const merged = [...prev];
          for (const nt of newTiles) { if (!existing.has(nt.id)) merged.push(nt); }
          return merged;
        });
        const maxT = Math.max(...newTiles.map((t: MosaicTileData) => t.t));
        lastTileTimeRef.current = new Date(maxT).toISOString();
        if (mosaicWall) {
          const total = mosaicWall.gridWidth * mosaicWall.gridHeight;
          setMosaicTiles(prev => { setMosaicProgress(Math.round((prev.length / total) * 100)); return prev; });
        }
      }
    } catch { /* non-critical */ }
  }, [mosaicWall]);

  // Load mosaic on event load (for mosaic/mixed modes)
  useEffect(() => {
    if (!event?.id) return;
    loadMosaicDisplay(event.id);
    loadMosaicStats(event.id);
  }, [event?.id, loadMosaicDisplay, loadMosaicStats]);

  // WebSocket for mosaic tile events
  useEffect(() => {
    if (!event?.id || !hasMosaic) return;
    wsManager.connect();
    wsManager.joinEvent(event.id);
    const unsub = wsManager.on('mosaic_tile_placed', () => {
      loadNewMosaicTiles(event.id);
      loadMosaicStats(event.id);
    });
    return () => { unsub(); wsManager.leaveEvent(event.id); };
  }, [event?.id, hasMosaic, loadNewMosaicTiles, loadMosaicStats]);

  // Mosaic polling fallback
  useEffect(() => {
    if (!event?.id || !hasMosaic) return;
    const interval = setInterval(() => {
      loadNewMosaicTiles(event.id);
      loadMosaicStats(event.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [event?.id, hasMosaic, loadNewMosaicTiles, loadMosaicStats]);

  // ── Mixed mode timer ──
  useEffect(() => {
    if (viewMode !== 'mixed' || !hasMosaic) return;
    let timer: NodeJS.Timeout;

    if (mixedPhase === 'mosaic') {
      timer = setTimeout(() => {
        setMixedPhase('photos');
        setMixedPhotoIndex(0);
      }, mixedMosaicDuration);
    } else {
      timer = setTimeout(() => {
        const nextIdx = mixedPhotoIndex + 1;
        if (nextIdx >= mixedPhotosPerCycle || nextIdx >= displayPhotos.length) {
          setMixedPhase('mosaic');
        } else {
          setMixedPhotoIndex(nextIdx);
        }
      }, mixedPhotoDuration);
    }

    return () => clearTimeout(timer);
  }, [viewMode, mixedPhase, mixedPhotoIndex, hasMosaic]);

  // Track newly-arrived photos for a subtle highlight animation
  useEffect(() => {
    const currentIds = new Set((photos || []).map((p) => p.id));
    const prevIds = prevIdsRef.current;
    const added = new Set<string>();
    for (const id of currentIds) {
      if (!prevIds.has(id)) added.add(id);
    }
    prevIdsRef.current = currentIds;
    if (added.size > 0) {
      setNewIds((prev) => {
        const next = new Set(prev);
        for (const id of added) next.add(id);
        return next;
      });
      window.setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          for (const id of added) next.delete(id);
          return next;
        });
      }, 2500);
    }
  }, [photos]);

  // Slideshow auto-advance
  useEffect(() => {
    if (viewMode === 'slideshow' && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % photos.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [viewMode, photos.length]);

  useEffect(() => {
    if (currentSlide >= photos.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, photos.length]);

  const displayPhotos = useMemo(() => {
    const list = [...(photos || [])];
    if (sortMode === 'newest') {
      // Backend already returns createdAt desc, but keep stable and robust here.
      list.sort((a: any, b: any) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });
      return list;
    }

    // random
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [photos, sortMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground">
        <div className="text-background text-lg">Laden...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground">
        <div className="text-background">Event nicht gefunden</div>
      </div>
    );
  }

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/e3/${slug}?source=qr`
    : '';

  return (
    <div className={`min-h-screen bg-foreground text-background ${cursorHidden ? 'cursor-none' : ''}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-foreground/50 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        
        <div className="flex gap-2 items-center flex-wrap">
          {/* View Mode Selector */}
          <div className="flex flex-col gap-1 bg-background/10 rounded-lg p-1 max-w-3xl">
            {/* Row 1: Base Modes */}
            <div className="flex flex-wrap">
              {([
                ['grid', 'Grid'],
                ['collage', 'Collage'],
                ['masonry', 'Masonry'],
                ['floating', 'Floating'],
                ['slideshow', 'Slideshow'],
                ...(hasMosaic ? [['mosaic', '🧩 Mosaik'], ['mixed', '🔀 Mix']] : []),
              ] as [string, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === mode 
                      ? 'bg-background text-foreground' 
                      : 'text-background/70 hover:text-background'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Row 2: Animation & Premium Modes */}
            <div className="flex flex-wrap border-t border-background/10 pt-1">
              {([
                ['cinematic', '🎬 Cinematic'],
                ['polaroid', '🎞️ Polaroid'],
                ['coverflow', '🎠 CoverFlow'],
                ['bento', '🍱 Bento'],
                ['liquid', '💧 Liquid'],
                ['scramble', '🔀 Scramble'],
                ['infinite', '♾️ Infinite'],
                ['timetravel', '⏳ Zeitreise'],
                ['holographic', '🌈 Holo'],
                ['ai-smart', '� AI'],
                ['cinema', '🎥 Kino'],
              ] as [string, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === mode 
                      ? 'bg-background text-foreground' 
                      : 'text-background/70 hover:text-background'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setSortMode(sortMode === 'newest' ? 'random' : 'newest')}
            className="px-3 py-1.5 bg-background/20 rounded text-sm hover:bg-background/30"
          >
            {sortMode === 'newest' ? '🕐 Neu' : '🎲 Zufall'}
          </Button>

          <Button
            onClick={() => setRealtimeEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm ${realtimeEnabled ? 'bg-green-500/30 text-green-200' : 'bg-background/20'}`}
          >
            {realtimeEnabled ? '⚡ Live' : '🔄 Polling'}
          </Button>

          <Button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-background/20 rounded text-sm hover:bg-background/30"
          >
            {isFullscreen ? '⬜ Fenster' : '⛶ Vollbild'}
          </Button>
          
          {/* QR Code */}
          <div className="hidden lg:block">
            <QRCode value={publicUrl} size={80} />
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="pt-20 px-4 pb-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <AnimatePresence initial={false}>
              {displayPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: newIds.has(photo.id)
                      ? '0 0 0 3px color-mix(in_srgb,var(--background) 65%, transparent)'
                      : '0 0 0 0px color-mix(in_srgb,var(--background) 0%, transparent)',
                  }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="aspect-square bg-background/10 rounded overflow-hidden"
                >
                  {photo.url ? (
                  <img
                    src={photo.url}
                    alt="Event Foto"
                    className="w-full h-full object-cover"
                  />
                  ) : (
                  <div className="w-full h-full flex items-center justify-center text-background/60">
                    Foto
                  </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Collage Mode - Mixed sizes with featured photos */}
      {viewMode === 'collage' && (
        <div className="pt-20 px-4 pb-4">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 auto-rows-[100px] md:auto-rows-[120px] lg:auto-rows-[150px]">
            <AnimatePresence initial={false}>
              {displayPhotos.slice(0, 24).map((photo, index) => {
                // Make some photos larger for visual interest
                const isLarge = index === 0 || index === 5 || index === 12;
                const isMedium = index === 2 || index === 7 || index === 15;
                
                return (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      rotate: newIds.has(photo.id) ? [0, 3, -3, 0] : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className={`bg-background/10 rounded-lg overflow-hidden shadow-lg ${
                      isLarge ? 'col-span-2 row-span-2' : 
                      isMedium ? 'col-span-2' : ''
                    } ${newIds.has(photo.id) ? 'ring-4 ring-yellow-400' : ''}`}
                  >
                    {photo.url && (
                      <img
                        src={photo.url}
                        alt="Event Foto"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Masonry Mode - Pinterest-style layout */}
      {viewMode === 'masonry' && (
        <div className="pt-20 px-4 pb-4">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
            <AnimatePresence initial={false}>
              {displayPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: newIds.has(photo.id) ? [1, 1.02, 1] : 1,
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className={`break-inside-avoid rounded-xl overflow-hidden shadow-lg bg-background/10 ${
                    newIds.has(photo.id) ? 'ring-4 ring-yellow-400' : ''
                  }`}
                >
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt="Event Foto"
                      className="w-full h-auto"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Floating Mode - Animated floating photos */}
      {viewMode === 'floating' && (
        <div className="pt-20 min-h-screen relative overflow-hidden">
          <AnimatePresence>
            {displayPhotos.slice(0, 15).map((photo, index) => {
              const randomX = (index * 17 + 10) % 80;
              const randomY = (index * 23 + 5) % 70;
              const randomRotate = ((index * 7) % 30) - 15;
              const randomScale = 0.8 + (index % 3) * 0.15;
              const randomDelay = index * 0.2;
              
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0, rotate: randomRotate - 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: randomScale,
                    rotate: randomRotate,
                    x: [0, 10, -10, 0],
                    y: [0, -10, 10, 0],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: randomDelay,
                    x: { duration: 8 + index, repeat: Infinity, ease: 'easeInOut' },
                    y: { duration: 10 + index, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  style={{
                    position: 'absolute',
                    left: `${randomX}%`,
                    top: `${randomY + 10}%`,
                  }}
                  className={`w-48 md:w-64 lg:w-80 rounded-xl overflow-hidden shadow-2xl bg-white p-2 ${
                    newIds.has(photo.id) ? 'ring-4 ring-yellow-400 z-50' : ''
                  }`}
                >
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt="Event Foto"
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                  {/* Polaroid-style caption area */}
                  <div className="h-8 mt-2" />
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Photo count badge */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground/80 backdrop-blur px-6 py-3 rounded-full">
            <span className="text-background font-medium">{photos.length} Fotos</span>
          </div>
        </div>
      )}

      {/* Slideshow Mode */}
      {viewMode === 'slideshow' && (
        <div className="min-h-screen flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            {displayPhotos.length > 0 && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto px-4"
              >
                <img
                  src={displayPhotos[currentSlide]?.url || ''}
                  alt="Event Foto"
                  className="max-w-full max-h-screen object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {displayPhotos.length === 0 && (
            <div className="text-center">
              <p className="text-2xl text-background/70">Noch keine Fotos</p>
            </div>
          )}

          {/* Photo Counter */}
          {displayPhotos.length > 0 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-foreground/50 px-4 py-2 rounded">
              {currentSlide + 1} / {displayPhotos.length}
            </div>
          )}
        </div>
      )}

      {/* Mosaic Mode (embedded in wall page) */}
      {viewMode === 'mosaic' && hasMosaic && mosaicWall && (
        <div className="pt-20 px-0 pb-0 h-screen flex flex-col">
          <div className="flex-1 relative">
            <MosaicGrid
              tiles={mosaicTiles}
              gridWidth={mosaicWall.gridWidth}
              gridHeight={mosaicWall.gridHeight}
              targetImageUrl={mosaicWall.targetImageUrl}
              overlayIntensity={mosaicWall.overlayIntensity}
              animation={mosaicWall.displayAnimation}
              progress={mosaicProgress}
              className="w-full h-full"
              isDemo={(mosaicWall as any).isDemo}
            />
          </div>
          {mosaicWall.showTicker && (
            <MosaicTicker stats={mosaicStats} />
          )}
        </div>
      )}

      {/* Mixed Mode: alternating mosaic and photo slideshow */}
      {viewMode === 'mixed' && hasMosaic && mosaicWall && (
        <div className="pt-20 px-0 pb-0 h-screen flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {mixedPhase === 'mosaic' ? (
                <motion.div
                  key="mosaic-phase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0"
                >
                  <MosaicGrid
                    tiles={mosaicTiles}
                    gridWidth={mosaicWall.gridWidth}
                    gridHeight={mosaicWall.gridHeight}
                    targetImageUrl={mosaicWall.targetImageUrl}
                    overlayIntensity={mosaicWall.overlayIntensity}
                    animation={mosaicWall.displayAnimation}
                    progress={mosaicProgress}
                    className="w-full h-full"
                    isDemo={(mosaicWall as any).isDemo}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`photo-${mixedPhotoIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-black"
                >
                  {displayPhotos.length > 0 && displayPhotos[mixedPhotoIndex % displayPhotos.length] && (
                    <div className="relative max-w-5xl mx-auto">
                      <img
                        src={displayPhotos[mixedPhotoIndex % displayPhotos.length]?.url || ''}
                        alt="Event Foto"
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      />
                      {(displayPhotos[mixedPhotoIndex % displayPhotos.length] as any)?.uploadedBy && (
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                          <span className="text-white text-sm">
                            📸 {(displayPhotos[mixedPhotoIndex % displayPhotos.length] as any).uploadedBy}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {mosaicWall.showTicker && (
            <MosaicTicker stats={mosaicStats} />
          )}
        </div>
      )}

      {/* QR Code Mobile */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <QRCode value={publicUrl} size={100} />
      </div>

      {/* New Animation Modes */}
      {/* Cinematic Flow Mode */}
      {viewMode === 'cinematic' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <CinematicFlow 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url, caption: (p as any).caption }))} 
            autoplay={true}
            duration={6000}
          />
        </Suspense>
      )}

      {/* Polaroid Rain Mode */}
      {viewMode === 'polaroid' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <PolaroidRain 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            autoDropInterval={2000}
          />
        </Suspense>
      )}

      {/* CoverFlow Carousel Mode */}
      {viewMode === 'coverflow' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <CoverFlowCarousel 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url, caption: (p as any).caption }))}
            autoplay={true}
            interval={4000}
          />
        </Suspense>
      )}

      {/* Bento Grid Morph Mode */}
      {viewMode === 'bento' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <BentoGridMorph 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            autoplay={true}
            morphInterval={8000}
          />
        </Suspense>
      )}

      {/* Liquid Transition Mode */}
      {viewMode === 'liquid' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <LiquidTransition 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            autoplay={true}
            interval={5000}
          />
        </Suspense>
      )}

      {/* Generative Scramble Mode */}
      {viewMode === 'scramble' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <GenerativeScramble 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            scrambleInterval={6000}
          />
        </Suspense>
      )}

      {/* Infinite Scroll Mode */}
      {viewMode === 'infinite' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <InfiniteScroll 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            density={15}
          />
        </Suspense>
      )}

      {/* Time Travel Stack Mode */}
      {viewMode === 'timetravel' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <TimeTravelStack 
            photos={displayPhotos.map(p => ({ 
              id: p.id, 
              url: p.url, 
              timestamp: new Date(p.createdAt).toLocaleString('de-DE'),
              source: (p as any).category || 'upload'
            }))}
            autoStackInterval={5000}
          />
        </Suspense>
      )}

      {/* Premium Modes */}
      {/* Holographic Mode */}
      {viewMode === 'holographic' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <HolographicMode 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            mode="holographic"
          />
        </Suspense>
      )}

      {/* AI Smart Mode */}
      {viewMode === 'ai-smart' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <AISmartMode 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            mode="ai-smart"
          />
        </Suspense>
      )}

      {/* Cinema Mode */}
      {viewMode === 'cinema' && (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <CinemaMode 
            photos={displayPhotos.map(p => ({ id: p.id, url: p.url }))}
            mode="cinema"
          />
        </Suspense>
      )}
    </div>
  );
}

