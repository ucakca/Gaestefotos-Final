'use client';

import { Sparkles } from 'lucide-react';
import { MosaicWizardState } from './types';
import { Slider } from '@/components/ui/Slider';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  targetImageUrl: string | null;
  analyzingOverlay: boolean;
  aiRecommendation: { intensity: number; reasoning: string } | null;
  onAnalyze: () => void;
  onApplyRecommendation: (intensity: number) => void;
}

export default function Step3Overlay({
  state,
  onChange,
  targetImageUrl,
  analyzingOverlay,
  aiRecommendation,
  onAnalyze,
  onApplyRecommendation,
}: Props) {
  const hasTarget = !!targetImageUrl;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Overlay & Farbanpassung</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Steuere wie stark das Zielbild über den Gäste-Fotos sichtbar ist.
        </p>
      </div>

      {!hasTarget && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700">
            Kein Zielbild vorhanden. Du kannst diesen Schritt überspringen oder zurück gehen und ein Bild hochladen.
          </p>
        </div>
      )}

      {hasTarget && (
        <>
          {/* KI Analysis Button */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-700">KI-Analyse</span>
              </div>
              <button
                type="button"
                onClick={onAnalyze}
                disabled={analyzingOverlay}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
              >
                {analyzingOverlay ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round"/>
                    </svg>
                    Analysiert...
                  </span>
                ) : (
                  'Bild analysieren'
                )}
              </button>
            </div>
            <p className="text-xs text-purple-600">
              Die KI analysiert Kontrast, Helligkeit und Detailgrad deines Zielbilds für die optimale Overlay-Stärke.
            </p>

            {aiRecommendation && (
              <div className="mt-3 p-3 bg-card rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-700">
                    Empfehlung: {aiRecommendation.intensity}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyRecommendation(aiRecommendation.intensity)}
                    className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md hover:bg-purple-200 transition-colors font-medium"
                  >
                    Übernehmen
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{aiRecommendation.reasoning}</p>
              </div>
            )}
          </div>

          {/* Overlay Intensity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground/80">
                Zielbild-Overlay
              </label>
              <span className="text-sm font-bold text-purple-600">{state.overlayIntensity}%</span>
            </div>
            <Slider
              value={[state.overlayIntensity]}
              onValueChange={([v]) => onChange({ overlayIntensity: v })}
              min={0}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1.5">
              <span>Nur Fotos</span>
              <span>Ausgewogen</span>
              <span>Zielbild dominant</span>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Vorschau</div>
            <div
              className="relative w-full rounded-xl overflow-hidden border"
              style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '220px' }}
            >
              <img
                src={targetImageUrl}
                alt="Zielbild Vorschau"
                className="w-full h-full object-cover"
                style={{ opacity: state.overlayIntensity / 100 }}
              />
              {/* Simulated photo grid */}
              <div className="absolute inset-0 grid" style={{
                gridTemplateColumns: `repeat(${Math.min(state.gridWidth, 16)}, 1fr)`,
                gridTemplateRows: `repeat(${Math.min(state.gridHeight, 16)}, 1fr)`,
                gap: '1px',
              }}>
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

          {/* Scatter Value */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground/80">
                Scatter (Zufälligkeit)
              </label>
              <span className="text-sm font-bold text-purple-600">{state.scatterValue}%</span>
            </div>
            <Slider
              value={[state.scatterValue]}
              onValueChange={([v]) => onChange({ scatterValue: v })}
              min={0}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1.5">
              <span>Exakte Farbplatzierung</span>
              <span>Komplett zufällig</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              0% = Fotos werden exakt nach Farbe platziert. Höhere Werte verteilen Fotos zufälliger über das Grid.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
