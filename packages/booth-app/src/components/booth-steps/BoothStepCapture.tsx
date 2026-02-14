'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, Check } from 'lucide-react';
import type { BoothStepProps } from '../BoothRunner';

export function BoothStepCapture({ node, onComplete }: BoothStepProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const config = node.data.config;
  const mirror = config.mirror !== false;
  const facingMode = config.facingMode || 'user';

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreaming(true);
    } catch {
      // Camera unavailable
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (mirror) {
      ctx?.translate(canvas.width, 0);
      ctx?.scale(-1, 1);
    }
    ctx?.drawImage(video, 0, 0);

    // Flash effect
    const flash = document.getElementById('booth-flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => { flash.style.opacity = '0'; }, 150);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    stopCamera();
  }, [mirror, stopCamera]);

  const retake = useCallback(() => {
    setPreview(null);
    startCamera();
  }, []);

  const confirm = useCallback(() => {
    onComplete('default', { photo: preview, hasPhoto: true });
  }, [onComplete, preview]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      <div
        id="booth-flash"
        className="fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-150"
        style={{ opacity: 0 }}
      />

      {!preview ? (
        <>
          {/* Camera View */}
          <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
            />
            {!streaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-16 h-16 text-booth-muted animate-pulse" />
              </div>
            )}
          </div>

          {/* Capture Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={capturePhoto}
            disabled={!streaming}
            className="w-24 h-24 rounded-full bg-white border-4 border-booth-accent shadow-2xl shadow-booth-accent/30 flex items-center justify-center disabled:opacity-30"
          >
            <div className="w-16 h-16 rounded-full bg-booth-accent" />
          </motion.button>
        </>
      ) : (
        <>
          {/* Preview */}
          <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl">
            <img src={preview} alt="Vorschau" className="w-full h-full object-cover" />
          </div>

          {/* Actions */}
          <div className="flex gap-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={retake}
              className="px-10 py-5 bg-booth-card border-2 border-booth-border text-booth-fg rounded-2xl font-bold text-xl flex items-center gap-3"
            >
              <RotateCcw className="w-6 h-6" /> Nochmal
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={confirm}
              className="px-10 py-5 bg-booth-accent text-white rounded-2xl font-bold text-xl flex items-center gap-3 shadow-lg shadow-booth-accent/30"
            >
              <Check className="w-6 h-6" /> Weiter
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
