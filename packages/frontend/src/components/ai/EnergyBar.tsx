'use client';

import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';

interface EnergyBarProps {
  balance: number;
  maxEstimate?: number;
  cooldownActive?: boolean;
  cooldownEndsAt?: string | null;
  enabled?: boolean;
  compact?: boolean;
}

export function EnergyBar({
  balance,
  maxEstimate = 30,
  cooldownActive = false,
  cooldownEndsAt,
  enabled = true,
  compact = false,
}: EnergyBarProps) {
  if (!enabled) return null;

  const percent = Math.min(100, Math.max(0, (balance / maxEstimate) * 100));

  // Color based on energy level
  const getBarColor = () => {
    if (cooldownActive) return 'from-gray-400 to-gray-500';
    if (percent > 60) return 'from-emerald-400 to-green-500';
    if (percent > 30) return 'from-amber-400 to-yellow-500';
    return 'from-red-400 to-orange-500';
  };

  const getTextColor = () => {
    if (cooldownActive) return 'text-gray-400';
    if (percent > 60) return 'text-emerald-400';
    if (percent > 30) return 'text-amber-400';
    return 'text-red-400';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Zap className={`w-3.5 h-3.5 ${getTextColor()}`} />
        <span className={`text-xs font-medium ${getTextColor()}`}>
          {balance}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-4 h-4 ${getTextColor()}`} />
          <span className="text-xs font-medium text-white/80">AI-Energie</span>
        </div>
        <span className={`text-xs font-bold ${getTextColor()}`}>
          {cooldownActive ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Cooldown
            </span>
          ) : (
            `${balance} ⚡`
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${getBarColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Hint */}
      {balance <= 5 && !cooldownActive && (
        <p className="text-[10px] text-white/50">
          Nimm am Event teil um AI-Energie aufzuladen!
        </p>
      )}
    </div>
  );
}

/**
 * Inline energy cost badge shown next to AI feature buttons.
 */
export function EnergyCostBadge({ cost, balance, enabled = true }: {
  cost: number;
  balance: number;
  enabled?: boolean;
}) {
  if (!enabled || cost <= 0) return null;

  const canAfford = balance >= cost;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
      canAfford
        ? 'bg-white/10 text-white/60'
        : 'bg-red-500/20 text-red-300'
    }`}>
      <Zap className="w-2.5 h-2.5" />
      {cost}
    </span>
  );
}

/**
 * Insufficient energy overlay shown when a guest tries to use a feature they can't afford.
 */
export function InsufficientEnergyOverlay({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
    >
      <div className="text-center px-6 py-8 max-w-xs">
        <div className="text-4xl mb-3">⚡</div>
        <h3 className="text-lg font-bold text-white mb-2">Nicht genug Energie</h3>
        <p className="text-sm text-white/70 mb-4">{message}</p>
        <div className="space-y-2 text-xs text-white/50 mb-4">
          <p>So bekommst du mehr Energie:</p>
          <div className="flex flex-col gap-1">
            <span>📸 Lade ein Foto hoch</span>
            <span>📖 Schreibe ins Gästebuch</span>
            <span>🎯 Schließe eine Challenge ab</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
        >
          Verstanden
        </button>
      </div>
    </motion.div>
  );
}
