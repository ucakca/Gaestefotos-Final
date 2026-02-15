'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, X, RotateCcw, Check } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepTakePhoto({ node, onComplete }: StepRendererProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = node.data.config;
  const isQrScan = config.captureMode === 'qr_scan';
  const sourceGalleryOnly = config.source === 'gallery';
  const facingMode = config.facingMode || (config.mirror ? 'user' : 'environment');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCapturing(true);
    } catch {
      // Fallback to file input if camera fails
      fileInputRef.current?.click();
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (config.mirror) {
      ctx?.translate(canvas.width, 0);
      ctx?.scale(-1, 1);
    }
    ctx?.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  }, [config.mirror, stopCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const retake = useCallback(() => {
    setPreview(null);
  }, []);

  const confirm = useCallback(() => {
    onComplete('default', { photo: preview, hasPhoto: !!preview });
  }, [onComplete, preview]);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <h3 className="text-lg font-bold text-foreground">{node.data.label}</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={sourceGalleryOnly ? undefined : 'environment'}
        onChange={handleFileSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {!preview && !capturing && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {!sourceGalleryOnly && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startCamera}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors"
            >
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {isQrScan ? 'QR scannen' : 'Kamera'}
              </span>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors"
          >
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {config.captureMode === 'multi' ? 'Dateien wählen' : 'Galerie'}
            </span>
          </motion.button>
        </div>
      )}

      {capturing && (
        <div className="w-full max-w-sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full rounded-xl ${config.mirror ? 'scale-x-[-1]' : ''}`}
          />
          <div className="flex gap-2 mt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={capturePhoto}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold"
            >
              Aufnehmen
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopCamera}
              className="py-3 px-4 bg-muted/80 rounded-xl"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      )}

      {preview && (
        <div className="w-full max-w-sm">
          <div className="relative rounded-xl overflow-hidden">
            <img src={preview} alt="Vorschau" className="w-full" />
          </div>
          <div className="flex gap-2 mt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={retake}
              className="flex-1 py-3 bg-muted/80 text-foreground/80 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Nochmal
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={confirm}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Weiter
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
