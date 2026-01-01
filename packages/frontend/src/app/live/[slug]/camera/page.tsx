'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Camera, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

const MotionIconButton = motion(IconButton);
const MotionButton = motion(Button);

export default function CameraPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
    } catch (err) {
      // Error handling
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(photoDataUrl);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    if (!event) return;

    setUploadError(null);
    setCanRetry(false);
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/events/${event.id}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const total = typeof evt.total === 'number' ? evt.total : 0;
          const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
          if (!total || total <= 0) return;
          const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
          setUploadProgress(pct);
        },
      });

      // Show success animation
      setCapturedPhoto(null);
      
      // Show toast
      setTimeout(() => {
        setUploading(false);
      }, 1000);
    } catch (err: any) {
      const msg = formatApiError(err);
      setUploadError(msg);
      setCanRetry(isRetryableUploadError(err));
      setUploading(false);
    }
  };

  const handleCaptureAndUpload = async () => {
    if (!capturedPhoto || !event) return;

    // Convert data URL to blob
    const response = await fetch(capturedPhoto);
    const blob = await response.blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

    await uploadPhoto(file);
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-app-fg flex items-center justify-center">
        <div className="text-app-bg">Event nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-fg text-app-bg relative">
      {/* Back Button */}
      <MotionIconButton
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => router.push(`/e/${slug}`)}
        icon={<ArrowLeft className="w-6 h-6" />}
        variant="ghost"
        size="lg"
        aria-label="Zurück"
        className="absolute top-4 left-4 z-20 p-2 bg-app-fg/50 rounded-full"
      />

      {/* Camera View */}
      <AnimatePresence mode="wait">
        {!capturedPhoto ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-screen"
          >
            {/* Video Stream Placeholder */}
            <div className="w-full h-full bg-app-fg flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-24 h-24 mx-auto mb-4 text-app-bg/60" />
                <p className="text-app-bg/70 mb-4">Kamera-Stream</p>
                {uploadError && (
                  <div className="mb-4 px-4 py-2 rounded-lg bg-app-fg/50 border border-[var(--status-danger)] text-[var(--status-danger)] text-sm max-w-xs mx-auto">
                    Fehler beim Upload: {uploadError}
                    {canRetry && !uploading && capturedPhoto && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCaptureAndUpload}
                          className="h-auto p-0 text-xs font-semibold underline bg-transparent hover:bg-transparent"
                        >
                          Erneut versuchen
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {uploading && uploadProgress > 0 && (
                  <div className="mb-4 max-w-xs mx-auto">
                    <div className="text-xs text-app-bg/80 mb-2">Upload: {uploadProgress}%</div>
                    <div className="w-full bg-app-bg/20 rounded-full h-2">
                      <div
                        className="bg-app-bg h-2 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 bg-tokens-brandGreen text-app-bg rounded-lg hover:opacity-90"
                >
                  {uploading ? 'Hochladen…' : 'Foto auswählen'}
                </MotionButton>
              </div>
            </div>

            {/* Capture Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-app-bg rounded-full border-4 border-app-border shadow-lg z-10"
            >
              <div className="w-full h-full bg-app-bg rounded-full" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full h-screen flex items-center justify-center"
          >
            {/* Preview Image */}
            <img
              src={capturedPhoto}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />

            {/* Action Buttons */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-4">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCapturedPhoto(null)}
                className="px-6 py-3 bg-app-bg/20 text-app-bg rounded-lg hover:bg-app-bg/30"
              >
                Neu aufnehmen
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCaptureAndUpload}
                disabled={uploading}
                className="px-6 py-3 bg-tokens-brandGreen text-app-bg rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-5 h-5 border-2 border-app-bg border-t-transparent rounded-full"
                    />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Hochladen
                  </>
                )}
              </MotionButton>
            </div>

            {/* Upload Success Animation */}
            {uploading && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 0],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-32 h-32 bg-[var(--status-success)] rounded-full flex items-center justify-center"
                >
                  <Upload className="w-16 h-16 text-app-bg" />
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} className="hidden" autoPlay playsInline />
    </div>
  );
}

