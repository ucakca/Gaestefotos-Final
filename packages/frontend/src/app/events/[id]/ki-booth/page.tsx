'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { buildApiUrl } from '@/lib/api';
import { Photo, Event as EventType } from '@gaestefotos/shared';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/store/toastStore';
import {
  Sparkles, Wand2, ArrowLeft, Download, Share2, RotateCw,
  Palette, Loader2, Check, Image as ImageIcon, ChevronRight,
} from 'lucide-react';

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

type Step = 'select-photo' | 'select-style' | 'processing' | 'result';

export default function KiBoothPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('select-photo');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processTime, setProcessTime] = useState(0);
  const { showToast } = useToastStore();

  React.useEffect(() => { params.then(p => setEventId(p.id)); }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, photosRes, stylesRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/photos?status=APPROVED&limit=100`),
        api.get('/style-transfer/styles'),
      ]);
      setEvent(eventRes.data.event || eventRes.data);
      setPhotos(photosRes.data.photos || []);
      setStyles(stylesRes.data.styles || []);
    } catch (err) {
      console.error('Load KI Booth data failed', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApplyStyle = async () => {
    if (!selectedPhoto || !selectedStyle || !eventId) return;
    setStep('processing');
    setProcessing(true);
    setResultUrl(null);

    try {
      const { data } = await api.post('/style-transfer/apply', {
        photoId: selectedPhoto.id,
        eventId,
        style: selectedStyle,
      });

      setResultUrl(data.outputUrl);
      setProcessTime(data.durationMs || 0);
      setStep('result');
      showToast('Style Transfer erfolgreich!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Style Transfer fehlgeschlagen';
      showToast(msg, 'error');
      setStep('select-style');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('select-photo');
    setSelectedPhoto(null);
    setSelectedStyle(null);
    setResultUrl(null);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `ki-booth-${selectedStyle}-${Date.now()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'KI Booth Foto', url: resultUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(resultUrl);
      showToast('Link kopiert', 'success');
    }
  };

  if (loading || !eventId) return <FullPageLoader />;

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step !== 'select-photo' && (
            <button onClick={handleReset} className="p-2 rounded-lg hover:bg-app-surface transition">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              KI Booth
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {step === 'select-photo' && 'Wähle ein Foto für den AI Style Transfer'}
              {step === 'select-style' && 'Wähle einen künstlerischen Stil'}
              {step === 'processing' && 'KI verarbeitet dein Foto...'}
              {step === 'result' && 'Dein KI-Kunstwerk ist fertig!'}
            </p>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Foto', 'Stil', 'Ergebnis'].map((label, i) => {
            const stepIdx = ['select-photo', 'select-style', 'result'].indexOf(step);
            const isActive = i <= (step === 'processing' ? 1 : stepIdx);
            return (
              <React.Fragment key={label}>
                {i > 0 && <div className={`flex-1 h-0.5 ${isActive ? 'bg-primary' : 'bg-app-border'}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isActive ? 'bg-primary text-white' : 'bg-app-surface text-muted-foreground'
                  }`}>{i + 1}</div>
                  {label}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Select Photo */}
        {step === 'select-photo' && (
          <div>
            {photos.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Keine Fotos vorhanden</h3>
                <p className="text-muted-foreground">Lade zuerst Fotos hoch, um den KI Booth zu nutzen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {photos.map(photo => (
                  <motion.button
                    key={photo.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedPhoto(photo); setStep('select-style'); }}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition group relative"
                  >
                    {photo.url ? (
                      <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-app-surface flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                      <ChevronRight className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Style */}
        {step === 'select-style' && selectedPhoto && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Ausgewähltes Foto</h3>
              <div className="aspect-square rounded-xl overflow-hidden bg-app-surface">
                {selectedPhoto.url && (
                  <img src={selectedPhoto.url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* Style Grid */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Stil auswählen</h3>
              <div className="grid grid-cols-2 gap-3">
                {styles.map(style => {
                  const preview = STYLE_PREVIEWS[style.key] || { emoji: '🎨', gradient: 'from-gray-400 to-gray-600' };
                  const isSelected = selectedStyle === style.key;
                  return (
                    <motion.button
                      key={style.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedStyle(style.key)}
                      className={`relative p-4 rounded-xl border-2 transition text-left ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${preview.gradient} flex items-center justify-center text-xl mb-2`}>
                        {preview.emoji}
                      </div>
                      <div className="font-medium text-sm text-foreground">{style.name}</div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {selectedStyle && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <Button onClick={handleApplyStyle} className="w-full gap-2" size="lg">
                    <Wand2 className="w-5 h-5" />
                    Style Transfer starten
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-foreground mb-2">KI verarbeitet dein Foto</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Stil: {styles.find(s => s.key === selectedStyle)?.name || selectedStyle}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Dies kann bis zu 60 Sekunden dauern...
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && resultUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Original</h3>
              <div className="aspect-square rounded-xl overflow-hidden bg-app-surface">
                {selectedPhoto?.url && (
                  <img src={selectedPhoto.url} alt="Original" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* Result */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {styles.find(s => s.key === selectedStyle)?.name || 'Ergebnis'}
                </h3>
                {processTime > 0 && (
                  <span className="text-xs text-muted-foreground">{(processTime / 1000).toFixed(1)}s</span>
                )}
              </div>
              <div className="aspect-square rounded-xl overflow-hidden bg-app-surface">
                <img src={resultUrl} alt="KI Ergebnis" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 flex flex-wrap gap-3 justify-center">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" /> Herunterladen
              </Button>
              <Button onClick={handleShare} variant="secondary" className="gap-2">
                <Share2 className="w-4 h-4" /> Teilen
              </Button>
              <Button onClick={() => { setSelectedStyle(null); setResultUrl(null); setStep('select-style'); }}
                variant="secondary" className="gap-2">
                <Palette className="w-4 h-4" /> Anderer Stil
              </Button>
              <Button onClick={handleReset} variant="secondary" className="gap-2">
                <RotateCw className="w-4 h-4" /> Neues Foto
              </Button>
            </div>
          </div>
        )}
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}
