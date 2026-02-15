'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Download,
  Share2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Wand2,
  FlipHorizontal,
} from 'lucide-react';
import api from '@/lib/api';

interface StyleOption {
  key: string;
  name: string;
  strength: number;
}

const STYLE_PREVIEWS: Record<string, { emoji: string; gradient: string }> = {
  'oil-painting': { emoji: '🎨', gradient: 'from-amber-500 to-orange-600' },
  'watercolor': { emoji: '💧', gradient: 'from-sky-400 to-blue-500' },
  'pop-art': { emoji: '🎭', gradient: 'from-pink-500 to-yellow-500' },
  'sketch': { emoji: '✏️', gradient: 'from-gray-400 to-gray-600' },
  'cartoon': { emoji: '🎬', gradient: 'from-green-400 to-teal-500' },
  'vintage': { emoji: '📷', gradient: 'from-amber-600 to-yellow-700' },
  'cyberpunk': { emoji: '🌃', gradient: 'from-violet-500 to-fuchsia-600' },
  'renaissance': { emoji: '🏛️', gradient: 'from-yellow-600 to-amber-800' },
  'anime': { emoji: '✨', gradient: 'from-pink-400 to-purple-500' },
  'neon-glow': { emoji: '💡', gradient: 'from-cyan-400 to-purple-600' },
};

type Step = 'camera' | 'style' | 'processing' | 'result';

interface KiKunstFlowProps {
  eventId: string;
  onClose: () => void;
  onComplete?: (resultUrl: string) => void;
}

