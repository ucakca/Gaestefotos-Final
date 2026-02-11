'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Download, Share2, ZoomIn, MapPin, User } from 'lucide-react';
import api from '@/lib/api';
import MosaicGrid, { MosaicTileData } from '@/components/mosaic/MosaicGrid';

interface GalleryTile extends MosaicTileData {
  positionLabel: string;
  uploadedBy: string | null;
  photoUrl: string | null;
}

interface WallInfo {
  gridWidth: number;
  gridHeight: number;
  targetImageUrl: string | null;
  overlayIntensity: number;
  status: string;
}

export default function MosaicGalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [wall, setWall] = useState<WallInfo | null>(null);
  const [tiles, setTiles] = useState<GalleryTile[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [selectedTile, setSelectedTile] = useState<GalleryTile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedTiles, setHighlightedTiles] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  // Load data
  useEffect(() => {
    async function init() {
      try {
        const { data: eventData } = await api.get(`/events/slug/${slug}`);
        const evId = eventData.event?.id;
        if (!evId) { setError('Event nicht gefunden'); setLoading(false); return; }
        setEventId(evId);
        setEventTitle(eventData.event?.title || '');

        const { data: displayData } = await api.get(`/events/${evId}/mosaic/display`);
        setWall(displayData.wall);

        // Load all tiles with extended info
        const { data: tileData } = await api.get(`/events/${evId}/mosaic/tiles`);
        const galleryTiles: GalleryTile[] = (tileData.tiles || []).map((t: any) => ({
          id: t.id,
          x: t.gridX,
          y: t.gridY,
          url: t.croppedImageUrl,
          hero: t.isHero,
          auto: t.isAutoFilled,
          t: new Date(t.createdAt).getTime(),
          positionLabel: t.positionLabel,
          uploadedBy: t.photo?.uploadedBy || null,
          photoUrl: t.photo?.url || t.croppedImageUrl,
        }));
        setTiles(galleryTiles);
      } catch {
        setError('Mosaic Wall nicht gefunden');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug]);

  // Search: filter tiles by uploader name
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return tiles.filter(t => t.uploadedBy && t.uploadedBy.toLowerCase().includes(q));
  }, [tiles, searchQuery]);

  useEffect(() => {
    setHighlightedTiles(new Set(searchResults.map(t => t.id)));
  }, [searchResults]);

  // Progress
  const totalCells = wall ? wall.gridWidth * wall.gridHeight : 0;
  const filledCells = tiles.length;
  const progress = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  // Share
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${eventTitle} — Mosaic Wall`, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link kopiert!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/60 animate-pulse text-lg">Mosaik wird geladen...</div>
      </div>
    );
  }

  if (error || !wall) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/60 text-center">
          <p className="text-xl mb-2">{error || 'Kein Mosaik verfügbar'}</p>
          <p className="text-sm text-white/30">Das Mosaik wird nach dem Event hier sichtbar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{eventTitle}</h1>
            <p className="text-sm text-white/50">
              {progress}% fertig — {filledCells} von {totalCells} Tiles
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) { setSearchQuery(''); setHighlightedTiles(new Set()); } }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
              title="Mein Tile finden"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title="Teilen"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Export link (if available) */}
            {eventId && (
              <a
                href={`/api/events/${eventId}/mosaic/export?format=jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                title="HD-Poster herunterladen"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name eingeben um dein Tile zu finden..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setHighlightedTiles(new Set()); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-2 text-sm text-white/50">
                    {searchResults.length > 0
                      ? `${searchResults.length} Tile${searchResults.length !== 1 ? 's' : ''} gefunden`
                      : 'Kein Tile gefunden'}
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {searchResults.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTile(t)}
                        className="flex items-center gap-1.5 bg-purple-600/30 border border-purple-500/50 px-3 py-1 rounded-full text-xs hover:bg-purple-600/50 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        {t.positionLabel}
                        {t.uploadedBy && <span className="text-white/60">— {t.uploadedBy}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mosaic Grid — clickable tiles */}
      <div className="max-w-7xl mx-auto px-2 py-4">
        <div
          className="w-full grid gap-[1px]"
          style={{
            gridTemplateColumns: `repeat(${wall.gridWidth}, 1fr)`,
            aspectRatio: `${wall.gridWidth} / ${wall.gridHeight}`,
          }}
        >
          {Array.from({ length: wall.gridHeight }, (_, y) =>
            Array.from({ length: wall.gridWidth }, (_, x) => {
              const tile = tiles.find(t => t.x === x && t.y === y);
              const isHighlighted = tile ? highlightedTiles.has(tile.id) : false;

              return (
                <button
                  key={`${x},${y}`}
                  onClick={() => tile && setSelectedTile(tile)}
                  disabled={!tile?.url}
                  className={`relative aspect-square overflow-hidden transition-all duration-300 ${
                    tile?.url ? 'cursor-pointer hover:brightness-110 hover:z-10 hover:scale-105' : 'cursor-default'
                  } ${isHighlighted ? 'ring-2 ring-yellow-400 z-20 scale-110 brightness-125' : ''}`}
                >
                  {tile?.url ? (
                    <img src={tile.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  {isHighlighted && (
                    <div className="absolute inset-0 border-2 border-yellow-400 animate-pulse pointer-events-none" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="max-w-7xl mx-auto px-4 py-6 text-center">
        <div className="inline-flex items-center gap-4 bg-white/5 rounded-full px-6 py-3 text-sm text-white/50">
          <span>{filledCells} Fotos</span>
          <span className="w-px h-4 bg-white/20" />
          <span>{progress}% fertig</span>
          <span className="w-px h-4 bg-white/20" />
          <span>{wall.gridWidth}x{wall.gridHeight} Grid</span>
        </div>
      </div>

      {/* Tile Detail Modal */}
      <AnimatePresence>
        {selectedTile && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTile(null)}
          >
            <motion.div
              className="relative bg-gray-900 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl border border-white/10"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Photo */}
              <div className="aspect-square bg-gray-800">
                {(selectedTile.photoUrl || selectedTile.url) && (
                  <img
                    src={selectedTile.photoUrl || selectedTile.url || ''}
                    alt="Tile Detail"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {selectedTile.uploadedBy && (
                      <div className="flex items-center gap-2 text-white mb-1">
                        <User className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">{selectedTile.uploadedBy}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      Position {selectedTile.positionLabel}
                    </div>
                  </div>
                  {selectedTile.hero && (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">
                      Hero
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/30">
                  {new Date(selectedTile.t).toLocaleDateString('de-DE', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedTile(null)}
                className="absolute top-3 right-3 bg-black/60 backdrop-blur p-2 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
