'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, User, X, SkipForward, Crop } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ImageCropper from '../ImageCropper';

interface ProfileImageStepProps {
  profileImage: File | null;
  profileImagePreview: string | null;
  onProfileImageChange: (file: File | null, preview: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ProfileImageStep({
  profileImage,
  profileImagePreview,
  onProfileImageChange,
  onNext,
  onBack,
  onSkip,
}: ProfileImageStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
    const reader = new FileReader();
    reader.onloadend = () => {
      onProfileImageChange(croppedFile, reader.result as string);
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
    if (profileImagePreview) {
      setTempImageSrc(profileImagePreview);
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
    onProfileImageChange(null, null);
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
          Profilbild hinzufügen 👤
        </motion.h2>
        <p className="text-muted-foreground">Das kleine runde Bild für dein Event</p>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        {profileImagePreview ? (
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-amber-200 shadow-lg">
              <img
                src={profileImagePreview}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-1 -right-1 flex gap-1">
              <button
                onClick={handleEditCrop}
                className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors shadow-md"
                title="Zuschneiden"
              >
                <Crop className="w-3 h-3" />
              </button>
              <button
                onClick={handleRemove}
                className="w-7 h-7 rounded-full bg-destructive/100 text-white flex items-center justify-center hover:bg-destructive transition-colors shadow-md"
                title="Entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-32 h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-amber-500 bg-amber-50'
                : 'border-border hover:border-amber-400 hover:bg-amber-50/50'
            }`}
          >
            <User className="w-10 h-10 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Hochladen</span>
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

      {/* Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-muted-foreground">
          Das Profilbild erscheint mittig auf deiner Event-Seite
        </p>
        <p className="text-xs text-muted-foreground">
          Ideal: Logo, Paar-Foto oder Event-Symbol
        </p>
      </motion.div>

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
            disabled={!profileImagePreview}
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
            aspectRatio={1}
            circularCrop={true}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
