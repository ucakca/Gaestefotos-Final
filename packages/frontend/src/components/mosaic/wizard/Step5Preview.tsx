'use client';

import { Eye, ExternalLink, Play, Printer, LayoutGrid, Image, Sparkles, Sliders, Monitor } from 'lucide-react';
import { MosaicWizardState, ANIMATIONS } from './types';
import { Button } from '@/components/ui/Button';

interface Props {
  state: MosaicWizardState;
  targetImageUrl: string | null;
  eventSlug: string;
  tileCount: number;
  saving: boolean;
  wallExists: boolean;
  onActivate: () => void;
  onSave: () => void;
}

export default function Step5Preview({
  state,
  targetImageUrl,
  eventSlug,
  tileCount,
  saving,
  wallExists,
  onActivate,
  onSave,
}: Props) {
  const totalCells = state.gridWidth * state.gridHeight;
  const progress = totalCells > 0 ? Math.round((tileCount / totalCells) * 100) : 0;
  const selectedAnimNames = state.selectedAnimations
    .map((v) => ANIMATIONS.find((a) => a.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Zusammenfassung</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Überprüfe deine Einstellungen und starte das Mosaik.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        {/* Mode + Grid */}
        <div className="p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            {state.mode === 'DIGITAL' ? (
              <Monitor className="w-4 h-4 text-purple-500" />
            ) : (
              <Printer className="w-4 h-4 text-purple-500" />
            )}
            <span className="text-sm font-semibold text-foreground/80">
              {state.mode === 'DIGITAL' ? 'Digital' : 'Print'} Mosaik
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">{state.gridWidth}×{state.gridHeight}</div>
              <div className="text-[10px] text-muted-foreground/70">Grid</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{totalCells}</div>
              <div className="text-[10px] text-muted-foreground/70">Tiles</div>
            </div>
            {state.mode === 'PRINT' && state.boardWidthMm && state.boardHeightMm && (
              <div>
                <div className="text-lg font-bold text-foreground">{state.boardWidthMm/10}×{state.boardHeightMm/10}cm</div>
                <div className="text-[10px] text-muted-foreground/70">Board</div>
              </div>
            )}
            {state.mode === 'DIGITAL' && (
              <div>
                <div className="text-lg font-bold text-foreground">{state.gridWidth}:{state.gridHeight}</div>
                <div className="text-[10px] text-muted-foreground/70">Ratio</div>
              </div>
            )}
          </div>
        </div>

        {/* Target Image */}
        <div className="p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground/80">Zielbild</span>
          </div>
          {targetImageUrl ? (
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-lg overflow-hidden border bg-muted shrink-0"
                style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}` }}
              >
                <img src={targetImageUrl} alt="Zielbild" className="w-full h-full object-contain" />
              </div>
              <div className="text-sm text-muted-foreground">
                Overlay: <strong>{state.overlayIntensity}%</strong>
                {state.scatterValue > 0 && (
                  <> · Scatter: <strong>{state.scatterValue}%</strong></>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70">Kein Zielbild — reines Foto-Raster</p>
          )}
        </div>

        {/* Animations */}
        <div className="p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground/80">Animationen</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedAnimNames.map((name) => (
              <span key={name} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            {selectedAnimNames.length === ANIMATIONS.length
              ? 'Zufällige Animation pro Tile'
              : selectedAnimNames.length === 1
                ? 'Alle Tiles gleiche Animation'
                : `${selectedAnimNames.length} Animationen im Wechsel`}
          </p>
        </div>

        {/* Display Options */}
        <div className="p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground/80">Optionen</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${state.showTicker ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/70'}`}>
              Ticker {state.showTicker ? '✓' : '✗'}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${state.autoFillEnabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/70'}`}>
              Auto-Fill {state.autoFillEnabled ? `ab ${state.autoFillThreshold}%` : '✗'}
            </span>
            {state.mode === 'PRINT' && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-success/15 text-success">
                Sticker-Druck ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress (if wall exists) */}
      {wallExists && tileCount > 0 && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Fortschritt</span>
            <span className="font-medium">{progress}% ({tileCount}/{totalCells})</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Save / Activate */}
        {!wallExists ? (
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-base font-semibold"
          >
            {saving ? 'Erstelle...' : 'Mosaic Wall erstellen'}
          </Button>
        ) : state.status === 'DRAFT' ? (
          <div className="flex gap-3">
            <Button
              onClick={onSave}
              disabled={saving}
              variant="secondary"
              className="flex-1 py-3 rounded-xl font-medium"
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </Button>
            <Button
              onClick={onActivate}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Aktivieren
            </Button>
          </div>
        ) : (
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-base font-semibold"
          >
            {saving ? 'Speichere...' : 'Einstellungen speichern'}
          </Button>
        )}

        {/* Live Display Link */}
        {wallExists && eventSlug && (
          <a
            href={`/live/${eventSlug}/mosaic`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-muted rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/80 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Live-Display öffnen
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Print Station Link */}
        {wallExists && state.mode === 'PRINT' && eventSlug && (
          <a
            href={`/events/${eventSlug}/mosaic/print-station`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-purple-50 border border-purple-200 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print-Station öffnen
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
