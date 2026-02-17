'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Camera, Upload, Copy, Check, X, Loader2, QrCode, RotateCcw } from 'lucide-react';
import api from '@/lib/api';

interface MosaicPrintUploadProps {
  eventId: string;
  eventSlug: string;
}

interface PrintCode {
  pinCode: string;
  qrPayload: string;
  expiresAt: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function MosaicPrintUpload({ eventId, eventSlug }: MosaicPrintUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [printCode, setPrintCode] = useState<PrintCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setState('uploading');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const { data } = await api.post(`/events/${eventId}/mosaic/print-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      if (data.ok) {
        setPrintCode({
          pinCode: data.pinCode,
          qrPayload: data.qrPayload,
          expiresAt: data.expiresAt,
        });
        setState('success');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload fehlgeschlagen');
      setState('error');
    }
  }, [eventId]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleUpload(file);
  }, [handleUpload]);

  const copyCode = useCallback(() => {
    if (!printCode) return;
    navigator.clipboard.writeText(printCode.pinCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [printCode]);

  const reset = useCallback(() => {
    setState('idle');
    setPrintCode(null);
    setError(null);
    setProgress(0);
  }, []);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelect}
      />

      <AnimatePresence mode="wait">
        {/* ─── IDLE: Upload Button ─── */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm text-foreground">Foto für Mosaic Wall</div>
                <div className="text-xs text-muted-foreground">Hochladen & am Terminal drucken</div>
              </div>
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* ─── UPLOADING ─── */}
        {state === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full px-4 py-4 bg-card border border-border rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-300" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">Wird hochgeladen...</div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </motion.div>
        )}

        {/* ─── SUCCESS: Show PIN Code ─── */}
        {state === 'success' && printCode && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full px-4 py-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Foto hochgeladen!</span>
              </div>
              <button onClick={reset} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="text-center mb-3">
              <div className="text-xs text-muted-foreground mb-1">Dein Mosaic-Code:</div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
                  {printCode.pinCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Code kopieren"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground mb-3">
              Gehe zum <strong className="text-emerald-700 dark:text-emerald-300">Print-Terminal</strong> und gib diesen Code ein, um deinen Sticker zu drucken.
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-sm font-medium text-emerald-700 dark:text-emerald-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Noch ein Foto hochladen
            </button>
          </motion.div>
        )}

        {/* ─── ERROR ─── */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full px-4 py-3 bg-destructive/20 border border-destructive/30 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <X className="w-5 h-5 text-destructive shrink-0" />
              <div className="flex-1 text-sm text-destructive">{error}</div>
              <button
                onClick={reset}
                className="px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
              >
                Nochmal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
