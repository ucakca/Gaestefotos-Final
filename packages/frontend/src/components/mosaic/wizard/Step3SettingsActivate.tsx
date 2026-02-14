'use client';

import { useCallback, useRef, useState } from 'react';
import { Play, Hash, Lock, Crown, Eye, ExternalLink, Printer, Monitor, Image, Sparkles, Sliders, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MosaicWizardState, ANIMATIONS } from './types';
import { Button } from '@/components/ui/Button';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  canPrint: boolean;
  hasBoothAddon: boolean;
  hasKiBoothAddon: boolean;
  targetImageUrl: string | null;
  eventSlug: string;
  tileCount: number;
  saving: boolean;
  wallExists: boolean;
  onActivate: () => void;
  onSave: () => void;
  onUpgrade?: () => void;
}

const ANIMATION_VARIANTS: Record<string, { initial: any; animate: any; transition: any }> = {
  FLIP: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  PUZZLE: {
    initial: { rotate: 180, scale: 0, opacity: 0 },
    animate: { rotate: 0, scale: 1, opacity: 1 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  PARTICLES: {
    initial: { opacity: 0, filter: 'blur(12px)', scale: 0.8 },
    animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
    transition: { duration: 0.7, ease: 'easeOut' },
  },
  ZOOM_FLY: {
    initial: { opacity: 0, scale: 3 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  RIPPLE: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 15 },
  },
};

export default function Step3SettingsActivate({
  state,
  onChange,
  canPrint,
  hasBoothAddon,
  hasKiBoothAddon,
  targetImageUrl,
  eventSlug,
  tileCount,
  saving,
  wallExists,
  onActivate,
  onSave,
  onUpgrade,
}: Props) {
  const [playingAnim, setPlayingAnim] = useState<string | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout>();

  const isSelected = (anim: string) => state.selectedAnimations.includes(anim);

  const toggleAnimation = (anim: string) => {
    const current = state.selectedAnimations;
    if (current.includes(anim)) {
      if (current.length <= 1) return;
      onChange({ selectedAnimations: current.filter((a) => a !== anim) });
    } else {
      onChange({ selectedAnimations: [...current, anim] });
    }
  };

  const playPreview = useCallback((anim: string) => {
    setPlayingAnim(null);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    requestAnimationFrame(() => {
      setPlayingAnim(anim);
      playTimeoutRef.current = setTimeout(() => setPlayingAnim(null), 1500);
    });
  }, []);

  const selectAll = () => {
    onChange({ selectedAnimations: ANIMATIONS.map((a) => a.value) });
  };

  const selectedCount = state.selectedAnimations.length;
  const allSelected = selectedCount === ANIMATIONS.length;
  const totalCells = state.gridWidth * state.gridHeight;
  const progress = totalCells > 0 ? Math.round((tileCount / totalCells) * 100) : 0;
  const selectedAnimNames = state.selectedAnimations
    .map((v) => ANIMATIONS.find((a) => a.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Einstellungen & Start</h2>
        <p className="text-sm text-gray-500 mb-4">
          Animationen, Quellen und Optionen konfigurieren.
        </p>
      </div>

      {/* ─── Animation Tiles ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Tile-Animationen</label>
          <button
            type="button"
            onClick={selectAll}
            className={`text-xs font-medium transition-colors ${
              allSelected ? 'text-gray-400' : 'text-purple-600 hover:text-purple-700'
            }`}
          >
            Alle auswählen
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {ANIMATIONS.map((anim) => {
            const selected = isSelected(anim.value);
            const isPlaying = playingAnim === anim.value;
            const variant = ANIMATION_VARIANTS[anim.value];

            return (
              <div
                key={anim.value}
                className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                  selected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className="aspect-square bg-gray-900 flex items-center justify-center cursor-pointer relative"
                  onClick={() => playPreview(anim.value)}
                >
                  <AnimatePresence mode="wait">
                    {isPlaying && variant ? (
                      <motion.div
                        key={`${anim.value}-play`}
                        initial={variant.initial}
                        animate={variant.animate}
                        transition={variant.transition}
                        className="w-3/4 h-3/4 rounded-md"
                        style={{
                          background: `linear-gradient(135deg, hsl(${ANIMATIONS.indexOf(anim) * 60}, 70%, 60%), hsl(${ANIMATIONS.indexOf(anim) * 60 + 40}, 70%, 50%))`,
                        }}
                      />
                    ) : (
                      <motion.div
                        key={`${anim.value}-idle`}
                        initial={false}
                        className="flex items-center justify-center"
                      >
                        <Play className="w-5 h-5 text-white/60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-2 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleAnimation(anim.value)}
                    className="h-3.5 w-3.5 rounded border-gray-300 shrink-0"
                    style={{ accentColor: '#9333ea' }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{anim.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          {selectedCount === 1
            ? `Alle Tiles: "${ANIMATIONS.find((a) => a.value === state.selectedAnimations[0])?.label}"`
            : selectedCount === ANIMATIONS.length
              ? 'Zufällige Animation pro Tile'
              : `${selectedCount} Animationen im Wechsel`}
        </p>
      </div>

      {/* ─── Display Options (compact) ─── */}
      <div className="space-y-2">
        <label className="flex items-center justify-between p-3 bg-white rounded-xl border cursor-pointer">
          <div>
            <span className="text-sm font-medium text-gray-700">Statistik-Ticker</span>
            <p className="text-xs text-gray-400">Fortschritt am unteren Rand</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ showTicker: !state.showTicker })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              state.showTicker ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              state.showTicker ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>

        <label className="flex items-center justify-between p-3 bg-white rounded-xl border cursor-pointer">
          <div>
            <span className="text-sm font-medium text-gray-700">Auto-Fill</span>
            <p className="text-xs text-gray-400">Ab {state.autoFillThreshold}% automatisch füllen</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ autoFillEnabled: !state.autoFillEnabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              state.autoFillEnabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              state.autoFillEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      </div>

      {/* ─── Compact Summary ─── */}
      <div className="p-4 bg-gray-50 rounded-xl border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">Zusammenfassung</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{state.gridWidth}×{state.gridHeight}</div>
            <div className="text-[10px] text-gray-400">Grid</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{totalCells}</div>
            <div className="text-[10px] text-gray-400">Tiles</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {state.mode === 'DIGITAL' ? 'Digital' : 'Print'}
            </div>
            <div className="text-[10px] text-gray-400">Modus</div>
          </div>
        </div>

        {targetImageUrl && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <div className="w-10 h-10 rounded-lg overflow-hidden border bg-gray-100 shrink-0">
              <img src={targetImageUrl} alt="Zielbild" className="w-full h-full object-contain" />
            </div>
            <div className="text-xs text-gray-500">
              Overlay: <strong>{state.overlayIntensity}%</strong>
              {state.scatterValue > 0 && (
                <> · Scatter: <strong>{state.scatterValue}%</strong></>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2 border-t">
          {selectedAnimNames.map((name) => (
            <span key={name} className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Progress (if wall exists) ─── */}
      {wallExists && tileCount > 0 && (
        <div>
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
      )}

      {/* ─── Actions ─── */}
      <div className="space-y-3">
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

        {wallExists && eventSlug && (
          <a
            href={`/live/${eventSlug}/mosaic`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Live-Display öffnen
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

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
