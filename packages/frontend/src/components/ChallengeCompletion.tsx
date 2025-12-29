'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Trophy, Check, Star } from 'lucide-react';
import api from '@/lib/api';
import { formatApiError } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  isVisible: boolean;
  categoryId?: string | null;
  completions?: Array<{
    id: string;
    photo: {
      id: string;
      url: string;
    };
    guest?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    uploaderName?: string;
    averageRating?: number;
    ratingCount?: number;
  }>;
}

interface ChallengeCompletionProps {
  challenge: Challenge;
  eventId: string;
  guestId?: string;
  uploaderName?: string;
  onComplete?: () => void;
}

export default function ChallengeCompletion({
  challenge,
  eventId,
  guestId,
  uploaderName: initialUploaderName,
  onComplete,
}: ChallengeCompletionProps) {
  const { showToast } = useToastStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usingCamera, setUsingCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploaderName, setUploaderName] = useState(initialUploaderName || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const userCompletion = challenge.completions?.find(
    c => (guestId && c.guest?.id === guestId) || (!guestId && c.uploaderName === uploaderName)
  );

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Back camera
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUsingCamera(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Kamera konnte nicht geöffnet werden', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUsingCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          console.log('Photo captured, data URL length:', dataUrl.length);
          if (dataUrl && dataUrl.length > 0) {
            setCapturedImage(dataUrl);
            stopCamera();
          } else {
            console.error('Canvas toDataURL returned empty string');
            showToast('Fehler beim Aufnehmen des Fotos', 'error');
          }
        } else {
          showToast('Fehler beim Aufnehmen des Fotos', 'error');
        }
      } catch (error) {
        console.error('Capture error:', error);
        showToast('Fehler beim Aufnehmen des Fotos', 'error');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Bitte wähle ein Bild aus', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('FileReader error');
        showToast('Fehler beim Laden des Bildes', 'error');
      };
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          console.log('FileReader loaded, data URL length:', dataUrl.length);
          setCapturedImage(dataUrl);
        } else {
          console.error('FileReader result is null');
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!capturedImage || !uploaderName.trim()) {
      showToast('Bitte gib deinen Namen ein', 'error');
      return;
    }

    try {
      setUploading(true);

      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'challenge-photo.jpg', { type: 'image/jpeg' });

      // Upload photo
      const formData = new FormData();
      formData.append('file', file);
      if (challenge.categoryId) {
        formData.append('categoryId', challenge.categoryId);
      }
      formData.append('uploaderName', uploaderName.trim());

      const uploadResponse = await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const photoId = uploadResponse.data.photo.id;

      // Complete challenge
      await api.post(`/events/${eventId}/challenges/${challenge.id}/complete`, {
        photoId,
        uploaderName: uploaderName.trim(),
      });

      setShowSuccessAnimation(true);
      showToast('Challenge erfüllt! 🎉', 'success');
      
      // Reset form after success
      setTimeout(() => {
        setShowUploadModal(false);
        setCapturedImage(null);
        setUploaderName(initialUploaderName || '');
        setShowSuccessAnimation(false);
        stopCamera();
        if (onComplete) onComplete();
        // Reload photos to show new challenge completion
        window.dispatchEvent(new CustomEvent('photoUploaded'));
      }, 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(formatApiError(err) || 'Fehler beim Hochladen', 'error');
      setUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
          </div>
          {challenge.description && (
            <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
          )}
          
          {userCompletion ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Erfüllt!</span>
              {userCompletion.averageRating && (
                <div className="flex items-center gap-1 ml-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs">{userCompletion.averageRating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({userCompletion.ratingCount})</span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 px-4 py-2 bg-[#295B4D] text-white rounded-lg hover:bg-[#1f4238] flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Trophy className="w-4 h-4" />
              Challenge erfüllen
            </button>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!uploading) {
                stopCamera();
                setShowUploadModal(false);
                setCapturedImage(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden relative"
            >
              {/* Success Animation */}
              <AnimatePresence>
                {showSuccessAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center rounded-lg z-20"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="text-center"
                    >
                      <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">Challenge erfüllt!</h3>
                      <p className="text-white">🎉</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold">Challenge erfüllen</h3>
                <button
                  onClick={() => {
                    stopCamera();
                    setShowUploadModal(false);
                    setCapturedImage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-20">
                {/* Uploader Name Input - Auffällig als Pflichtfeld */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Dein Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    required
                    className="w-full px-4 py-3 border-2 border-[#295B4D] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#295B4D] focus:border-[#295B4D] font-medium"
                  />
                </div>

                {!capturedImage ? (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        onClick={startCamera}
                        disabled={usingCamera}
                        className="flex-1 px-4 py-3 bg-[#295B4D] text-white rounded-lg hover:bg-[#1f4238] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Camera className="w-5 h-5" />
                        Kamera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-5 h-5" />
                        Galerie
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {usingCamera && (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full rounded-lg"
                          style={{ transform: 'scaleX(-1)' }} // Mirror for selfie
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                          <button
                            onClick={stopCamera}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={capturePhoto}
                            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full">
                    {capturedImage ? (
                      <div className="relative w-full flex items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[200px]">
                        <img
                          src={capturedImage}
                          alt="Preview"
                          className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg shadow-lg"
                          style={{ display: 'block' }}
                          onLoad={() => {
                            console.log('✅ Preview image loaded successfully');
                          }}
                          onError={(e) => {
                            console.error('❌ Error loading preview image:', e);
                            console.error('Image source length:', capturedImage?.length);
                            console.error('Image source preview:', capturedImage?.substring(0, 50));
                            const img = e.target as HTMLImageElement;
                            console.error('Current img.src:', img.src);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg">
                        <div className="text-gray-400 text-center">
                          <p>Kein Bild geladen</p>
                          <p className="text-xs mt-2">capturedImage: {capturedImage ? 'vorhanden' : 'null'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Buttons FIXIERT am unteren Rand - immer sichtbar wenn Bild vorhanden */}
              {capturedImage && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3 flex-shrink-0 z-10">
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      if (usingCamera) startCamera();
                    }}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Neu aufnehmen
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !uploaderName.trim()}
                    className="flex-1 px-4 py-2 bg-[#295B4D] text-white rounded-lg hover:bg-[#1f4238] disabled:opacity-50"
                  >
                    {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

