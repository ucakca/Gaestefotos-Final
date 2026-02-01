'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion } from 'framer-motion';
import { Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio?: number; // e.g. 16/9 for cover, 1 for profile
  circularCrop?: boolean; // true for profile images
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function ImageCropper({
  imageSrc,
  aspectRatio = 16 / 9,
  circularCrop = false,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.92,
    );
  }, [completedCrop, onCropComplete]);

  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Bild zuschneiden</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 bg-gray-50 flex items-center justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            circularCrop={circularCrop}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Zum Zuschneiden"
              onLoad={onImageLoad}
              className="max-w-full max-h-[50vh] object-contain"
            />
          </ReactCrop>
        </div>

        {/* Hint */}
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-700 text-center">
            Ziehe die Ecken um den Ausschnitt anzupassen
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <Button
            onClick={handleReset}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </Button>
          <div className="flex-1" />
          <Button
            onClick={onCancel}
            variant="ghost"
          >
            Abbrechen
          </Button>
          <button
            onClick={handleCropComplete}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg transition-all"
            title="Übernehmen"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