export default function KiKunstFlow({ eventId, onClose, onComplete }: KiKunstFlowProps) {
  const [step, setStep] = useState<Step>('camera');
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Load styles
  useEffect(() => {
    api.get('/style-transfer/styles')
      .then(res => setStyles(res.data?.styles || []))
      .catch(() => setStyles([
        { key: 'oil-painting', name: 'Ölgemälde', strength: 0.8 },
        { key: 'watercolor', name: 'Aquarell', strength: 0.7 },
        { key: 'pop-art', name: 'Pop Art', strength: 0.9 },
        { key: 'cartoon', name: 'Cartoon', strength: 0.8 },
        { key: 'anime', name: 'Anime', strength: 0.8 },
        { key: 'neon-glow', name: 'Neon', strength: 0.9 },
      ]));
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setError('Kamera-Zugriff nicht möglich. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [step, startCamera]);

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Center crop to square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (blob) {
        setSelfieBlob(blob);
        setSelfieDataUrl(canvas.toDataURL('image/jpeg', 0.92));
        setStep('style');
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
      }
    }, 'image/jpeg', 0.92);
  };

  const applyStyle = async () => {
    if (!selfieBlob || styles.length === 0) return;
    const style = styles[selectedStyleIndex];
    setStep('processing');
    setProcessing(true);
    setError(null);

    try {
      // Upload selfie first
      const formData = new FormData();
      formData.append('file', selfieBlob, 'selfie.jpg');
      formData.append('eventId', eventId);
      const uploadRes = await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const photoId = uploadRes.data?.photo?.id || uploadRes.data?.id;

      if (!photoId) throw new Error('Upload fehlgeschlagen');

      // Apply style transfer
      const { data } = await api.post('/style-transfer/apply', {
        photoId,
        eventId,
        style: style.key,
      });

      setResultUrl(data.outputUrl);
      setStep('result');
      onComplete?.(data.outputUrl);
    } catch (err: any) {
      setError(err.response?.data?.error || 'KI-Verarbeitung fehlgeschlagen. Bitte versuche es erneut.');
      setStep('style');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `ki-kunst-${styles[selectedStyleIndex]?.key}-${Date.now()}.jpg`;
    a.click();
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    try {
      if (navigator.share) {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const file = new File([blob], 'ki-kunst.jpg', { type: 'image/jpeg' });
        await navigator.share({ title: 'Mein KI-Kunstwerk', files: [file] });
      } else {
        await navigator.clipboard.writeText(resultUrl);
      }
    } catch { /* cancelled */ }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 120;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={onClose} className="p-2 rounded-full bg-card/10 text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-white font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            KI-Kunst
          </h2>
          <p className="text-white/50 text-xs">
            {step === 'camera' && 'Mach ein Selfie'}
            {step === 'style' && 'Wähle einen Stil'}
            {step === 'processing' && 'Wird verarbeitet...'}
            {step === 'result' && 'Dein Kunstwerk!'}
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* CAMERA STEP */}
        {step === 'camera' && (
          <>
            <div className="relative w-full max-w-sm aspect-square mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover rounded-3xl ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground rounded-3xl">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 rounded-3xl border-4 border-white/20 pointer-events-none" />
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {error && (
              <div className="mt-4 px-4 py-2 bg-destructive/100/20 text-destructive/60 rounded-lg text-sm text-center max-w-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                className="p-3 rounded-full bg-card/10 text-white"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={takeSelfie}
                disabled={!cameraReady}
                className="w-20 h-20 rounded-full bg-card flex items-center justify-center shadow-lg active:scale-90 transition disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full border-4 border-border" />
              </button>
              <div className="w-11" />
            </div>
          </>
        )}

        {/* STYLE STEP */}
        {step === 'style' && selfieDataUrl && (
          <div className="flex flex-col items-center w-full px-4">
            <div className="relative w-full max-w-xs aspect-square mx-auto mb-6">
              <img src={selfieDataUrl} alt="Selfie" className="w-full h-full object-cover rounded-3xl" />
              <div className="absolute inset-0 rounded-3xl border-2 border-white/10 pointer-events-none" />
            </div>

            {error && (
              <div className="mb-4 px-4 py-2 bg-destructive/100/20 text-destructive/60 rounded-lg text-sm text-center max-w-sm">
                {error}
              </div>
            )}

            {/* Style Carousel */}
            <div className="w-full max-w-sm relative">
              <button
                onClick={() => scrollCarousel('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                ref={carouselRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide px-8 py-2 snap-x"
              >
                {styles.map((style, i) => {
                  const preview = STYLE_PREVIEWS[style.key] || { emoji: '🎨', gradient: 'from-gray-400 to-gray-600' };
                  const isSelected = i === selectedStyleIndex;
                  return (
                    <button
                      key={style.key}
                      onClick={() => setSelectedStyleIndex(i)}
                      className={`flex-shrink-0 snap-center flex flex-col items-center gap-1.5 transition ${
                        isSelected ? 'scale-110' : 'opacity-60'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${preview.gradient} flex items-center justify-center text-2xl ${
                        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                      }`}>
                        {preview.emoji}
                      </div>
                      <span className="text-[11px] text-white font-medium">{style.name}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => scrollCarousel('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setStep('camera'); setSelfieDataUrl(null); setSelfieBlob(null); }}
                className="px-5 py-2.5 rounded-full bg-card/10 text-white text-sm font-medium"
              >
                Nochmal
              </button>
              <button
                onClick={applyStyle}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg"
              >
                <Wand2 className="w-4 h-4" />
                Stil anwenden
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING STEP */}
        {step === 'processing' && (
          <div className="flex flex-col items-center text-center px-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">KI zaubert...</h3>
            <p className="text-white/50 text-sm">
              Stil: {styles[selectedStyleIndex]?.name || 'Unbekannt'}
            </p>
            <div className="flex items-center gap-2 mt-4 text-white/30 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Kann bis zu 60 Sekunden dauern
            </div>
          </div>
        )}

        {/* RESULT STEP */}
        {step === 'result' && resultUrl && (
          <div className="flex flex-col items-center w-full px-4">
            <div className="relative w-full max-w-sm aspect-square mx-auto mb-6">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                src={resultUrl}
                alt="KI-Kunstwerk"
                className="w-full h-full object-cover rounded-3xl shadow-2xl"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card text-black text-sm font-semibold"
              >
                <Download className="w-4 h-4" /> Speichern
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold"
              >
                <Share2 className="w-4 h-4" /> Teilen
              </button>
              <button
                onClick={() => { setStep('camera'); setSelfieDataUrl(null); setSelfieBlob(null); setResultUrl(null); }}
                className="p-2.5 rounded-full bg-card/10 text-white"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
