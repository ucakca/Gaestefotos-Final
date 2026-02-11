'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronLeft,
  RefreshCw,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  History,
  LayoutGrid,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { usePackageFeatures } from '@/hooks/usePackageFeatures';
import { Lock, Crown } from 'lucide-react';

interface PrintTile {
  id: string;
  gridX: number;
  gridY: number;
  positionLabel: string;
  croppedImageUrl: string | null;
  printNumber: number | null;
  printStatus: 'PENDING' | 'PRINTING' | 'PRINTED' | 'PLACED';
  createdAt: string;
  photo?: { uploadedBy?: string };
}

interface HistoryTile {
  id: string;
  gridX: number;
  gridY: number;
  positionLabel: string;
  printNumber: number | null;
  printStatus: string;
  updatedAt: string;
  photo?: { uploadedBy?: string };
}

export default function PrintStationPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [queue, setQueue] = useState<PrintTile[]>([]);
  const [history, setHistory] = useState<HistoryTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [printing, setPrinting] = useState<Set<string>>(new Set());
  const [eventTitle, setEventTitle] = useState('');
  const [wallInfo, setWallInfo] = useState<{ gridWidth: number; gridHeight: number; tileSizeMm: number } | null>(null);

  // Feature Gate
  const { isFeatureEnabled, getUpgradeMessage, packageInfo } = usePackageFeatures(eventId);
  const canPrint = isFeatureEnabled('mosaicPrint');

  const autoPrintRef = useRef(autoPrint);
  autoPrintRef.current = autoPrint;
  const prevQueueIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  // Load event info
  useEffect(() => {
    async function loadEvent() {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        setEventTitle(data.event?.title || '');
      } catch { /* ignore */ }
    }
    loadEvent();
  }, [eventId]);

  // Load wall info
  useEffect(() => {
    async function loadWall() {
      try {
        const { data } = await api.get(`/events/${eventId}/mosaic`);
        setWallInfo({
          gridWidth: data.wall?.gridWidth || 24,
          gridHeight: data.wall?.gridHeight || 24,
          tileSizeMm: data.wall?.tileSizeMm || 50,
        });
      } catch { /* ignore */ }
    }
    loadWall();
  }, [eventId]);

  // Load print queue
  const loadQueue = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/mosaic/print-queue`);
      const tiles: PrintTile[] = data.tiles || [];

      // Detect new tiles for sound + auto-print
      const currentIds = new Set(tiles.map(t => t.id));
      const prevIds = prevQueueIdsRef.current;
      const newTiles = tiles.filter(t => !prevIds.has(t.id) && t.printStatus === 'PENDING');
      prevQueueIdsRef.current = currentIds;

      if (newTiles.length > 0 && prevIds.size > 0) {
        // Play notification sound
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }

        // Auto-print new tiles
        if (autoPrintRef.current) {
          for (const tile of newTiles) {
            triggerPrint(tile);
          }
        }
      }

      setQueue(tiles);
    } catch (err) {
      console.error('Failed to load print queue', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, soundEnabled]);

  // Load print history
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/mosaic/print-history`);
      setHistory(data.tiles || []);
    } catch { /* ignore */ }
  }, [eventId]);

  // Initial load + polling
  useEffect(() => {
    loadQueue();
    loadHistory();
  }, [loadQueue, loadHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue();
      if (showHistory) loadHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadQueue, loadHistory, showHistory]);

  // Update single tile status
  const updateStatus = async (tileId: string, status: string) => {
    try {
      await api.put(`/events/${eventId}/mosaic/tiles/${tileId}/print-status`, { printStatus: status });
      loadQueue();
      if (showHistory) loadHistory();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Batch update status
  const batchUpdateStatus = async (tileIds: string[], status: string) => {
    try {
      await api.put(`/events/${eventId}/mosaic/print-batch`, { tileIds, printStatus: status });
      loadQueue();
      if (showHistory) loadHistory();
    } catch (err) {
      console.error('Failed to batch update', err);
    }
  };

  // Trigger print for a tile (renders label in hidden iframe and prints)
  const triggerPrint = useCallback((tile: PrintTile) => {
    if (!tile.croppedImageUrl) return;

    setPrinting(prev => new Set(prev).add(tile.id));
    updateStatus(tile.id, 'PRINTING');

    const tileSizeMm = wallInfo?.tileSizeMm || 50;
    const labelHtml = buildLabelHtml(tile, tileSizeMm);

    // Use hidden iframe for printing
    const iframe = printFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(labelHtml);
        doc.close();

        // Wait for image to load, then print
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Mark as printed after a delay
          setTimeout(() => {
            updateStatus(tile.id, 'PRINTED');
            setPrinting(prev => {
              const next = new Set(prev);
              next.delete(tile.id);
              return next;
            });
          }, 2000);
        }, 500);
      }
    }
  }, [eventId, wallInfo]);

  // Print all pending tiles
  const printAllPending = () => {
    const pending = queue.filter(t => t.printStatus === 'PENDING');
    for (const tile of pending) {
      triggerPrint(tile);
    }
  };

  // Mark all printed as placed
  const markAllPlaced = () => {
    const printed = queue.filter(t => t.printStatus === 'PRINTED');
    if (printed.length > 0) {
      batchUpdateStatus(printed.map(t => t.id), 'PLACED');
    }
  };

  const pendingCount = queue.filter(t => t.printStatus === 'PENDING').length;
  const printingCount = queue.filter(t => t.printStatus === 'PRINTING').length;

  // Feature Gate: show upsell if mosaicPrint not enabled
  if (!canPrint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Print-Station — Pro Feature</h2>
          <p className="text-gray-500 mb-4 text-sm">
            {getUpgradeMessage('mosaicPrint')}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push(`/events/${eventId}/mosaic`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Zurück zur Mosaic Wall
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-600">
            <Crown className="w-4 h-4" />
            Upgrade auf Pro für Print-Station, HD-Export und mehr
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification sound (short beep) */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRl9vT19teleVjTQBGABAACAEAgATAA..." type="audio/wav" />
      </audio>

      {/* Hidden print iframe */}
      <iframe
        ref={printFrameRef}
        className="hidden"
        title="Print Frame"
        style={{ position: 'absolute', left: '-9999px', width: 0, height: 0 }}
      />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/events/${eventId}/dashboard`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Printer className="w-5 h-5 text-purple-600" />
                  Print-Station
                </h1>
                <p className="text-sm text-gray-500">{eventTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-Print Toggle */}
              <Button
                onClick={() => setAutoPrint(!autoPrint)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  autoPrint
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {autoPrint ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                {autoPrint ? 'Auto-Print AN' : 'Auto-Print AUS'}
              </Button>

              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}
                title={soundEnabled ? 'Sound an' : 'Sound aus'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* History Toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  showHistory ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                }`}
                title="Druckhistorie"
              >
                <History className="w-4 h-4" />
              </button>

              {/* Refresh */}
              <button
                onClick={() => { loadQueue(); loadHistory(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-600">{pendingCount} wartend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-gray-600">{printingCount} druckt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-600">{queue.filter(t => t.printStatus === 'PRINTED').length} gedruckt</span>
            </div>
            {wallInfo && (
              <div className="ml-auto text-gray-400 flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5" />
                {wallInfo.gridWidth}x{wallInfo.gridHeight} | {wallInfo.tileSizeMm}mm
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {queue.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2">
          {pendingCount > 0 && (
            <Button
              onClick={printAllPending}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Alle drucken ({pendingCount})
            </Button>
          )}
          {queue.filter(t => t.printStatus === 'PRINTED').length > 0 && (
            <Button
              onClick={markAllPlaced}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Alle als platziert markieren
            </Button>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
            <p>Druckqueue wird geladen...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-20">
            <Printer className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-500 mb-2">Keine Druckaufträge</h2>
            <p className="text-gray-400">Sobald Gäste Fotos hochladen, erscheinen die Tiles hier automatisch.</p>
            {autoPrint && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm">
                <Zap className="w-4 h-4" />
                Auto-Print ist aktiv — Tiles werden automatisch gedruckt
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {queue.map((tile) => (
                <motion.div
                  key={tile.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-colors ${
                    tile.printStatus === 'PENDING'
                      ? 'border-yellow-300'
                      : tile.printStatus === 'PRINTING'
                        ? 'border-blue-400 animate-pulse'
                        : 'border-green-300'
                  }`}
                >
                  {/* Tile Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {tile.croppedImageUrl ? (
                      <img
                        src={tile.croppedImageUrl}
                        alt={`Tile ${tile.positionLabel}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        Kein Bild
                      </div>
                    )}

                    {/* Position Badge */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono font-bold">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {tile.positionLabel}
                    </div>

                    {/* Print Number Badge */}
                    {tile.printNumber && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                        #{tile.printNumber}
                      </div>
                    )}

                    {/* Status Overlay */}
                    {tile.printStatus === 'PRINTING' && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                          Druckt...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tile Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {tile.photo?.uploadedBy || 'Gast'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(tile.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1.5">
                      {tile.printStatus === 'PENDING' && (
                        <button
                          onClick={() => triggerPrint(tile)}
                          disabled={printing.has(tile.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Drucken
                        </button>
                      )}
                      {tile.printStatus === 'PRINTING' && (
                        <button
                          onClick={() => updateStatus(tile.id, 'PRINTED')}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Fertig
                        </button>
                      )}
                      {tile.printStatus === 'PRINTED' && (
                        <button
                          onClick={() => updateStatus(tile.id, 'PLACED')}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Platziert
                        </button>
                      )}
                      {tile.printStatus !== 'PENDING' && (
                        <button
                          onClick={() => updateStatus(tile.id, 'PENDING')}
                          className="px-2 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                          title="Zurücksetzen"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Print History */}
        {showHistory && history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Letzte Drucke
            </h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Position</th>
                    <th className="px-4 py-2 text-left">Gast</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Zeit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((tile) => (
                    <tr key={tile.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono font-bold text-purple-600">
                        {tile.printNumber ? `#${tile.printNumber}` : '-'}
                      </td>
                      <td className="px-4 py-2 font-mono">{tile.positionLabel}</td>
                      <td className="px-4 py-2 text-gray-600">{tile.photo?.uploadedBy || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tile.printStatus === 'PRINTED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {tile.printStatus === 'PRINTED' ? 'Gedruckt' : 'Platziert'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {new Date(tile.updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Build HTML for a single tile print label.
 * Designed for ~50x50mm label printers (e.g. Dymo, Brother QL).
 */
function buildLabelHtml(tile: PrintTile, tileSizeMm: number): string {
  const guestName = tile.photo?.uploadedBy || 'Gast';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${tileSizeMm + 10}mm ${tileSizeMm + 18}mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${tileSizeMm + 10}mm;
    height: ${tileSizeMm + 18}mm;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3mm;
  }
  .photo {
    width: ${tileSizeMm}mm;
    height: ${tileSizeMm}mm;
    object-fit: cover;
    border-radius: 1mm;
  }
  .info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: ${tileSizeMm}mm;
    margin-top: 1.5mm;
    font-size: 8pt;
  }
  .position {
    font-weight: bold;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    background: #000;
    color: #fff;
    padding: 0.5mm 2mm;
    border-radius: 1mm;
  }
  .number {
    font-weight: bold;
    font-size: 12pt;
    color: #6b21a8;
  }
  .guest {
    font-size: 6pt;
    color: #999;
    text-align: center;
    margin-top: 1mm;
    max-width: ${tileSizeMm}mm;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
</head>
<body>
  <img class="photo" src="${tile.croppedImageUrl}" alt="Tile" />
  <div class="info">
    <span class="position">${tile.positionLabel}</span>
    <span class="number">#${tile.printNumber || '?'}</span>
  </div>
  <div class="guest">${guestName}</div>
</body>
</html>`;
}
