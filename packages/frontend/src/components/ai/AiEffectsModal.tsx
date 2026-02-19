'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, ImagePlus, Loader2, ArrowLeft, Download, RotateCcw,
  Sparkles, Wand2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

type EffectKey = 'ai_oldify' | 'ai_cartoon' | 'ai_style_pop' | 'face_switch' | 'bg_removal' | 'gif_morph' | 'ai_video';
type Step = 'photo' | 'effects' | 'processing' | 'result' | 'error';

interface EffectDef {
  key: EffectKey;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  endpoint: string;
}

interface AiEffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onComplete?: () => void;
}

const EFFECTS: EffectDef[] = [
  {
    key: 'ai_oldify',
    name: 'Oldify',
    emoji: '👴',
    description: 'So siehst du in 40 Jahren aus!',
    gradient: 'from-amber-600 to-orange-700',
    endpoint: '/booth-games/style-effect',
  },
  {
    key: 'ai_cartoon',
    name: 'Pixar Cartoon',
    emoji: '🎬',
    description: 'Werde ein 3D Cartoon-Charakter!',
    gradient: 'from-blue-500 to-cyan-500',
    endpoint: '/booth-games/style-effect',
  },
  {
    key: 'ai_style_pop',
    name: 'Style Pop',
    emoji: '🎨',
    description: 'Dein Foto im Pop-Art-Stil!',
    gradient: 'from-fuchsia-500 to-pink-500',
    endpoint: '/booth-games/style-effect',
  },
  {
    key: 'face_switch',
    name: 'Face Swap',
    emoji: '🔄',
    description: 'Gesichter im Gruppenfoto tauschen!',
    gradient: 'from-emerald-500 to-teal-500',
    endpoint: '/booth-games/face-switch',
  },
  {
    key: 'bg_removal',
    name: 'Hintergrund weg',
    emoji: '✂️',
    description: 'Hintergrund entfernen — nur du!',
    gradient: 'from-violet-500 to-purple-600',
    endpoint: '/booth-games/bg-removal',
  },
  {
    key: 'gif_morph',
    name: 'GIF Morph',
    emoji: '🎭',
    description: 'Animiertes GIF: Dein Foto in 2 Kunststilen!',
    gradient: 'from-rose-500 to-amber-500',
    endpoint: '/booth-games/gif-morph',
  },
  {
    key: 'ai_video',
    name: 'AI Video',
    emoji: '🎬',
    description: 'Dein Foto wird zum lebendigen Video!',
    gradient: 'from-red-500 to-pink-600',
    endpoint: '/booth-games/ai-video',
  },
];

// ─── Component ──────────────────────────────────────────────

