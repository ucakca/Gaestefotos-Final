'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, X, Crop as CropIcon, Sparkles, Wand2 } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { MosaicWizardState } from './types';
import { Slider } from '@/components/ui/Slider';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  targetImageUrl: string | null;
  analyzing: boolean;
  analyzingOverlay: boolean;
  aiRecommendation: { intensity: number; reasoning: string } | null;
  onUploadCropped: (blob: Blob) => Promise<void>;
  onAnalyzeOverlay: () => void;
  onApplyRecommendation: (intensity: number) => void;
}

export default function Step2TargetOverlay({
  state,
  onChange,
  targetImageUrl,
  analyzing,
  analyzingOverlay,
  aiRecommendation,
  onUploadCropped,
  onAnalyzeOverlay,
  onApplyRecommendation,
}: Props) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [noTarget, setNoTarget] = useState(false);
  const [scatterMode, setScatterMode] = useState<'auto' | 'manual'>('auto');
  const cropImgRef = useRef<HTMLImageElement>(null);

  const cropAspect = state.gridWidth / state.gridHeight;
  const hasTarget = !!targetImageUrl;

  // Auto-trigger KI analysis when target image is uploaded
  useEffect(() => {
    if (hasTarget && !aiRecommendation && !analyzingOverlay) {
      onAnalyzeOverlay();
    }
  }, [hasTarget]);

  // Auto-apply AI recommendation when it arrives
  useEffect(() => {
    if (aiRecommendation && scatterMode === 'auto') {
      onApplyRecommendation(aiRecommendation.intensity);
    }
  }, [aiRecommendation, scatterMode]);

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
        <h2 className="text-lg font-bold text-gray-900 mb-1">Zielbild & Overlay</h2>
        <p className="text-sm text-gray-500 mb-4">
          Lade ein Motiv hoch, das aus den Gäste-Fotos zusammengesetzt wird.
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
          {hasTarget ? (
            <div className="relative">
              <div
                className="w-full bg-gray-100 rounded-xl overflow-hidden border"
                style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '240px' }}
              >
                <img
                  src={targetImageUrl}
                  alt="Zielbild"
                  className="w-full h-full object-contain"
                />
                {/* Overlay Preview */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                >
                  <div
                    className="w-full h-full grid"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(state.gridWidth, 16)}, 1fr)`,
                      gridTemplateRows: `repeat(${Math.min(state.gridHeight, 16)}, 1fr)`,
                      gap: '1px',
                    }}
                  >
                    {Array.from({ length: Math.min(state.gridWidth, 16) * Math.min(state.gridHeight, 16) }).map((_, i) => {
                      const hue = (i * 37) % 360;
                      return (
                        <div
                          key={i}
                          className="rounded-[1px]"
                          style={{
                            backgroundColor: `hsl(${hue}, 40%, 60%)`,
                            opacity: 1 - (state.overlayIntensity / 100) * 0.7,
                          }}
                        />
                      );
                    })}
                  </div>
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
              className="w-full p-8 sm:p-10 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-3 hover:border-purple-400 hover:bg-purple-50/30 transition-all disabled:opacity-50"
              style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '240px' }}
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

          {/* ─── Overlay Controls (only visible after upload) ─── */}
          {hasTarget && (
            <div className="space-y-5 pt-2">
              {/* KI Analysis Status */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-700">KI-Empfehlung</span>
                  {analyzingOverlay && (
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {aiRecommendation ? (
                  <p className="text-xs text-purple-600">
                    <strong>{aiRecommendation.intensity}%</strong> — {aiRecommendation.reasoning}
                  </p>
                ) : analyzingOverlay ? (
                  <p className="text-xs text-purple-500">Bild wird analysiert...</p>
                ) : (
                  <button
                    type="button"
                    onClick={onAnalyzeOverlay}
                    className="text-xs text-purple-600 font-medium underline"
                  >
                    Erneut analysieren
                  </button>
                )}
              </div>

              {/* Overlay Intensity Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Zielbild-Overlay</label>
                  <span className="text-sm font-bold text-purple-600">{state.overlayIntensity}%</span>
                </div>
                <Slider
                  value={[state.overlayIntensity]}
                  onValueChange={([v]) => onChange({ overlayIntensity: v })}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                  <span>Nur Fotos</span>
                  <span>Ausgewogen</span>
                  <span>Zielbild dominant</span>
                </div>
              </div>

              {/* Scatter Value */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Farbplatzierung</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScatterMode('auto')}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                        scatterMode === 'auto'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <Wand2 className="w-3 h-3 inline mr-1" />
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setScatterMode('manual')}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                        scatterMode === 'manual'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      Manuell
                    </button>
                  </div>
                </div>

                {scatterMode === 'manual' ? (
                  <>
                    <Slider
                      value={[state.scatterValue]}
                      onValueChange={([v]) => onChange({ scatterValue: v })}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                      <span>Exakte Farbmatch</span>
                      <span>Zufällig verteilt</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                    Die KI wählt automatisch die optimale Balance zwischen Farbtreue und natürlicher Verteilung.
                  </p>
                )}
              </div>
            </div>
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
                Zuschneiden & Analysieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
