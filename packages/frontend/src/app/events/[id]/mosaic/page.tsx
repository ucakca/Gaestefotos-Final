'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Upload,
  Settings,
  Printer,
  Eye,
  Play,
  Pause,
  CheckCircle2,
  LayoutGrid,
  Image,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import MosaicCalculator from '@/components/mosaic/MosaicCalculator';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { usePackageFeatures, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';
import { Lock, Crown } from 'lucide-react';

interface MosaicWall {
  id: string;
  eventId: string;
  targetImageUrl: string | null;
  gridWidth: number;
  gridHeight: number;
  tileSizeMm: number;
  boardWidthMm: number | null;
  boardHeightMm: number | null;
  overlayIntensity: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  fillMode: string;
  autoFillEnabled: boolean;
  autoFillThreshold: number;
  displayAnimation: string;
  showTicker: boolean;
  showQrOverlay: boolean;
  nextPrintNumber: number;
  printEnabled: boolean;
  printConfirmation: boolean;
  sourceModes: string[];
  reservationTimeout: number;
  _count?: { tiles: number };
}

const GRID_PRESETS = [
  { label: 'Klein (12x12)', w: 12, h: 12, desc: '144 Tiles — ideal für 50-80 Gäste' },
  { label: 'Mittel (24x24)', w: 24, h: 24, desc: '576 Tiles — ideal für 100-200 Gäste' },
  { label: 'Groß (48x32)', w: 48, h: 32, desc: '1536 Tiles — ideal für 200+ Gäste' },
];

const ANIMATIONS = [
  { value: 'ZOOM_FLY', label: 'Zoom Fly', desc: 'Tile fliegt von groß auf Position' },
  { value: 'PUZZLE', label: 'Puzzle', desc: 'Dreh-Animation wie ein Puzzleteil' },
  { value: 'FLIP', label: 'Flip', desc: '3D-Karten-Flip' },
  { value: 'PARTICLES', label: 'Particles', desc: 'Blur-Fade Effekt' },
  { value: 'RIPPLE', label: 'Ripple', desc: 'Spring-Pop Effekt' },
];

export default function MosaicManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [wall, setWall] = useState<MosaicWall | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{ intensity: number; reasoning: string } | null>(null);
  const [analyzingOverlay, setAnalyzingOverlay] = useState(false);
  const [eventSlug, setEventSlug] = useState('');
  const [tileCount, setTileCount] = useState(0);

  // Form state
  const [gridWidth, setGridWidth] = useState(24);
  const [gridHeight, setGridHeight] = useState(24);
  const [tileSizeMm, setTileSizeMm] = useState(50);
  const [overlayIntensity, setOverlayIntensity] = useState(10);
  const [displayAnimation, setDisplayAnimation] = useState('ZOOM_FLY');
  const [showTicker, setShowTicker] = useState(true);
  const [showQrOverlay, setShowQrOverlay] = useState(true);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [autoFillThreshold, setAutoFillThreshold] = useState(85);
  const [printEnabled, setPrintEnabled] = useState(false);
  const [printConfirmation, setPrintConfirmation] = useState(true);
  const [reservationTimeout, setReservationTimeout] = useState(15);

  // Crop state for target image
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const cropImgRef = useRef<HTMLImageElement>(null);

  // Feature Gates
  const { isFeatureEnabled, getUpgradeMessage, packageInfo } = usePackageFeatures(eventId);
  const canMosaic = isFeatureEnabled('mosaicWall');
  const canPrint = isFeatureEnabled('mosaicPrint');
  const canExport = isFeatureEnabled('mosaicExport');

  const loadWall = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/mosaic`);
      if (data.wall) {
        const w = data.wall;
        setWall(w);
        setGridWidth(w.gridWidth);
        setGridHeight(w.gridHeight);
        setTileSizeMm(w.tileSizeMm);
        setOverlayIntensity(w.overlayIntensity);
        setDisplayAnimation(w.displayAnimation);
        setShowTicker(w.showTicker);
        setShowQrOverlay(w.showQrOverlay);
        setAutoFillEnabled(w.autoFillEnabled);
        setAutoFillThreshold(w.autoFillThreshold);
        setPrintEnabled(w.printEnabled ?? false);
        setPrintConfirmation(w.printConfirmation ?? true);
        setReservationTimeout(w.reservationTimeout ?? 15);
        setTileCount(w._count?.tiles || 0);
      }
    } catch {
      // No wall exists yet
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadWall();
    // Load event slug for live links
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventSlug(data.event?.slug || '');
    }).catch(() => {});
  }, [eventId, loadWall]);

  const createWall = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/events/${eventId}/mosaic`, {
        gridWidth,
        gridHeight,
        tileSizeMm,
      });
      setWall(data.wall);
    } catch (err) {
      console.error('Failed to create mosaic wall', err);
    } finally {
      setSaving(false);
    }
  };

  const updateWall = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/events/${eventId}/mosaic`, {
        gridWidth,
        gridHeight,
        tileSizeMm,
        overlayIntensity,
        displayAnimation,
        showTicker,
        showQrOverlay,
        autoFillEnabled,
        autoFillThreshold,
        printEnabled,
        printConfirmation,
        reservationTimeout,
      });
      setWall(data.wall);
    } catch (err) {
      console.error('Failed to update mosaic wall', err);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/events/${eventId}/mosaic`, { status });
      setWall(data.wall);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setSaving(false);
    }
  };

  const cropAspect = gridWidth / gridHeight;

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
      if (blob) handleCropComplete(blob);
    }, 'image/jpeg', 0.95);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Clean up object URL
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setShowCropper(false);
    setCropImageSrc(null);
    const file = new File([croppedBlob], 'target-cropped.jpg', { type: 'image/jpeg' });
    await analyzeTarget(file);
  };

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setShowCropper(false);
    setCropImageSrc(null);
  };

  const analyzeTarget = async (file: File) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('targetImage', file);
      const { data } = await api.post(`/events/${eventId}/mosaic/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.wall) {
        setWall(data.wall);
      } else {
        setWall(prev => prev ? { ...prev, targetImageUrl: data.targetImageUrl } : prev);
      }
    } catch (err) {
      console.error('Failed to analyze target image', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const totalCells = gridWidth * gridHeight;
  const progress = totalCells > 0 ? Math.round((tileCount / totalCells) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Mosaik wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/events/${eventId}/dashboard`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Mosaic Wall
              </h1>
              {wall && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    wall.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    wall.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {wall.status === 'ACTIVE' ? 'Aktiv' : wall.status === 'COMPLETED' ? 'Fertig' : 'Entwurf'}
                  </span>
                  <span className="text-gray-400">{tileCount}/{totalCells} Tiles ({progress}%)</span>
                </div>
              )}
            </div>
          </div>

          {wall && (
            <div className="flex items-center gap-2">
              {eventSlug && (
                <>
                  <a
                    href={`/live/${eventSlug}/mosaic`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Live-Display
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`/live/${eventSlug}/wall?mode=mixed`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Mixed
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
              {canPrint ? (
                <button
                  onClick={() => router.push(`/events/${eventId}/mosaic/print-station`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print-Station
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed" title={getUpgradeMessage('mosaicPrint')}>
                  <Lock className="w-3.5 h-3.5" />
                  Print-Station
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upsell Banner */}
        {!canMosaic && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 flex items-start gap-4">
            <Crown className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Mosaic Wall — Pro Feature</h3>
              <p className="text-sm text-gray-600 mb-2">
                {FEATURE_DESCRIPTIONS.mosaicWall.description}. Upgrade dein Paket ({packageInfo.packageName}) um diese Funktion freizuschalten.
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">{canPrint ? '✅' : '🔒'} Print-Station</span>
                <span className="flex items-center gap-1">{canExport ? '✅' : '🔒'} HD-Export</span>
                <span className="flex items-center gap-1">🔒 Mosaic Wall</span>
              </div>
            </div>
          </div>
        )}

        {/* No wall yet — Create */}
        {!wall && canMosaic && (
          <div className="bg-white rounded-xl border p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h2 className="text-xl font-bold mb-2">Mosaic Wall erstellen</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Verwandle die Fotos deiner Gäste in ein Gesamtkunstwerk. Wähle eine Board-Größe:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto">
              {GRID_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setGridWidth(preset.w); setGridHeight(preset.h); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    gridWidth === preset.w && gridHeight === preset.h
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-sm">{preset.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{preset.desc}</p>
                </button>
              ))}
            </div>

            <Button
              onClick={createWall}
              disabled={saving}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Erstelle...' : 'Mosaic Wall erstellen'}
            </Button>
          </div>
        )}

        {/* Calculator — always visible */}
        <MosaicCalculator
          onSelectPreset={(w, h) => { setGridWidth(w); setGridHeight(h); }}
        />

        {/* Wall exists — Configuration */}
        {wall && (
          <>
            {/* Target Image Upload */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-500" />
                Zielbild
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Das Bild, das aus den Gäste-Fotos zusammengesetzt wird (z.B. Logo, Brautpaar, Herz).
              </p>

              <div className="flex items-start gap-4">
                {wall.targetImageUrl ? (
                  <div
                    className="rounded-lg overflow-hidden border bg-gray-100 shrink-0"
                    style={{ width: '8rem', aspectRatio: `${gridWidth} / ${gridHeight}` }}
                  >
                    <img src={wall.targetImageUrl} alt="Zielbild" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0"
                    style={{ width: '8rem', aspectRatio: `${gridWidth} / ${gridHeight}` }}
                  >
                    <Image className="w-8 h-8 text-gray-300" />
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={analyzing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {analyzing ? 'Analysiere...' : wall.targetImageUrl ? 'Neues Bild hochladen' : 'Zielbild hochladen'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Das Bild wird auf das Seitenverhältnis {gridWidth}:{gridHeight} zugeschnitten und in Zellen analysiert.
                    Jede Zelle erhält eine Durchschnittsfarbe für die optimale Tile-Platzierung.
                  </p>
                </div>
              </div>
            </div>

            {/* Grid Settings */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                Einstellungen
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Grid Size Presets */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Board-Größe</label>
                  <div className="space-y-1.5">
                    {GRID_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => { setGridWidth(preset.w); setGridHeight(preset.h); }}
                        className={`w-full p-2.5 rounded-lg border text-left text-sm transition-all ${
                          gridWidth === preset.w && gridHeight === preset.h
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-gray-400 ml-2">({preset.w * preset.h} Tiles)</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tile-Animation</label>
                  <div className="space-y-1.5">
                    {ANIMATIONS.map((anim) => (
                      <button
                        key={anim.value}
                        onClick={() => setDisplayAnimation(anim.value)}
                        className={`w-full p-2.5 rounded-lg border text-left text-sm transition-all ${
                          displayAnimation === anim.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <span className="font-medium">{anim.label}</span>
                        <span className="text-gray-400 ml-2">{anim.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tile Size */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tile-Größe (mm)</label>
                  <input
                    type="number"
                    value={tileSizeMm}
                    onChange={(e) => setTileSizeMm(Number(e.target.value))}
                    min={20}
                    max={100}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Overlay Intensity with AI Analysis */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Zielbild-Overlay ({overlayIntensity}%)
                    </label>
                    {wall?.targetImageUrl && (
                      <button
                        onClick={async () => {
                          setAnalyzingOverlay(true);
                          setAiRecommendation(null);
                          try {
                            const { data } = await api.post(`/events/${eventId}/mosaic/analyze-overlay`);
                            setAiRecommendation(data.recommendation);
                          } catch {
                            setAiRecommendation({ intensity: 45, reasoning: 'Standard-Empfehlung basierend auf allgemeiner Bildanalyse.' });
                          } finally {
                            setAnalyzingOverlay(false);
                          }
                        }}
                        disabled={analyzingOverlay}
                        className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {analyzingOverlay ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/></svg>
                            KI analysiert...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            KI-Analyse
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    value={overlayIntensity}
                    onChange={(e) => setOverlayIntensity(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Foto sichtbar</span>
                    <span>Ausgewogen</span>
                    <span>Zielbild dominant</span>
                  </div>
                  {aiRecommendation && (
                    <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-semibold text-purple-700">
                            Empfehlung: {aiRecommendation.intensity}%
                          </span>
                        </div>
                        <button
                          onClick={() => setOverlayIntensity(aiRecommendation.intensity)}
                          className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-md hover:bg-purple-700 transition-colors font-medium"
                        >
                          Anwenden
                        </button>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">{aiRecommendation.reasoning}</p>
                    </div>
                  )}
                </div>

                {/* Auto-Fill */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Auto-Fill</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAutoFillEnabled(!autoFillEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        autoFillEnabled ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        autoFillEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <span className="text-sm text-gray-600">
                      Ab {autoFillThreshold}% automatisch füllen
                    </span>
                  </div>
                  {autoFillEnabled && (
                    <input
                      type="range"
                      value={autoFillThreshold}
                      onChange={(e) => setAutoFillThreshold(Number(e.target.value))}
                      min={50}
                      max={95}
                      className="w-full mt-2"
                    />
                  )}
                </div>

                {/* Display Options */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Display-Optionen</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showTicker}
                        onChange={(e) => setShowTicker(e.target.checked)}
                        className="rounded"
                      />
                      Statistik-Ticker anzeigen
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showQrOverlay}
                        onChange={(e) => setShowQrOverlay(e.target.checked)}
                        className="rounded"
                      />
                      QR-Code Overlay anzeigen
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={updateWall}
                  disabled={saving}
                  className="bg-purple-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Speichere...' : 'Einstellungen speichern'}
                </Button>
              </div>
            </div>

            {/* Print Terminal Settings */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-500" />
                Print-Terminal
                {canPrint ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${printEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {printEnabled ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Upgrade nötig
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Gäste laden Fotos hoch, erhalten einen PIN-Code und drucken Sticker am Terminal.
              </p>

              {canPrint ? (
                <div className="space-y-4">
                  {/* Print Enabled Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Print-Terminal aktivieren</div>
                      <div className="text-xs text-gray-400">Gäste sehen den Upload-Button für die Mosaic Wall</div>
                    </div>
                    <button
                      onClick={() => setPrintEnabled(!printEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        printEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        printEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {printEnabled && (
                    <>
                      {/* Print Confirmation Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Print-Bestätigung</div>
                          <div className="text-xs text-gray-400">Tile erscheint erst auf der Digital-Wall nach dem Druck</div>
                        </div>
                        <button
                          onClick={() => setPrintConfirmation(!printConfirmation)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            printConfirmation ? 'bg-emerald-600' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            printConfirmation ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Reservation Timeout */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Reservierungs-Timeout ({reservationTimeout} Min.)
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                          Wie lange ein PIN-Code gültig bleibt, bevor er abläuft
                        </p>
                        <input
                          type="range"
                          value={reservationTimeout}
                          onChange={(e) => setReservationTimeout(Number(e.target.value))}
                          min={5}
                          max={60}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>5 Min.</span>
                          <span>60 Min.</span>
                        </div>
                      </div>

                      {/* Terminal URL */}
                      {eventSlug && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">Terminal-URL:</div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-emerald-700 flex-1">
                              print.gästefotos.com/t/{eventSlug}
                            </code>
                            <a
                              href={`https://print.xn--gstefotos-v2a.com/t/${eventSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {getUpgradeMessage('mosaicPrint')}
                </div>
              )}
            </div>

            {/* Status Control */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3">Status</h3>
              <div className="flex items-center gap-3">
                {wall.status === 'DRAFT' && (
                  <Button
                    onClick={() => updateStatus('ACTIVE')}
                    disabled={saving || !wall.targetImageUrl}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Mosaic Wall aktivieren
                  </Button>
                )}
                {wall.status === 'ACTIVE' && (
                  <>
                    <Button
                      onClick={() => updateStatus('COMPLETED')}
                      disabled={saving}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Als fertig markieren
                    </Button>
                    <Button
                      onClick={() => updateStatus('DRAFT')}
                      disabled={saving}
                      className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pausieren
                    </Button>
                  </>
                )}
                {wall.status === 'COMPLETED' && (
                  <Button
                    onClick={() => updateStatus('ACTIVE')}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Reaktivieren
                  </Button>
                )}

                {!wall.targetImageUrl && wall.status === 'DRAFT' && (
                  <span className="text-sm text-amber-600">
                    Bitte zuerst ein Zielbild hochladen, bevor die Wall aktiviert wird.
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Fortschritt</span>
                  <span className="font-medium">{progress}% ({tileCount}/{totalCells})</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && cropImageSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Zielbild zuschneiden ({gridWidth}:{gridHeight})</h3>
              <button onClick={handleCropCancel} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                ✕
              </button>
            </div>

            {/* Crop Area */}
            <div className="p-4 bg-gray-50 flex items-center justify-center max-h-[60vh] overflow-auto">
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
                  alt="Zielbild zuschneiden"
                  onLoad={onCropImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>

            {/* Hint */}
            <div className="px-4 py-2 bg-purple-50 border-t border-purple-100">
              <p className="text-xs text-purple-700 text-center">
                Ziehe die Ecken um den Ausschnitt anzupassen — Seitenverhältnis {gridWidth}:{gridHeight}
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCropCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCropConfirm}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
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