export default function AiEffectsModal({ isOpen, onClose, eventId, onComplete }: AiEffectsModalProps) {
  const [step, setStep] = useState<Step>('photo');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<EffectDef | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setStep('photo');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedEffect(null);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    onClose();
  }, [onClose]);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setStep('effects');
  }, []);

  const handleApplyEffect = useCallback(async (effect: EffectDef) => {
    if (!photoFile || !eventId) return;

    setSelectedEffect(effect);
    setStep('processing');
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 6;
      });
    }, 600);

    try {
      // Step 1: Upload the photo first
      const formData = new FormData();
      formData.append('file', photoFile, 'photo.jpg');
      const savedName = typeof window !== 'undefined' ? localStorage.getItem('guestUploaderName') : '';
      if (savedName) formData.append('uploaderName', savedName);

      const uploadRes = await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const photoId = uploadRes.data?.photo?.id;
      if (!photoId) throw new Error('Upload fehlgeschlagen');

      setProgress(40);

      // Step 2: Apply the AI effect (different endpoints per type)
      let effectRes;
      if (effect.key === 'ai_video') {
        effectRes = await api.post(effect.endpoint, { photoId, eventId });
      } else if (effect.key === 'gif_morph') {
        effectRes = await api.post(effect.endpoint, { photoId, eventId });
      } else if (effect.key === 'face_switch' || effect.key === 'bg_removal') {
        effectRes = await api.post(effect.endpoint, { photoId });
      } else {
        effectRes = await api.post(effect.endpoint, { photoId, effect: effect.key });
      }

      // AI Video needs polling (async generation)
      if (effect.key === 'ai_video' && effectRes.data?.jobId) {
        const jobId = effectRes.data.jobId;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 5000));
          setProgress(Math.min(40 + i * 1.5, 95));
          try {
            const statusRes = await api.get(`/booth-games/ai-video/status/${jobId}`);
            if (statusRes.data?.status === 'completed' && statusRes.data?.videoUrl) {
              clearInterval(progressInterval);
              setProgress(100);
              setResultUrl(statusRes.data.videoUrl);
              setStep('result');
              return;
            }
            if (statusRes.data?.status === 'failed') {
              throw new Error(statusRes.data?.error || 'Video-Generierung fehlgeschlagen');
            }
          } catch (pollErr: any) {
            if (pollErr?.response?.status !== 404) throw pollErr;
          }
        }
        throw new Error('Video-Generierung Timeout');
      }

      clearInterval(progressInterval);
      setProgress(100);

      const resultPath = effectRes.data?.newPhotoPath || effectRes.data?.gifUrl;
      if (effectRes.data?.success && resultPath) {
        setResultUrl(resultPath);
        setStep('result');
      } else {
        throw new Error('Kein Ergebnis erhalten');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err?.response?.data?.error || err?.message || 'Effekt fehlgeschlagen');
      setStep('error');
    }
  }, [photoFile, eventId]);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ki-effekt-${selectedEffect?.key || 'result'}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(resultUrl, '_blank');
    }
  }, [resultUrl, selectedEffect]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {step !== 'photo' && step !== 'processing' && (
              <button
                onClick={() => {
                  if (step === 'effects') setStep('photo');
                  else if (step === 'result' || step === 'error') setStep('effects');
                }}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {step === 'photo' && 'Foto wählen'}
                {step === 'effects' && 'Effekt wählen'}
                {step === 'processing' && 'KI verarbeitet...'}
                {step === 'result' && 'Dein KI-Effekt'}
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

            {/* ═══ Photo Selection ═══ */}
            {step === 'photo' && (
              <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
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
                  Wähle ein Foto für den KI-Effekt
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:from-blue-500/20 hover:to-cyan-500/20 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Foto aufnehmen</span>
                  </button>

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

                <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

                {photoPreview && (
                  <button
                    onClick={() => setStep('effects')}
                    className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Sparkles className="w-4 h-4" />
                    Weiter — Effekt wählen
                  </button>
                )}
              </motion.div>
            )}

            {/* ═══ Effect Selection ═══ */}
            {step === 'effects' && (
              <motion.div key="effects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4">
                {photoPreview && (
                  <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-muted/30">
                    <img src={photoPreview} alt="Dein Foto" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Dein Foto</p>
                      <p className="text-xs text-muted-foreground">Tippe auf einen Effekt</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {EFFECTS.map((effect, i) => (
                    <motion.button
                      key={effect.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handleApplyEffect(effect)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all text-left"
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${effect.gradient} flex items-center justify-center text-2xl shadow-md shrink-0`}>
                        {effect.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">{effect.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{effect.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ Processing ═══ */}
            {step === 'processing' && selectedEffect && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 px-6 gap-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedEffect.gradient} flex items-center justify-center text-4xl shadow-lg`}
                >
                  {selectedEffect.emoji}
                </motion.div>
                <div className="text-center">
                  <p className="text-foreground font-bold text-lg">KI arbeitet...</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    <span className="font-semibold text-foreground">{selectedEffect.name}</span> wird angewendet
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${selectedEffect.gradient}`}
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

            {/* ═══ Result ═══ */}
            {step === 'result' && resultUrl && selectedEffect && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4">
                <div className="relative rounded-2xl overflow-hidden mb-4 bg-black/5">
                  <img src={resultUrl} alt="KI-Ergebnis" className="w-full max-h-[50vh] object-contain rounded-2xl" />
                  <div className={`absolute top-2 right-2 px-2.5 py-1 bg-gradient-to-r ${selectedEffect.gradient} rounded-full flex items-center gap-1.5`}>
                    <span className="text-sm">{selectedEffect.emoji}</span>
                    <span className="text-[11px] text-white font-medium">{selectedEffect.name}</span>
                  </div>
                </div>

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
                    onClick={() => { setSelectedEffect(null); setResultUrl(null); setStep('effects'); }}
                    className="py-3 px-4 bg-muted text-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => { onComplete?.(); handleClose(); }}
                  className="mt-3 w-full py-2.5 text-muted-foreground text-sm text-center"
                >
                  Fertig
                </button>
              </motion.div>
            )}

            {/* ═══ Error ═══ */}
            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 gap-4 px-6">
                <div className="text-5xl">😅</div>
                <p className="text-foreground font-bold">Effekt fehlgeschlagen</p>
                <p className="text-muted-foreground text-sm text-center">{error}</p>
                <button
                  onClick={() => setStep('effects')}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
                >
                  Nochmal versuchen
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
