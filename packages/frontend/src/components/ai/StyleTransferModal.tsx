'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, ImagePlus, Loader2, ArrowLeft, Download, RotateCcw,
  Sparkles, CheckCircle, AlertTriangle, Wand2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

interface StyleInfo {
  key: string;
  name: string;
  strength: number;
}

interface StyleTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onComplete?: () => void;
}

type Step = 'photo' | 'styles' | 'processing' | 'result' | 'error';

// ─── Style preview colors (visual hint, no actual preview images yet) ───
const STYLE_COLORS: Record<string, { gradient: string; emoji: string }> = {
  'oil-painting':   { gradient: 'from-amber-600 to-yellow-800', emoji: '🎨' },
  'watercolor':     { gradient: 'from-cyan-400 to-blue-300', emoji: '💧' },
  'pop-art':        { gradient: 'from-red-500 to-yellow-400', emoji: '🎪' },
  'sketch':         { gradient: 'from-gray-400 to-gray-700', emoji: '✏️' },
  'cartoon':        { gradient: 'from-green-400 to-blue-500', emoji: '🎬' },
  'vintage':        { gradient: 'from-amber-300 to-orange-700', emoji: '📷' },
  'cyberpunk':      { gradient: 'from-purple-600 to-cyan-400', emoji: '🌃' },
  'renaissance':    { gradient: 'from-amber-800 to-yellow-600', emoji: '🖼️' },
  'anime':          { gradient: 'from-pink-400 to-purple-500', emoji: '🌸' },
  'neon-glow':      { gradient: 'from-fuchsia-500 to-cyan-400', emoji: '✨' },
  'caricature':     { gradient: 'from-orange-400 to-red-500', emoji: '😜' },
  'magazine-cover': { gradient: 'from-rose-500 to-pink-600', emoji: '📰' },
  'comic-hero':     { gradient: 'from-red-600 to-blue-600', emoji: '💥' },
  'lego':           { gradient: 'from-yellow-400 to-red-500', emoji: '🧱' },
  'claymation':     { gradient: 'from-orange-300 to-amber-500', emoji: '🎭' },
  'neon-portrait':  { gradient: 'from-violet-500 to-fuchsia-400', emoji: '💜' },
  'barbie':         { gradient: 'from-pink-400 to-pink-600', emoji: '💖' },
  'ghibli':         { gradient: 'from-green-300 to-blue-400', emoji: '🌿' },
  'headshot':       { gradient: 'from-slate-400 to-slate-600', emoji: '👤' },
  'stained-glass':  { gradient: 'from-purple-500 to-amber-400', emoji: '🪟' },
  'ukiyo-e':        { gradient: 'from-red-400 to-blue-600', emoji: '🏯' },
};

const DEFAULT_STYLE = { gradient: 'from-purple-500 to-pink-500', emoji: '🎨' };

// ─── Component ──────────────────────────────────────────────

