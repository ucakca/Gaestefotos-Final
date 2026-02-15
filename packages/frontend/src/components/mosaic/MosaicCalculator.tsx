'use client';

import { useMemo, useState } from 'react';
import { Calculator, Users, Clock, LayoutGrid, Zap, Info } from 'lucide-react';

interface MosaicCalculatorProps {
  onSelectPreset?: (gridWidth: number, gridHeight: number) => void;
  className?: string;
}

const BOARD_PRESETS = [
  { label: 'Klein', w: 12, h: 12, tiles: 144 },
  { label: 'Mittel', w: 24, h: 24, tiles: 576 },
  { label: 'Groß', w: 48, h: 32, tiles: 1536 },
];

export default function MosaicCalculator({ onSelectPreset, className = '' }: MosaicCalculatorProps) {
  const [guestCount, setGuestCount] = useState(100);
  const [eventHours, setEventHours] = useState(5);
  const [uploadRate, setUploadRate] = useState(50); // % of guests uploading

  const result = useMemo(() => {
    const expectedPhotos = Math.round(guestCount * (uploadRate / 100));

    // Find best matching board
    let recommended = BOARD_PRESETS[0];
    for (const preset of BOARD_PRESETS) {
      if (expectedPhotos <= preset.tiles * 0.85) {
        recommended = preset;
        break;
      }
      recommended = preset;
    }

    const autoFillCount = Math.max(0, recommended.tiles - expectedPhotos);
    const autoFillPercent = Math.round((autoFillCount / recommended.tiles) * 100);
    const realPhotoPercent = 100 - autoFillPercent;

    // Tiles per minute
    const eventMinutes = eventHours * 60;
    const tilesPerMinute = eventMinutes > 0 ? (expectedPhotos / eventMinutes).toFixed(2) : '0';

    // Estimated completion
    const fillRatePerHour = expectedPhotos / eventHours;
    const hoursToFill = recommended.tiles / fillRatePerHour;
    const estimatedHours = Math.min(hoursToFill, eventHours * 2);

    // Auto-fill recommendation
    const needsAutoFill = expectedPhotos < recommended.tiles;
    const autoFillThreshold = Math.max(50, Math.round(realPhotoPercent - 5));

    return {
      expectedPhotos,
      recommended,
      autoFillCount,
      autoFillPercent,
      realPhotoPercent,
      tilesPerMinute,
      estimatedHours: estimatedHours.toFixed(1),
      needsAutoFill,
      autoFillThreshold,
    };
  }, [guestCount, eventHours, uploadRate]);

  return (
    <div className={`bg-card rounded-xl border p-6 ${className}`}>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-purple-500" />
        Mosaik-Rechner
      </h3>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 mb-1">
            <Users className="w-4 h-4 text-muted-foreground/70" />
            Gästeanzahl
          </label>
          <input
            type="number"
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
            min={1}
            max={5000}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground/70" />
            Event-Dauer (Std.)
          </label>
          <input
            type="number"
            value={eventHours}
            onChange={(e) => setEventHours(Math.max(1, Number(e.target.value)))}
            min={1}
            max={24}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 mb-1">
            <Zap className="w-4 h-4 text-muted-foreground/70" />
            Upload-Rate ({uploadRate}%)
          </label>
          <input
            type="range"
            value={uploadRate}
            onChange={(e) => setUploadRate(Number(e.target.value))}
            min={10}
            max={100}
            step={5}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-xs text-muted-foreground/70">
            <span>konservativ</span>
            <span>optimistisch</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-purple-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Erwartete Fotos</span>
          <span className="font-bold text-purple-700">{result.expectedPhotos}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Empfohlenes Board</span>
          <button
            onClick={() => onSelectPreset?.(result.recommended.w, result.recommended.h)}
            className="font-bold text-purple-700 hover:underline flex items-center gap-1"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {result.recommended.label} ({result.recommended.w}x{result.recommended.h} = {result.recommended.tiles} Tiles)
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Echte Fotos</span>
          <span className="font-medium">{result.realPhotoPercent}%</span>
        </div>

        {result.needsAutoFill && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auto-Fill nötig</span>
            <span className="font-medium text-amber-600">{result.autoFillCount} Tiles ({result.autoFillPercent}%)</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tiles/Minute</span>
          <span className="font-medium">{result.tilesPerMinute}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Geschätzte Fertigstellung</span>
          <span className="font-medium">~{result.estimatedHours} Stunden</span>
        </div>

        {/* Recommendation */}
        <div className="pt-2 border-t border-purple-200">
          <div className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              {result.realPhotoPercent >= 80
                ? 'Das Board wird großteils mit echten Fotos gefüllt. Auto-Fill empfohlen für letzte Lücken.'
                : result.realPhotoPercent >= 50
                  ? 'Gute Mischung aus echten Fotos und Auto-Fill. Erwäge ein kleineres Board für mehr echte Abdeckung.'
                  : 'Viele Lücken erwartet. Wähle ein kleineres Board oder erhöhe die Upload-Motivation (QR-Codes, Challenges).'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
