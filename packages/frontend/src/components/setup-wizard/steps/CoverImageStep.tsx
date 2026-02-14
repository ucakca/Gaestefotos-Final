'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, Image, X, SkipForward, Crop } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ImageCropper from '../ImageCropper';

interface CoverImageStepProps {
  coverImage: File | null;
  coverImagePreview: string | null;
  onCoverImageChange: (file: File | null, preview: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function CoverImageStep({
  coverImage,
  coverImagePreview,
  onCoverImageChange,
  onNext,
  onBack,
  onSkip,
}: CoverImageStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Show cropper instead of directly setting
        setTempImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
    const reader = new FileReader();
    reader.onloadend = () => {
      onCoverImageChange(croppedFile, reader.result as string);
    };
    reader.readAsDataURL(croppedBlob);
    setShowCropper(false);
    setTempImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setTempImageSrc(null);
  };

  const handleEditCrop = () => {
    if (coverImagePreview) {
      setTempImageSrc(coverImagePreview);
      setShowCropper(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onCoverImageChange(null, null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Cover-Bild hinzufügen 🖼️
        </motion.h2>
        <p className="text-muted-foreground">Das Titelbild für deine Event-Seite</p>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {coverImagePreview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={coverImagePreview}
              alt="Cover Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={handleEditCrop}
                className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Zuschneiden"
              >
                <Crop className="w-4 h-4" />
              </button>
              <button
                onClick={handleRemove}
                className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Entfernen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-sm font-medium">
                {coverImage?.name}
              </p>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-amber-500 bg-amber-50'
                : 'border-border hover:border-amber-300 hover:bg-amber-50/50'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-amber-600" />
            </div>
            <p className="font-medium text-foreground mb-1">
              Bild hochladen
            </p>
            <p className="text-sm text-muted-foreground">
              Ziehe ein Bild hierher oder klicke zum Auswählen
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              JPG, PNG bis 10MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
      </motion.div>

      {/* Sample Covers */}
      {!coverImagePreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <p className="text-sm font-medium text-foreground">Oder wähle ein Beispielbild:</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&h=200&fit=crop',
              'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
              'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&h=200&fit=crop',
            ].map((url, i) => (
              <button
                key={i}
                onClick={() => onCoverImageChange(null, url)}
                className="rounded-xl overflow-hidden aspect-video hover:ring-2 hover:ring-amber-500 transition-all"
              >
                <img src={url} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button
            onClick={onNext}
            disabled={!coverImagePreview}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {showCropper && tempImageSrc && (
          <ImageCropper
            imageSrc={tempImageSrc}
            aspectRatio={16 / 9}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
