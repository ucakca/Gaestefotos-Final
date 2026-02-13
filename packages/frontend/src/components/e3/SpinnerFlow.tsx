'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw,
  Play,
  Download,
  Share2,
  X,
  Loader2,
  Zap,
  Music,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';

interface SpinnerFlowProps {
  eventId: string;
  visitorId?: string;
  visitorName?: string;
  onClose: () => void;
}

const SPEED_OPTIONS = [
  { key: 'SLOW', label: 'Langsam', icon: '🐢' },
  { key: 'NORMAL', label: 'Normal', icon: '🏃' },
  { key: 'FAST', label: 'Schnell', icon: '🚀' },
  { key: 'LUDICROUS', label: 'Wahnsinn', icon: '⚡' },
];

const EFFECT_OPTIONS = [
  { key: 'NONE', label: 'Kein Effekt', icon: '🎥' },
  { key: 'SLOW_MOTION', label: 'Slow Motion', icon: '🐌' },
  { key: 'BOOMERANG', label: 'Boomerang', icon: '🪃' },
  { key: 'FREEZE_FRAME', label: 'Freeze Frame', icon: '❄️' },
  { key: 'SPEED_RAMP', label: 'Speed Ramp', icon: '📈' },
  { key: 'SPARKLE', label: 'Sparkle', icon: '✨' },
  { key: 'NEON_TRAIL', label: 'Neon Trail', icon: '💫' },
];

type Step = 'config' | 'queue' | 'recording' | 'processing' | 'result';

export default function SpinnerFlow({ eventId, visitorId, visitorName, onClose }: SpinnerFlowProps) {
  const [step, setStep] = useState<Step>('config');
  const [speed, setSpeed] = useState('NORMAL');
  const [effect, setEffect] = useState('NONE');
  const [duration, setDuration] = useState(3);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const joinQueue = async () => {
    try {
      setError(null);
      const { data } = await api.post(`/events/${eventId}/spinner`, {
        visitorId,
        visitorName,
        duration,
        speed,
        effect,
      });
      setSessionId(data.session.id);
      setQueuePosition(data.queuePosition);
      setStep('queue');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Beitreten der Warteschlange');
    }
  };

  // Poll queue status
  useEffect(() => {
    if (step !== 'queue' || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/events/${eventId}/spinner/queue`);
        if (data.current?.id === sessionId) {
          setStep('recording');
        } else {
          const pos = data.waiting.findIndex((s: any) => s.id === sessionId);
          setQueuePosition(pos >= 0 ? pos + 1 : queuePosition);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, sessionId, eventId, queuePosition]);

  // Poll for completion
  useEffect(() => {
    if ((step !== 'recording' && step !== 'processing') || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/events/${eventId}/spinner`);
        const session = data.sessions?.find((s: any) => s.id === sessionId);
        if (session?.status === 'PROCESSING') setStep('processing');
        if (session?.status === 'READY' || session?.status === 'SHARED') {
          setVideoUrl(session.videoUrl);
          setShareUrl(session.shareUrl);
          setStep('result');
        }
        if (session?.status === 'FAILED') {
          setError('Aufnahme fehlgeschlagen');
          setStep('config');
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, sessionId, eventId]);

  const handleShare = async () => {
    if (!sessionId) return;
    try {
      const { data } = await api.post(`/events/${eventId}/spinner/${sessionId}/share`);
      setShareUrl(data.shareUrl);
      if (navigator.share && videoUrl) {
        await navigator.share({ title: '360° Spinner Video', url: data.shareUrl });
      } else if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
      }
    } catch { /* cancelled */ }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `spinner-360-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-bold flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-cyan-400" />
          360° Spinner
        </h2>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* CONFIG */}
        {step === 'config' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
            {/* Speed Selection */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Geschwindigkeit</h3>
              <div className="grid grid-cols-4 gap-2">
                {SPEED_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSpeed(opt.key)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      speed === opt.key
                        ? 'bg-cyan-500 text-white ring-2 ring-cyan-300 ring-offset-2 ring-offset-gray-900'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="text-[10px] font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Effect Selection */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Effekt</h3>
              <div className="grid grid-cols-4 gap-2">
                {EFFECT_OPTIONS.slice(0, 4).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setEffect(opt.key)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      effect === opt.key
                        ? 'bg-purple-500 text-white ring-2 ring-purple-300 ring-offset-2 ring-offset-gray-900'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="text-[10px] font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {showSettings && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {EFFECT_OPTIONS.slice(4).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setEffect(opt.key)}
                          className={`p-3 rounded-xl text-center transition-all ${
                            effect === opt.key
                              ? 'bg-purple-500 text-white ring-2 ring-purple-300 ring-offset-2 ring-offset-gray-900'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl mb-1">{opt.icon}</div>
                          <div className="text-[10px] font-medium">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1 mx-auto mt-2 text-xs text-white/40 hover:text-white/60">
                <ChevronDown className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                {showSettings ? 'Weniger' : 'Mehr Effekte'}
              </button>
            </div>

            {/* Duration */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Dauer: {duration}s</h3>
              <input
                type="range"
                min={1}
                max={10}
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm text-center">{error}</div>
            )}

            <button
              onClick={joinQueue}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-5 h-5" /> In Warteschlange
            </button>
          </motion.div>
        )}

        {/* QUEUE */}
        {step === 'queue' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 rounded-full border-4 border-cyan-500 border-t-transparent mx-auto mb-6"
            />
            <h3 className="text-2xl font-bold text-white mb-2">In der Warteschlange</h3>
            <p className="text-5xl font-black text-cyan-400 mb-2">#{queuePosition}</p>
            <p className="text-white/50 text-sm">Gleich bist du dran!</p>
          </motion.div>
        )}

        {/* RECORDING */}
        {step === 'recording' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/50"
            >
              <div className="w-6 h-6 rounded-full bg-white animate-pulse" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">Aufnahme läuft!</h3>
            <p className="text-white/50 text-sm">Bitte auf der Plattform stehen bleiben</p>
          </motion.div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Wird verarbeitet...</h3>
            <p className="text-white/50 text-sm">Dein Video wird erstellt</p>
          </motion.div>
        )}

        {/* RESULT */}
        {step === 'result' && videoUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="aspect-square rounded-3xl overflow-hidden bg-black mb-6 shadow-2xl">
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold">
                <Download className="w-4 h-4" /> Speichern
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">
                <Share2 className="w-4 h-4" /> Teilen
              </button>
              <button
                onClick={() => { setStep('config'); setSessionId(null); setVideoUrl(null); }}
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