export default function StyleTransferModal({ isOpen, onClose, eventId, onComplete }: StyleTransferModalProps) {
  const [step, setStep] = useState<Step>('photo');
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load styles on open
  useEffect(() => {
    if (!isOpen) return;
    setStylesLoading(true);
    api.get('/style-transfer/styles')
      .then(res => setStyles(res.data.styles || []))
      .catch(() => setStyles([]))
      .finally(() => setStylesLoading(false));
  }, [isOpen]);

  // Reset on close
  const handleClose = useCallback(() => {
    setStep('photo');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedStyle(null);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    onClose();
  }, [onClose]);

  // Handle photo selection
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setStep('styles');
  }, []);

  // Execute the style transfer
  const handleApplyStyle = useCallback(async (styleKey: string) => {
    if (!photoFile || !eventId) return;

    setSelectedStyle(styleKey);
    setStep('processing');
    setProcessing(true);
    setProgress(0);
    setError(null);

    // Fake progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 8;
      });
    }, 500);

    try {
      // Step 1: Upload the photo
      const formData = new FormData();
      formData.append('file', photoFile, 'photo.jpg');
      const savedName = typeof window !== 'undefined' ? localStorage.getItem('guestUploaderName') : '';
      if (savedName) formData.append('uploaderName', savedName);

      const uploadRes = await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const photoId = uploadRes.data?.photo?.id;
      if (!photoId) throw new Error('Upload fehlgeschlagen — keine Photo-ID erhalten');

      setProgress(40);

      // Step 2: Apply style transfer
      const styleRes = await api.post('/style-transfer/apply', {
        photoId,
        eventId,
        style: styleKey,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (styleRes.data?.outputUrl) {
        setResultUrl(styleRes.data.outputUrl);
        setStep('result');
      } else {
        throw new Error('Kein Ergebnis vom Style Transfer erhalten');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      const msg = err?.response?.data?.error || err?.message || 'Style Transfer fehlgeschlagen';
      setError(msg);
      setStep('error');
    } finally {
      setProcessing(false);
    }
  }, [photoFile, eventId]);

  // Download result
  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ki-foto-stil-${selectedStyle || 'result'}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(resultUrl, '_blank');
    }
  }, [resultUrl, selectedStyle]);

  const getStyleVisual = (key: string) => STYLE_COLORS[key] || DEFAULT_STYLE;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {step !== 'photo' && step !== 'processing' && (
              <button
                onClick={() => {
                  if (step === 'styles') setStep('photo');
                  else if (step === 'result' || step === 'error') setStep('styles');
                }}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {step === 'photo' && 'Foto wählen'}
                {step === 'styles' && 'Stil wählen'}
                {step === 'processing' && 'KI arbeitet...'}
                {step === 'result' && 'Dein KI-Bild'}
                {step === 'error' && 'Fehler'}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          <AnimatePresence mode="wait">

            {/* ═══ Step 1: Photo Selection ═══ */}
            {step === 'photo' && (
              <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                {/* Photo preview if already selected */}
                {photoPreview && (
                  <div className="relative mb-4 rounded-2xl overflow-hidden">
                    <img src={photoPreview} alt="Vorschau" className="w-full max-h-64 object-contain bg-black/5 rounded-2xl" />
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <p className="text-sm text-muted-foreground text-center mb-5">
                  Wähle ein Foto und lass die KI es in einen Kunststil verwandeln
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Camera */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:from-blue-500/20 hover:to-cyan-500/20 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Foto aufnehmen</span>
                  </button>

                  {/* Gallery */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
                      <ImagePlus className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Aus Galerie</span>
                  </button>
                </div>

                {/* Hidden inputs */}
                <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

                {/* Next button if photo already selected */}
                {photoPreview && (
                  <button
                    onClick={() => setStep('styles')}
                    className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Sparkles className="w-4 h-4" />
                    Weiter — Stil wählen
                  </button>
                )}
              </motion.div>
            )}

            {/* ═══ Step 2: Style Gallery ═══ */}
            {step === 'styles' && (
              <motion.div key="styles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
                {/* Photo mini-preview */}
                {photoPreview && (
                  <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-muted/30">
                    <img src={photoPreview} alt="Dein Foto" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Dein Foto</p>
                      <p className="text-xs text-muted-foreground">Tippe auf einen Stil</p>
                    </div>
                  </div>
                )}

                {stylesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {styles.map((style, i) => {
                      const visual = getStyleVisual(style.key);
                      return (
                        <motion.button
                          key={style.key}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => handleApplyStyle(style.key)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/50 hover:shadow-md active:scale-[0.95] transition-all"
                        >
                          <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${visual.gradient} flex items-center justify-center text-2xl shadow-sm`}>
                            {visual.emoji}
                          </div>
                          <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                            {style.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Step 3: Processing ═══ */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 px-6 gap-5">
                {/* Animated icon */}
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
                  >
                    <Wand2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                </div>

                <div className="text-center">
                  <p className="text-foreground font-bold text-lg">KI zaubert...</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Dein Foto wird in <span className="font-semibold text-foreground">{styles.find(s => s.key === selectedStyle)?.name || selectedStyle}</span> verwandelt
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {progress < 40 ? 'Foto wird hochgeladen...' : progress < 90 ? 'KI verarbeitet Bild...' : 'Fast fertig...'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══ Step 4: Result ═══ */}
            {step === 'result' && resultUrl && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4">
                <div className="relative rounded-2xl overflow-hidden mb-4 bg-black/5">
                  <img
                    src={resultUrl}
                    alt="KI-Ergebnis"
                    className="w-full max-h-[50vh] object-contain rounded-2xl"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span className="text-[11px] text-white font-medium">
                      {styles.find(s => s.key === selectedStyle)?.name || selectedStyle}
                    </span>
                  </div>
                </div>

                {/* Before/After mini */}
                {photoPreview && (
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <div className="text-center">
                      <img src={photoPreview} alt="Vorher" className="w-16 h-16 rounded-lg object-cover border border-border" />
                      <p className="text-[10px] text-muted-foreground mt-1">Vorher</p>
                    </div>
                    <span className="text-muted-foreground text-lg">→</span>
                    <div className="text-center">
                      <img src={resultUrl} alt="Nachher" className="w-16 h-16 rounded-lg object-cover border-2 border-primary" />
                      <p className="text-[10px] text-primary font-medium mt-1">Nachher</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Download className="w-4 h-4" />
                    Herunterladen
                  </button>
                  <button
                    onClick={() => { setSelectedStyle(null); setResultUrl(null); setStep('styles'); }}
                    className="py-3 px-4 bg-muted text-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Nochmal
                  </button>
                </div>

                {/* Done button */}
                <button
                  onClick={() => { onComplete?.(); handleClose(); }}
                  className="mt-3 w-full py-3 bg-muted/50 text-muted-foreground rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Fertig
                </button>
              </motion.div>
            )}

            {/* ═══ Step 5: Error ═══ */}
            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 gap-4 px-6">
                <AlertTriangle className="w-14 h-14 text-destructive" />
                <div className="text-center">
                  <p className="text-foreground font-bold text-lg">Fehler aufgetreten</p>
                  <p className="text-muted-foreground text-sm mt-1">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('styles')}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
                  >
                    Nochmal versuchen
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium"
                  >
                    Schließen
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
