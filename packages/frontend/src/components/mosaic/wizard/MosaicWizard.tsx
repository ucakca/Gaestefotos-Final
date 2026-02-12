'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sparkles, Crown } from 'lucide-react';
import api from '@/lib/api';
import { usePackageFeatures } from '@/hooks/usePackageFeatures';
import { MosaicWizardState, INITIAL_WIZARD_STATE } from './types';
import WizardStepIndicator from './WizardStepIndicator';
import Step1ModeGrid from './Step1ModeGrid';
import Step2TargetImage from './Step2TargetImage';
import Step3Overlay from './Step3Overlay';
import Step4Display from './Step4Display';
import Step5Preview from './Step5Preview';

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
  scatterValue?: number;
  selectedAnimations?: string[];
  _count?: { tiles: number };
}

interface Props {
  eventId: string;
}

export default function MosaicWizard({ eventId }: Props) {
  const router = useRouter();
  const [wall, setWall] = useState<MosaicWall | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingOverlay, setAnalyzingOverlay] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{ intensity: number; reasoning: string } | null>(null);
  const [eventSlug, setEventSlug] = useState('');
  const [tileCount, setTileCount] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [isDemo, setIsDemo] = useState(false);

  const [state, setState] = useState<MosaicWizardState>(INITIAL_WIZARD_STATE);

  const { isFeatureEnabled, packageName, features } = usePackageFeatures(eventId);
  const canMosaic = isFeatureEnabled('mosaicWall');
  const canPrint = isFeatureEnabled('mosaicPrint');

  // Demo mode: free users get 4×4 max, no print, watermark
  const DEMO_MAX_GRID = 4;

  const updateState = useCallback((updates: Partial<MosaicWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Load existing wall
  const loadWall = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/mosaic`);
      if (data.wall) {
        const w = data.wall as MosaicWall;
        setWall(w);
        if (data.isDemo !== undefined) setIsDemo(data.isDemo);
        setTileCount(w._count?.tiles || 0);
        // Hydrate wizard state from existing wall
        setState((prev) => ({
          ...prev,
          mode: w.printEnabled ? 'PRINT' : 'DIGITAL',
          gridWidth: w.gridWidth,
          gridHeight: w.gridHeight,
          tileSizeMm: w.tileSizeMm,
          boardWidthMm: w.boardWidthMm,
          boardHeightMm: w.boardHeightMm,
          overlayIntensity: w.overlayIntensity,
          scatterValue: (w as any).scatterValue || 0,
          selectedAnimations: (w as any).selectedAnimations || [w.displayAnimation || 'ZOOM_FLY'],
          showTicker: w.showTicker,
          showQrOverlay: w.showQrOverlay,
          autoFillEnabled: w.autoFillEnabled,
          autoFillThreshold: w.autoFillThreshold,
          printEnabled: w.printEnabled ?? false,
          printConfirmation: w.printConfirmation ?? true,
          reservationTimeout: w.reservationTimeout ?? 15,
          status: w.status,
          targetImageUrl: w.targetImageUrl,
        }));
        // If wall exists, allow navigating to any step
        setMaxReachedStep(5);
      }
    } catch {
      // No wall exists yet
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadWall();
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventSlug(data.event?.slug || '');
    }).catch(() => {});
  }, [eventId, loadWall]);

  // Navigation
  const goToStep = (step: number) => {
    updateState({ currentStep: step });
    if (step > maxReachedStep) setMaxReachedStep(step);
  };

  const handleNext = () => {
    const next = Math.min(state.currentStep + 1, 5);
    goToStep(next);
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  };

  // Upload cropped target image
  const handleUploadCropped = async (blob: Blob) => {
    setAnalyzing(true);
    try {
      const file = new File([blob], 'target-cropped.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('targetImage', file);

      // Create wall first if needed
      if (!wall) {
        const { data: createData } = await api.post(`/events/${eventId}/mosaic`, {
          gridWidth: state.gridWidth,
          gridHeight: state.gridHeight,
          tileSizeMm: state.tileSizeMm,
        });
        setWall(createData.wall);
      }

      const { data } = await api.post(`/events/${eventId}/mosaic/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.wall) {
        setWall(data.wall);
        updateState({ targetImageUrl: data.wall.targetImageUrl });
      } else {
        updateState({ targetImageUrl: data.targetImageUrl });
      }
    } catch (err) {
      console.error('Failed to upload target image', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // KI Overlay Analyse
  const handleAnalyzeOverlay = async () => {
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
  };

  const handleApplyRecommendation = (intensity: number) => {
    updateState({ overlayIntensity: intensity });
    setAiRecommendation(null);
  };

  // Save / Create
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!wall) {
        // Create
        const { data } = await api.post(`/events/${eventId}/mosaic`, {
          gridWidth: state.gridWidth,
          gridHeight: state.gridHeight,
          tileSizeMm: state.tileSizeMm,
          boardWidthMm: state.boardWidthMm,
          boardHeightMm: state.boardHeightMm,
        });
        setWall(data.wall);
      }

      // Update
      const prevIntensity = wall?.overlayIntensity;
      const { data } = await api.put(`/events/${eventId}/mosaic`, {
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        tileSizeMm: state.tileSizeMm,
        overlayIntensity: state.overlayIntensity,
        scatterValue: state.scatterValue,
        displayAnimation: state.selectedAnimations[0] || 'ZOOM_FLY',
        showTicker: state.showTicker,
        showQrOverlay: state.showQrOverlay,
        autoFillEnabled: state.autoFillEnabled,
        autoFillThreshold: state.autoFillThreshold,
        printEnabled: state.printEnabled,
        printConfirmation: state.printConfirmation,
        reservationTimeout: state.reservationTimeout,
      });
      setWall(data.wall);

      if (prevIntensity !== undefined && prevIntensity !== state.overlayIntensity && tileCount > 0) {
        api.post(`/events/${eventId}/mosaic/rerender-tiles`).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setSaving(false);
    }
  };

  // Activate
  const handleActivate = async () => {
    await handleSave();
    setSaving(true);
    try {
      const { data } = await api.put(`/events/${eventId}/mosaic`, { status: 'ACTIVE' });
      setWall(data.wall);
      updateState({ status: 'ACTIVE' });
    } catch (err) {
      console.error('Failed to activate', err);
    } finally {
      setSaving(false);
    }
  };

  const targetImageUrl = wall?.targetImageUrl || state.targetImageUrl;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Mosaik wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}/dashboard`)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                Mosaic Wall
                {isDemo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                    DEMO
                  </span>
                )}
              </h1>
            </div>
            {wall && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                wall.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                wall.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {wall.status === 'ACTIVE' ? 'Aktiv' : wall.status === 'COMPLETED' ? 'Fertig' : 'Entwurf'}
              </span>
            )}
          </div>

          {/* Step Indicator */}
          <WizardStepIndicator
            currentStep={state.currentStep}
            onStepClick={goToStep}
            maxReachedStep={maxReachedStep}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {state.currentStep === 1 && (
          <Step1ModeGrid
            state={state}
            onChange={updateState}
            canMosaic={canMosaic || isDemo}
            canPrint={canPrint}
            isDemo={isDemo}
            demoMaxGrid={DEMO_MAX_GRID}
            onUpgrade={() => router.push(`/events/${eventId}/package`)}
          />
        )}

        {state.currentStep === 2 && (
          <Step2TargetImage
            state={state}
            onChange={updateState}
            targetImageUrl={targetImageUrl}
            analyzing={analyzing}
            onUploadCropped={handleUploadCropped}
          />
        )}

        {state.currentStep === 3 && (
          <Step3Overlay
            state={state}
            onChange={updateState}
            targetImageUrl={targetImageUrl}
            analyzingOverlay={analyzingOverlay}
            aiRecommendation={aiRecommendation}
            onAnalyze={handleAnalyzeOverlay}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {state.currentStep === 4 && (
          <Step4Display
            state={state}
            onChange={updateState}
            canPrint={canPrint}
            hasBoothAddon={false}
            hasKiBoothAddon={false}
            onUpgrade={() => router.push(`/events/${eventId}/package`)}
          />
        )}

        {state.currentStep === 5 && (
          <Step5Preview
            state={state}
            targetImageUrl={targetImageUrl}
            eventSlug={eventSlug}
            tileCount={tileCount}
            saving={saving}
            wallExists={!!wall}
            onActivate={handleActivate}
            onSave={handleSave}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      {state.currentStep < 5 && (
        <div className="sticky bottom-0 bg-white border-t px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto flex gap-3">
            {state.currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 rounded-xl text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
