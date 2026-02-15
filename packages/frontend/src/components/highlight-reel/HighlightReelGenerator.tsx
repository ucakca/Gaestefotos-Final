import logger from '@/lib/logger';
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, Download, Trash2, RefreshCw, Settings, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HighlightReelGeneratorProps {
  eventId: string;
  eventSlug: string;
}

interface ReelProgress {
  status: 'preparing' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface ReelSettings {
  duration: number;
  maxPhotos: number;
  resolution: '720p' | '1080p' | '4k';
  transition: 'fade' | 'slide' | 'zoom';
}

export default function HighlightReelGenerator({ eventId, eventSlug }: HighlightReelGeneratorProps) {
  const [reels, setReels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ReelProgress | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReelSettings>({
    duration: 3,
    maxPhotos: 20,
    resolution: '1080p',
    transition: 'fade',
  });

  // Fetch existing reels
  useEffect(() => {
    fetchReels();
  }, [eventId]);

  // Poll for progress
  useEffect(() => {
    if (!currentJobId || !isGenerating) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/progress/${currentJobId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
          
          if (data.status === 'complete') {
            setIsGenerating(false);
            setCurrentJobId(null);
            fetchReels();
          } else if (data.status === 'error') {
            setIsGenerating(false);
            setCurrentJobId(null);
          }
        }
      } catch (err) {
        logger.error('Progress fetch error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJobId, isGenerating, eventId]);

  const fetchReels = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReels(data.reels || []);
      }
    } catch (err) {
      logger.error('Fetch reels error:', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress({ status: 'preparing', progress: 0, message: 'Starte...' });

    try {
      const res = await fetch(`/api/events/${eventId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentJobId(data.jobId);
      } else {
        const error = await res.json();
        setProgress({ status: 'error', progress: 0, message: error.error || 'Fehler' });
        setIsGenerating(false);
      }
    } catch (err) {
      setProgress({ status: 'error', progress: 0, message: 'Netzwerkfehler' });
      setIsGenerating(false);
    }
  };

  const handleDelete = async (url: string) => {
    const filename = url.split('/').pop();
    if (!filename) return;

    try {
      await fetch(`/api/events/${eventId}/${filename}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchReels();
    } catch (err) {
      logger.error('Delete error:', err);
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-success/100';
      case 'error': return 'bg-destructive/100';
      default: return 'bg-amber-500';
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">Highlight Reel</h3>
            <p className="text-sm text-stone-500">Automatisches Video aus deinen besten Fotos</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-stone-100 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Sekunden pro Foto</label>
                <select
                  value={settings.duration}
                  onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  <option value={2}>2 Sekunden</option>
                  <option value={3}>3 Sekunden</option>
                  <option value={4}>4 Sekunden</option>
                  <option value={5}>5 Sekunden</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Max. Fotos</label>
                <select
                  value={settings.maxPhotos}
                  onChange={(e) => setSettings({ ...settings, maxPhotos: Number(e.target.value) })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  <option value={10}>10 Fotos</option>
                  <option value={20}>20 Fotos</option>
                  <option value={30}>30 Fotos</option>
                  <option value={50}>50 Fotos</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Auflösung</label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings({ ...settings, resolution: e.target.value as '720p' | '1080p' | '4k' })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="4k">4K (Ultra HD)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Übergang</label>
                <select
                  value={settings.transition}
                  onChange={(e) => setSettings({ ...settings, transition: e.target.value as 'fade' | 'slide' | 'zoom' })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  <option value="fade">Überblenden</option>
                  <option value="zoom">Ken Burns (Zoom)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      {isGenerating && progress && (
        <div className="p-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span className="text-sm font-medium text-stone-700">{progress.message}</span>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getProgressColor(progress.status)}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Existing Reels */}
      {reels.length > 0 && (
        <div className="p-4 border-b border-stone-100">
          <h4 className="text-sm font-medium text-stone-600 mb-3">Deine Videos</h4>
          <div className="space-y-2">
            {reels.map((url, index) => (
              <div
                key={url}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Play className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-stone-700">
                    Highlight Reel {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-stone-200 text-stone-500"
                  >
                    <Play className="w-4 h-4" />
                  </a>
                  <a
                    href={url}
                    download
                    className="p-2 rounded-lg hover:bg-stone-200 text-stone-500"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(url)}
                    className="p-2 rounded-lg hover:bg-destructive/15 text-stone-500 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="p-4">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generiere...
            </>
          ) : (
            <>
              <Film className="w-4 h-4 mr-2" />
              Neues Highlight Reel erstellen
            </>
          )}
        </Button>
        <p className="text-xs text-stone-500 text-center mt-2">
          Die beliebtesten Fotos werden automatisch ausgewählt
        </p>
      </div>
    </div>
  );
}
