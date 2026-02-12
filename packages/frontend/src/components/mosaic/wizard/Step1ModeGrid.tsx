'use client';

import { useState } from 'react';
import { Monitor, Printer, Lock, Crown, LayoutGrid, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { MosaicWizardState, GRID_PRESETS, PRINT_BOARD_PRESETS, TILE_SIZE_PRESETS } from './types';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  canMosaic: boolean;
  canPrint: boolean;
  isDemo?: boolean;
  demoMaxGrid?: number;
  onUpgrade?: () => void;
}

export default function Step1ModeGrid({ state, onChange, canMosaic, canPrint, isDemo, demoMaxGrid = 4, onUpgrade }: Props) {
  const [showCustomGrid, setShowCustomGrid] = useState(false);
  const [showPrintDetails, setShowPrintDetails] = useState(false);

  const isPresetSelected = (w: number, h: number) => state.gridWidth === w && state.gridHeight === h;

  const selectPreset = (w: number, h: number) => {
    onChange({ gridWidth: w, gridHeight: h });
  };

  const selectMode = (mode: 'DIGITAL' | 'PRINT') => {
    if (mode === 'DIGITAL' && !canMosaic) return;
    if (mode === 'PRINT' && !canPrint) return;
    onChange({
      mode,
      printEnabled: mode === 'PRINT',
    });
  };

  // Print: calculate grid from board + tile size
  const calcPrintGrid = (boardW: number, boardH: number, tileMm: number) => {
    const cols = Math.floor(boardW / tileMm);
    const rows = Math.floor(boardH / tileMm);
    onChange({
      boardWidthMm: boardW,
      boardHeightMm: boardH,
      tileSizeMm: tileMm,
      gridWidth: cols,
      gridHeight: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Modus wählen</h2>
        <p className="text-sm text-gray-500 mb-4">Wie soll dein Mosaik angezeigt werden?</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Digital */}
          <button
            type="button"
            onClick={() => selectMode('DIGITAL')}
            disabled={!canMosaic}
            className={`relative p-4 sm:p-5 rounded-xl border-2 text-left transition-all ${
              state.mode === 'DIGITAL' && canMosaic
                ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-100'
                : canMosaic
                  ? 'border-gray-200 hover:border-purple-300 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                state.mode === 'DIGITAL' && canMosaic ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <Monitor className={`w-5 h-5 ${
                  state.mode === 'DIGITAL' && canMosaic ? 'text-purple-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base">Digital</div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Live auf Screen oder Beamer
                </p>
              </div>
            </div>
            {canPrint ? (
              <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                <Check className="w-2.5 h-2.5" /> In Print enthalten
              </span>
            ) : canMosaic ? (
              <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                Gebucht
              </span>
            ) : (
              <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                <Lock className="w-2.5 h-2.5" /> Upgrade
              </span>
            )}
          </button>

          {/* Print + Digital */}
          <button
            type="button"
            onClick={() => selectMode('PRINT')}
            disabled={!canPrint}
            className={`relative p-4 sm:p-5 rounded-xl border-2 text-left transition-all ${
              state.mode === 'PRINT' && canPrint
                ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-100'
                : canPrint
                  ? 'border-gray-200 hover:border-purple-300 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                state.mode === 'PRINT' && canPrint ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <Printer className={`w-5 h-5 ${
                  state.mode === 'PRINT' && canPrint ? 'text-purple-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base">Print + Digital</div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Sticker drucken + Live-Display
                </p>
              </div>
            </div>
            {canPrint ? (
              <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                Gebucht
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }}
                className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors"
              >
                <Crown className="w-2.5 h-2.5" /> Upgraden
              </button>
            )}
          </button>
        </div>

        {!canMosaic && (
          <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-700">
              Mosaic Wall ist ein Premium-Feature. <button type="button" onClick={onUpgrade} className="font-semibold underline">Jetzt upgraden</button> um loszulegen.
            </p>
          </div>
        )}
      </div>

      {/* Demo Banner */}
      {isDemo && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Demo-Modus — Kostenlos testen!</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Du kannst den kompletten Wizard durchlaufen. Im Demo-Modus ist das Grid auf {demoMaxGrid}×{demoMaxGrid} begrenzt und das Live-Display enthält ein Wasserzeichen.
              </p>
              <button type="button" onClick={onUpgrade} className="mt-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-700 underline">
                Jetzt upgraden für volle Features →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Selection — depends on mode */}
      {state.mode === 'DIGITAL' && canMosaic && (() => {
        const maxGrid = isDemo ? demoMaxGrid : 64;
        const availablePresets = isDemo
          ? GRID_PRESETS.filter((p) => p.w <= demoMaxGrid && p.h <= demoMaxGrid)
          : GRID_PRESETS;

        return (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Grid-Größe</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isDemo ? `Demo: Maximal ${demoMaxGrid}×${demoMaxGrid} Grid` : 'Wie viele Tiles soll das Mosaik haben?'}
            </p>

            {/* Demo: show only 4×4 preset */}
            {isDemo ? (
              <div className="p-4 rounded-xl border-2 border-purple-500 bg-purple-50 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutGrid className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-sm">Demo</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">FREE</span>
                </div>
                <div className="text-xs text-gray-500">
                  {demoMaxGrid}×{demoMaxGrid} = {demoMaxGrid * demoMaxGrid} Tiles
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  ~{demoMaxGrid * demoMaxGrid} Gäste • Wasserzeichen
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => selectPreset(preset.w, preset.h)}
                    className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                      isPresetSelected(preset.w, preset.h)
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <LayoutGrid className={`w-4 h-4 ${
                        isPresetSelected(preset.w, preset.h) ? 'text-purple-500' : 'text-gray-400'
                      }`} />
                      <span className="font-semibold text-sm">{preset.label}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {preset.w}×{preset.h} = {preset.tiles} Tiles
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      ~{preset.guests} Gäste
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Grid Toggle — only for paid users */}
            {!isDemo && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCustomGrid(!showCustomGrid)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-purple-600 font-medium hover:text-purple-700 transition-colors"
                >
                  {showCustomGrid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Eigene Größe
                </button>

                {showCustomGrid && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Spalten</label>
                        <input
                          type="number"
                          value={state.gridWidth}
                          onChange={(e) => onChange({ gridWidth: Math.max(4, Math.min(maxGrid, Number(e.target.value))) })}
                          min={4}
                          max={maxGrid}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Reihen</label>
                        <input
                          type="number"
                          value={state.gridHeight}
                          onChange={(e) => onChange({ gridHeight: Math.max(4, Math.min(maxGrid, Number(e.target.value))) })}
                          min={4}
                          max={maxGrid}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      = {state.gridWidth * state.gridHeight} Tiles
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Print Mode: Board + Tile Size → Grid */}
      {state.mode === 'PRINT' && canPrint && (
        <div className="space-y-5">
          {/* Board Size */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Board-Größe</h2>
            <p className="text-sm text-gray-500 mb-4">Maße der physischen Mosaic-Wand</p>

            <div className="grid grid-cols-2 gap-2.5">
              {PRINT_BOARD_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => calcPrintGrid(preset.wmm, preset.hmm, state.tileSizeMm)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    state.boardWidthMm === preset.wmm && state.boardHeightMm === preset.hmm
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <span className="font-semibold text-sm">{preset.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPrintDetails(!showPrintDetails)}
              className="mt-3 flex items-center gap-1.5 text-sm text-purple-600 font-medium"
            >
              {showPrintDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Eigene Maße
            </button>

            {showPrintDetails && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Breite (mm)</label>
                  <input
                    type="number"
                    value={state.boardWidthMm || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) calcPrintGrid(v, state.boardHeightMm || 600, state.tileSizeMm);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Höhe (mm)</label>
                  <input
                    type="number"
                    value={state.boardHeightMm || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) calcPrintGrid(state.boardWidthMm || 800, v, state.tileSizeMm);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tile Size */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sticker-Größe</h2>
            <p className="text-sm text-gray-500 mb-4">Abhängig vom Drucker</p>

            <div className="flex gap-2">
              {TILE_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.mm}
                  type="button"
                  onClick={() => {
                    if (state.boardWidthMm && state.boardHeightMm) {
                      calcPrintGrid(state.boardWidthMm, state.boardHeightMm, preset.mm);
                    } else {
                      onChange({ tileSizeMm: preset.mm });
                    }
                  }}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                    state.tileSizeMm === preset.mm
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <span className="font-semibold text-sm">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Grid Info */}
          {state.boardWidthMm && state.boardHeightMm && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-sm text-purple-700">Berechnetes Grid</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-purple-700">{state.gridWidth}×{state.gridHeight}</div>
                  <div className="text-[10px] text-purple-500">Grid</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-700">{state.gridWidth * state.gridHeight}</div>
                  <div className="text-[10px] text-purple-500">Tiles</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-700">{state.tileSizeMm}mm</div>
                  <div className="text-[10px] text-purple-500">Sticker</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Preview */}
      {(canMosaic || canPrint) && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Vorschau</div>
          <div
            className="w-full bg-gray-900 rounded-xl overflow-hidden border border-gray-200"
            style={{ aspectRatio: `${state.gridWidth} / ${state.gridHeight}`, maxHeight: '200px' }}
          >
            <div
              className="w-full h-full grid"
              style={{
                gridTemplateColumns: `repeat(${Math.min(state.gridWidth, 36)}, 1fr)`,
                gridTemplateRows: `repeat(${Math.min(state.gridHeight, 36)}, 1fr)`,
                gap: '1px',
              }}
            >
              {Array.from({ length: Math.min(state.gridWidth, 36) * Math.min(state.gridHeight, 36) }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-[1px]" />
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
            <span>{state.gridWidth}×{state.gridHeight} Grid</span>
            <span>{state.gridWidth * state.gridHeight} Tiles</span>
          </div>
        </div>
      )}
    </div>
  );
}
