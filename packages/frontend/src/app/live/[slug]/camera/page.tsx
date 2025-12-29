'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Camera, Upload, ArrowLeft } from 'lucide-react';

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Event nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => router.push(`/e/${slug}`)}
        className="absolute top-4 left-4 z-20 p-2 bg-black bg-opacity-50 rounded-full"
      >
        <ArrowLeft className="w-6 h-6" />
      </motion.button>

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
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">Kamera-Stream</p>
                {uploadError && (
                  <div className="mb-4 px-4 py-2 rounded-lg bg-red-900/40 border border-red-700 text-red-100 text-sm max-w-xs mx-auto">
                    Fehler beim Upload: {uploadError}
                    {canRetry && !uploading && capturedPhoto && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={handleCaptureAndUpload}
                          className="text-xs font-semibold underline"
                        >
                          Erneut versuchen
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {uploading && uploadProgress > 0 && (
                  <div className="mb-4 max-w-xs mx-auto">
                    <div className="text-xs text-gray-200 mb-2">Upload: {uploadProgress}%</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full"
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  {uploading ? 'Hochladen…' : 'Foto auswählen'}
                </motion.button>
              </div>
            </div>

            {/* Capture Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg z-10"
            >
              <div className="w-full h-full bg-white rounded-full" />
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCapturedPhoto(null)}
                className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Neu aufnehmen
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCaptureAndUpload}
                disabled={uploading}
                className="px-6 py-3 bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Hochladen
                  </>
                )}
              </motion.button>
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
                  className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Upload className="w-16 h-16 text-white" />
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

