'use client';

import { useRef, useState } from 'react';
import { Upload, Image, X, Crop as CropIcon } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { MosaicWizardState } from './types';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  targetImageUrl: string | null;
  analyzing: boolean;
  onUploadCropped: (blob: Blob) => Promise<void>;
}

export default function Step2TargetImage({ state, onChange, targetImageUrl, analyzing, onUploadCropped }: Props) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [noTarget, setNoTarget] = useState(false);
  const cropImgRef = useRef<HTMLImageElement>(null);

  const cropAspect = state.gridWidth / state.gridHeight;

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setCropImageSrc(objectUrl);
        setShowCropper(true);
        setNoTarget(false);
      }
      document.body.removeChild(input);
    };
    input.click();
  };

  const onCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, cropAspect, width, height),
      width,
      height,
    );
    setCrop(newCrop);
  };

  const handleCropConfirm = () => {
    if (!completedCrop || !cropImgRef.current) return;
    const image = cropImgRef.current;
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
      0, 0, canvas.width, canvas.height,
    );
    canvas.toBlob((blob) => {
      if (blob) {
        onUploadCropped(blob);
        if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
        setShowCropper(false);
        setCropImageSrc(null);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setShowCropper(false);
    setCropImageSrc(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Zielbild</h2>
        <p className="text-sm text-gray-500 mb-4">
          Das Bild, das aus den Gäste-Fotos zusammengesetzt wird (z.B. Logo, Brautpaar, Firmenlogo).
        </p>
      </div>

      {/* No-Target Toggle */}
      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border cursor-pointer">
        <input
          type="checkbox"
          checked={noTarget}
          onChange={(e) => setNoTarget(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
          style={{ accentColor: 'var(--primary, #9333ea)' }}
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Kein Zielbild</span>
          <p className="text-xs text-gray-400">Reines Foto-Raster ohne Hintergrundbild</p>
        </div>
      </label>

      {!noTarget && (
        <>
          {/* Upload Area */}
          {targetImageUrl ? (
            <div className="relative">
              <div
                className="w-full bg-gray-100 rounded-xl overflow-hidden border"
                style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '280px' }}
              >
                <img
                  src={targetImageUrl}
                  alt="Zielbild"
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Grid Overlay */}
              <div
                className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                style={{ opacity: 0.15 }}
              >
                <div
                  className="w-full h-full grid"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(state.gridWidth, 24)}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.min(state.gridHeight, 24)}, 1fr)`,
                    gap: '1px',
                  }}
                >
                  {Array.from({ length: Math.min(state.gridWidth, 24) * Math.min(state.gridHeight, 24) }).map((_, i) => (
                    <div key={i} className="border border-white/50" />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={openFilePicker}
                disabled={analyzing}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <CropIcon className="w-4 h-4" />
                {analyzing ? 'Analysiere...' : 'Anderes Bild wählen'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openFilePicker}
              disabled={analyzing}
              className="w-full p-8 sm:p-12 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-3 hover:border-purple-400 hover:bg-purple-50/30 transition-all disabled:opacity-50"
              style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '280px' }}
            >
              {analyzing ? (
                <>
                  <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-purple-600 font-medium">Bild wird analysiert...</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 block">Zielbild hochladen</span>
                    <span className="text-xs text-gray-400">Wird auf {state.gridWidth}:{state.gridHeight} zugeschnitten</span>
                  </div>
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-400 text-center">
            Tipp: Bilder mit klarem Motiv und gutem Kontrast ergeben die besten Mosaike.
          </p>
        </>
      )}

      {/* Crop Modal */}
      {showCropper && cropImageSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col rounded-t-2xl">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-gray-900">
                Zuschneiden ({state.gridWidth}:{state.gridHeight})
              </h3>
              <button
                type="button"
                onClick={handleCropCancel}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crop Area */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspect}
                className="max-w-full"
              >
                <img
                  ref={cropImgRef}
                  src={cropImageSrc}
                  alt="Zuschneiden"
                  onLoad={onCropImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCropCancel}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Zuschneiden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
