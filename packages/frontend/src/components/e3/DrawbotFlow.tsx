'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
  Download,
  Share2,
  RotateCw,
  Image as ImageIcon,
  Sliders,
} from 'lucide-react';
import api from '@/lib/api';

interface DrawbotFlowProps {
  eventId: string;
  visitorId?: string;
  visitorName?: string;
  photos?: { id: string; url: string }[];
  onClose: () => void;
}

const STYLE_OPTIONS = [
  { key: 'LINE_ART', name: 'Linien', icon: '✏️', desc: 'Klare Konturen' },
  { key: 'CONTOUR', name: 'Kontur', icon: '🖊️', desc: 'Weiche Umrisse' },
  { key: 'STIPPLE', name: 'Punkte', icon: '⚬', desc: 'Tausende Punkte' },
  { key: 'CROSS_HATCH', name: 'Schraffur', icon: '▦', desc: 'Kreuzschraffur' },
  { key: 'PORTRAIT', name: 'Portrait', icon: '🎨', desc: 'Für Gesichter' },
  { key: 'ABSTRACT', name: 'Abstrakt', icon: '🌀', desc: 'Kreativ' },
];

const PEN_COLORS = [
  { color: '#000000', label: 'Schwarz' },
  { color: '#1a237e', label: 'Dunkelblau' },
  { color: '#b71c1c', label: 'Rot' },
  { color: '#1b5e20', label: 'Grün' },
  { color: '#4a148c', label: 'Lila' },
  { color: '#e65100', label: 'Orange' },
];

type Step = 'photo' | 'style' | 'queue' | 'drawing' | 'result';

export default function DrawbotFlow({ eventId, visitorId, visitorName, photos = [], onClose }: DrawbotFlowProps) {
  const [step, setStep] = useState<Step>('photo');
  const [selectedPhoto, setSelectedPhoto] = useState<{ id: string; url: string } | null>(null);
  const [style, setStyle] = useState('LINE_ART');
  const [penColor, setPenColor] = useState('#000000');
  const [complexity, setComplexity] = useState(50);
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [drawProgress, setDrawProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState(photos);

  // Load photos if not provided
  useEffect(() => {
    if (eventPhotos.length > 0) return;
    api.get(`/events/${eventId}/photos?status=APPROVED&limit=50`)
      .then(res => {
        const p = (res.data?.photos || []).map((ph: any) => ({ id: ph.id, url: ph.url || ph.thumbnailUrl }));
        setEventPhotos(p);
      })
      .catch(() => {});
  }, [eventId, eventPhotos.length]);

  const startJob = async () => {
    if (!selectedPhoto) return;
    setError(null);
    try {
      const { data } = await api.post(`/events/${eventId}/drawbot`, {
        visitorId,
        visitorName,
        sourceImageUrl: selectedPhoto.url,
        sourcePhotoId: selectedPhoto.id,
        style,
        penColor,
        complexity,
      });
      setJobId(data.job.id);
      setQueuePosition(data.queuePosition);
      setEstimatedTime(data.estimatedTimeMs);
      setStep('queue');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Auftrags');
    }
  };

  // Poll queue / status
  useEffect(() => {
    if (!jobId || (step !== 'queue' && step !== 'drawing')) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/events/${eventId}/drawbot`);
        const job = data.jobs?.find((j: any) => j.id === jobId);
        if (!job) return;

        if (job.status === 'CONVERTING' || job.status === 'DRAWING') {
          setStep('drawing');
          if (job.processingStartedAt && job.estimatedTimeMs) {
            const elapsed = Date.now() - new Date(job.processingStartedAt).getTime();
            setDrawProgress(Math.min(95, (elapsed / job.estimatedTimeMs) * 100));
          }
        }
        if (job.status === 'DONE') {
          setOutputUrl(job.outputImageUrl);
          setDrawProgress(100);
          setStep('result');
        }
        if (job.status === 'FAILED') {
          setError('Zeichnung fehlgeschlagen');
          setStep('photo');
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, jobId, eventId]);

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `drawbot-${style.toLowerCase()}-${Date.now()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!outputUrl) return;
    try {
      if (navigator.share) {
        const res = await fetch(outputUrl);
        const blob = await res.blob();
        const file = new File([blob], 'drawbot-art.png', { type: 'image/png' });
        await navigator.share({ title: 'Drawbot Zeichnung', files: [file] });
      } else {
        await navigator.clipboard.writeText(outputUrl);
      }
    } catch { /* cancelled */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-stone-900 to-stone-950 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-bold flex items-center gap-2">
          <PenTool className="w-5 h-5 text-amber-400" />
          Drawbot
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
        {/* PHOTO SELECTION */}
        {step === 'photo' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <p className="text-white/50 text-sm text-center mb-4">Wähle ein Foto für die Zeichnung</p>
            {eventPhotos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">Keine Fotos verfügbar</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
                {eventPhotos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => { setSelectedPhoto(photo); setStep('style'); }}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-amber-400 transition group relative"
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STYLE SELECTION */}
        {step === 'style' && selectedPhoto && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
            {/* Preview */}
            <div className="aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-white/10">
              <img src={selectedPhoto.url} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Style Grid */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Zeichenstil</h3>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setStyle(opt.key)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      style === opt.key
                        ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2 ring-offset-stone-900'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-[10px] font-medium">{opt.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pen Color */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Stiftfarbe</h3>
              <div className="flex gap-2 justify-center">
                {PEN_COLORS.map(pc => (
                  <button
                    key={pc.color}
                    onClick={() => setPenColor(pc.color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      penColor === pc.color ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: pc.color }}
                    title={pc.label}
                  />
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                Detail: {complexity}%
              </h3>
              <input
                type="range"
                min={10}
                max={100}
                value={complexity}
                onChange={e => setComplexity(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>Minimal</span>
                <span>Maximum</span>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm text-center">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('photo'); setSelectedPhoto(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium"
              >
                Zurück
              </button>
              <button
                onClick={startJob}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <PenTool className="w-4 h-4" /> Zeichnen lassen
              </button>
            </div>
          </motion.div>
        )}

        {/* QUEUE */}
        {step === 'queue' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <PenTool className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">In der Warteschlange</h3>
            <p className="text-4xl font-black text-amber-400 mb-2">#{queuePosition}</p>
            <p className="text-white/50 text-sm">Geschätzte Zeit: {Math.round(estimatedTime / 1000)}s</p>
          </motion.div>
        )}

        {/* DRAWING */}
        {step === 'drawing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full max-w-sm">
            <motion.div
              animate={{ x: [0, 10, -5, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-6"
            >
              <PenTool className="w-16 h-16 text-amber-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-4">Drawbot zeichnet...</h3>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                animate={{ width: `${drawProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2">{Math.round(drawProgress)}%</p>
          </motion.div>
        )}

        {/* RESULT */}
        {step === 'result' && outputUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="aspect-square rounded-3xl overflow-hidden bg-white mb-6 shadow-2xl p-4">
              <img src={outputUrl} alt="Drawbot Zeichnung" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold">
                <Download className="w-4 h-4" /> Speichern
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">
                <Share2 className="w-4 h-4" /> Teilen
              </button>
              <button
                onClick={() => { setStep('photo'); setSelectedPhoto(null); setOutputUrl(null); setJobId(null); }}
                className="p-2.5 rounded-full bg-white/10 text-white"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
