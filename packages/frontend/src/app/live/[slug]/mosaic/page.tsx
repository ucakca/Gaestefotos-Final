'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import MosaicGrid, { MosaicTileData } from '@/components/mosaic/MosaicGrid';
import MosaicTicker from '@/components/mosaic/MosaicTicker';
import QRCode from '@/components/QRCode';

interface MosaicWallDisplay {
  id: string;
  gridWidth: number;
  gridHeight: number;
  targetImageUrl: string | null;
  overlayIntensity: number;
  status: string;
  displayAnimation: 'PUZZLE' | 'FLIP' | 'PARTICLES' | 'ZOOM_FLY' | 'RIPPLE';
  showTicker: boolean;
  showQrOverlay: boolean;
}

interface MosaicStats {
  totalCells: number;
  filledCells: number;
  progress: number;
  remaining: number;
  recentUploaders: string[];
  topUploaders: { name: string; count: number }[];
}

export default function LiveMosaicPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [wall, setWall] = useState<MosaicWallDisplay | null>(null);
  const [tiles, setTiles] = useState<MosaicTileData[]>([]);
  const [stats, setStats] = useState<MosaicStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [eventTitle, setEventTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTileTimeRef = useRef<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial display data
  const loadDisplay = useCallback(async (evId: string) => {
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/display`);
      setWall(data.wall);
      setTiles(data.tiles || []);
      setProgress(data.progress || 0);
      setEventTitle(data.event?.title || '');

      // Track last tile timestamp for incremental loading
      const tileList = data.tiles || [];
      if (tileList.length > 0) {
        const maxT = Math.max(...tileList.map((t: MosaicTileData) => t.t));
        lastTileTimeRef.current = new Date(maxT).toISOString();
      }
    } catch (err: any) {
      setError('Mosaic Wall nicht gefunden');
    }
  }, []);

  // Load stats for ticker
  const loadStats = useCallback(async (evId: string) => {
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/stats`);
      setStats(data.stats);
    } catch {
      // Non-critical
    }
  }, []);

  // Load new tiles incrementally
  const loadNewTiles = useCallback(async (evId: string) => {
    if (!lastTileTimeRef.current) return;
    try {
      const { data } = await api.get(`/events/${evId}/mosaic/tiles`, {
        params: { since: lastTileTimeRef.current },
      });
      const newTiles = (data.tiles || []).map((t: any) => ({
        id: t.id,
        x: t.gridX,
        y: t.gridY,
        url: t.croppedImageUrl,
        hero: t.isHero,
        auto: t.isAutoFilled,
        t: new Date(t.createdAt).getTime(),
      }));

      if (newTiles.length > 0) {
        setTiles(prev => {
          const existing = new Set(prev.map(t => t.id));
          const merged = [...prev];
          for (const nt of newTiles) {
            if (!existing.has(nt.id)) {
              merged.push(nt);
            }
          }
          return merged;
        });

        const maxT = Math.max(...newTiles.map((t: MosaicTileData) => t.t));
        lastTileTimeRef.current = new Date(maxT).toISOString();

        // Recalculate progress
        if (wall) {
          const total = wall.gridWidth * wall.gridHeight;
          setTiles(prev => {
            setProgress(Math.round((prev.length / total) * 100));
            return prev;
          });
        }
      }
    } catch {
      // Non-critical
    }
  }, [wall]);

  // Initial load: resolve slug → eventId → display data
  useEffect(() => {
    async function init() {
      try {
        const { data } = await api.get(`/events/slug/${slug}`);
        const evId = data.event?.id;
        if (!evId) {
          setError('Event nicht gefunden');
          setLoading(false);
          return;
        }
        setEventId(evId);
        await loadDisplay(evId);
        await loadStats(evId);
      } catch {
        setError('Event nicht gefunden');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug, loadDisplay, loadStats]);

  // WebSocket: listen for new tile placements
  useEffect(() => {
    if (!eventId) return;

    wsManager.connect();
    wsManager.joinEvent(eventId);

    const unsubscribe = wsManager.on('mosaic_tile_placed', () => {
      // Fetch new tiles when notified
      loadNewTiles(eventId);
      loadStats(eventId);
    });

    return () => {
      unsubscribe();
      wsManager.leaveEvent(eventId);
    };
  }, [eventId, loadNewTiles, loadStats]);

  // Polling fallback: check for new tiles every 10s
  useEffect(() => {
    if (!eventId) return;

    pollRef.current = setInterval(() => {
      loadNewTiles(eventId);
      loadStats(eventId);
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventId, loadNewTiles, loadStats]);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e3/${slug}?source=qr`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Mosaik wird geladen...</div>
      </div>
    );
  }

  if (error || !wall) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/70 text-center">
          <p className="text-xl">{error || 'Keine Mosaic Wall konfiguriert'}</p>
          <p className="text-sm mt-2 text-white/40">Bitte das Event-Dashboard öffnen und eine Mosaic Wall erstellen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden select-none">
      {/* Main Mosaic Grid - takes all available space */}
      <div className="flex-1 relative">
        <MosaicGrid
          tiles={tiles}
          gridWidth={wall.gridWidth}
          gridHeight={wall.gridHeight}
          targetImageUrl={wall.targetImageUrl}
          overlayIntensity={wall.overlayIntensity}
          animation={wall.displayAnimation}
          progress={progress}
          className="w-full h-full"
          interactive
        />

        {/* Event title overlay - top left */}
        <div className="absolute top-4 left-4 z-50">
          <h1 className="text-white/80 text-xl font-bold drop-shadow-lg">{eventTitle}</h1>
        </div>

        {/* QR Code overlay - top right */}
        {wall.showQrOverlay && publicUrl && (
          <div className="absolute top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-2xl">
            <QRCode value={publicUrl} size={100} />
            <p className="text-xs text-center mt-1 text-gray-600 font-medium">Foto hochladen</p>
          </div>
        )}
      </div>

      {/* Ticker - bottom */}
      {wall.showTicker && (
        <MosaicTicker stats={stats} />
      )}
    </div>
  );
}
