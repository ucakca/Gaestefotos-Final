'use client';

import { useState, useRef, useEffect } from 'react';
import { RotateCw, Crop, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface PhotoEditorProps {
  photoId: string;
  photoUrl: string;
  onClose: () => void;
  onSave: () => void;
}

export default function PhotoEditor({ photoId, photoUrl, onClose, onSave }: PhotoEditorProps) {
  const { showToast } = useToastStore();
  const [rotation, setRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCropStart = () => {
    setIsCropping(true);
    setCropArea(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropping || !containerRef.current || !imageRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !startPos || !containerRef.current || !cropArea) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);
    const cropX = Math.min(x, startPos.x);
    const cropY = Math.min(y, startPos.y);
    
    setCropArea({
      x: cropX,
      y: cropY,
      width,
      height,
    });
  };

  const handleMouseUp = () => {
    if (!isCropping) return;
    setStartPos(null);
    if (cropArea && cropArea.width > 10 && cropArea.height > 10) {
      // Crop area is valid
      setIsCropping(false);
    } else {
      // Invalid crop area, reset
      setCropArea(null);
      setIsCropping(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const imageElement = imageRef.current;
      if (!imageElement) return;

      // Calculate actual crop coordinates relative to image
      let actualCrop = null;
      if (cropArea && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const imageRect = imageElement.getBoundingClientRect();
        
        const scaleX = imageElement.naturalWidth / imageRect.width;
        const scaleY = imageElement.naturalHeight / imageRect.height;
        
        const relativeX = (cropArea.x - (imageRect.left - containerRect.left)) * scaleX;
        const relativeY = (cropArea.y - (imageRect.top - containerRect.top)) * scaleY;
        const relativeWidth = cropArea.width * scaleX;
        const relativeHeight = cropArea.height * scaleY;
        
        actualCrop = {
          x: Math.max(0, relativeX),
          y: Math.max(0, relativeY),
          width: Math.min(relativeWidth, imageElement.naturalWidth - Math.max(0, relativeX)),
          height: Math.min(relativeHeight, imageElement.naturalHeight - Math.max(0, relativeY)),
        };
      }

      await api.post(`/photos/${photoId}/edit`, {
        rotation: rotation > 0 ? rotation : undefined,
        crop: actualCrop || undefined,
      });

      showToast('Foto erfolgreich bearbeitet', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      showToast('Fehler beim Speichern', 'error');
      console.error('Error saving photo edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelCrop = () => {
    setCropArea(null);
    setIsCropping(false);
    setStartPos(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg max-w-4xl w-full p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Foto bearbeiten</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRotate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Drehen ({rotation}°)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCropStart}
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              isCropping
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <Crop className="w-4 h-4" />
            {isCropping ? 'Zuschneiden...' : 'Zuschneiden'}
          </motion.button>
          {isCropping && (
            <button
              onClick={handleCancelCrop}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Abbrechen
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden mb-4"
          style={{ minHeight: '400px', maxHeight: '70vh' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={photoUrl}
            alt="Zu bearbeitendes Foto"
            className="max-w-full max-h-[70vh] mx-auto block"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
            }}
          />
          
          {cropArea && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
              style={{
                left: `${cropArea.x}px`,
                top: `${cropArea.y}px`,
                width: `${cropArea.width}px`,
                height: `${cropArea.height}px`,
              }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Abbrechen
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Speichern...' : 'Speichern'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}













