'use client';

import { useCallback, useRef, useState } from 'react';
import { Play, Hash, Lock, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MosaicWizardState, ANIMATIONS } from './types';

interface Props {
  state: MosaicWizardState;
  onChange: (updates: Partial<MosaicWizardState>) => void;
  canPrint: boolean;
  hasBoothAddon: boolean;
  hasKiBoothAddon: boolean;
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

export default function Step4Display({ state, onChange, canPrint, hasBoothAddon, hasKiBoothAddon, onUpgrade }: Props) {
  const [playingAnim, setPlayingAnim] = useState<string | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout>();

  const isSelected = (anim: string) => state.selectedAnimations.includes(anim);

  const toggleAnimation = (anim: string) => {
    const current = state.selectedAnimations;
    if (current.includes(anim)) {
      if (current.length <= 1) return; // min 1
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Display & Animationen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Wähle wie neue Fotos im Mosaik erscheinen.
        </p>
      </div>

      {/* Animation Tiles */}
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
                {/* Preview area */}
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

                {/* Label + Checkbox */}
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

        {/* Hint */}
        <p className="text-xs text-gray-400 mt-2">
          {selectedCount === 1
            ? `Alle Tiles erscheinen mit "${ANIMATIONS.find((a) => a.value === state.selectedAnimations[0])?.label}".`
            : selectedCount === ANIMATIONS.length
              ? 'Jedes Tile bekommt eine zufällige Animation — maximale Abwechslung!'
              : `${selectedCount} ausgewählt — Tiles erscheinen abwechselnd mit den gewählten Animationen.`}
        </p>
      </div>

      {/* Foto-Quellen */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">Foto-Quellen</label>
        <div className="space-y-2">
          {/* QR — always available */}
          <label className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="h-4 w-4 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">QR-Code (Smartphone)</span>
              <p className="text-xs text-gray-400">Gäste scannen und laden Fotos hoch</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">Inkl.</span>
          </label>

          {/* Hashtag — always free with #gästefotos */}
          <label className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              checked={state.showQrOverlay}
              onChange={(e) => onChange({ showQrOverlay: e.target.checked })}
              className="h-4 w-4 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Hashtag-Import</span>
              </div>
              <p className="text-xs text-gray-400">#gästefotos — automatisch aus Social Media</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">Free</span>
          </label>

          {/* Admin Upload — always available */}
          <label className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="h-4 w-4 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Admin-Upload</span>
              <p className="text-xs text-gray-400">Du lädst Fotos manuell hoch</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">Inkl.</span>
          </label>

          {/* Photo Booth */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${hasBoothAddon ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
            <input
              type="checkbox"
              checked={hasBoothAddon}
              disabled
              className="h-4 w-4 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Photo Booth</span>
              <p className="text-xs text-gray-400">Fotos direkt von der Fotobox</p>
            </div>
            {hasBoothAddon ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">Gebucht</span>
            ) : (
              <button type="button" onClick={onUpgrade} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0 hover:bg-amber-200 transition-colors">
                <Crown className="w-2.5 h-2.5" /> Addon
              </button>
            )}
          </div>

          {/* KI Booth */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${hasKiBoothAddon ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
            <input
              type="checkbox"
              checked={hasKiBoothAddon}
              disabled
              className="h-4 w-4 rounded"
              style={{ accentColor: '#9333ea' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">KI-Booth</span>
              <p className="text-xs text-gray-400">AI Style-Transfer Fotos</p>
            </div>
            {hasKiBoothAddon ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">Gebucht</span>
            ) : (
              <button type="button" onClick={onUpgrade} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0 hover:bg-amber-200 transition-colors">
                <Crown className="w-2.5 h-2.5" /> Addon
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Display Options */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">Anzeige-Optionen</label>
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
              <p className="text-xs text-gray-400">
                Ab {state.autoFillThreshold}% automatisch füllen
              </p>
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
      </div>
    </div>
  );
}
