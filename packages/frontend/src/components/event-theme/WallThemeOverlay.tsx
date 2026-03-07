'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useEventTheme } from './EventThemeProvider';

export type OverlayType = 'particles' | 'confetti' | 'hearts' | 'snowflakes' | 'stars' | 'bubbles' | 'none';

interface WallThemeOverlayProps {
  /** Override which overlay to show. If omitted, infers from theme. */
  overlayType?: OverlayType;
  /** Intensity 0-1, controls particle count. Default 0.5 */
  intensity?: number;
}

// ─── Emoji / symbol sets per overlay type ──────────────────
const OVERLAY_SYMBOLS: Record<string, string[]> = {
  confetti: ['🎉', '🎊', '✨', '🎀', '💫', '⭐', '🎈'],
  hearts: ['❤️', '💕', '💗', '💖', '💘', '🤍', '💜'],
  snowflakes: ['❄️', '❅', '❆', '✧', '✦'],
  stars: ['⭐', '✨', '💫', '🌟', '✦', '✧'],
  bubbles: ['◯', '○', '◌', '◎', '●'],
};

/**
 * Ambient themed overlay for the Live Wall.
 * Supports multiple overlay types: particles (default), confetti, hearts,
 * snowflakes, stars, bubbles.
 */
export function WallThemeOverlay({ overlayType, intensity = 0.5 }: WallThemeOverlayProps) {
  const { colors, animations, isThemed } = useEventTheme();

  const effectiveType: OverlayType = overlayType || (isThemed ? 'particles' : 'none');
  const count = Math.round(8 + intensity * 24);

  // ─── Classic ambient particles (glowing orbs) ────────────
  const particles = useMemo(() => {
    if (effectiveType !== 'particles') return [];
    const palette = [colors.primary, colors.secondary, colors.accent];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: palette[i % palette.length],
      size: 6 + Math.random() * 18,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 12 + Math.random() * 20,
      delay: Math.random() * 8,
      opacity: 0.12 + Math.random() * 0.18,
    }));
  }, [effectiveType, colors, count]);

  // ─── Emoji / symbol overlays ─────────────────────────────
  const symbolItems = useMemo(() => {
    if (effectiveType === 'particles' || effectiveType === 'none') return [];
    const symbols = OVERLAY_SYMBOLS[effectiveType] || OVERLAY_SYMBOLS.confetti;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      x: Math.random() * 100,
      size: effectiveType === 'bubbles' ? 18 + Math.random() * 30 : 14 + Math.random() * 22,
      duration: effectiveType === 'snowflakes' ? 8 + Math.random() * 12 : 5 + Math.random() * 8,
      delay: Math.random() * 6,
      rotateEnd: effectiveType === 'confetti' ? -180 + Math.random() * 360 : Math.random() * 40 - 20,
      wobbleX: effectiveType === 'snowflakes' ? 40 + Math.random() * 60 : 20 + Math.random() * 30,
    }));
  }, [effectiveType, count]);

  if (effectiveType === 'none') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {/* Classic ambient particles */}
      {effectiveType === 'particles' && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            opacity: p.opacity,
            filter: `blur(${p.size * 0.6}px)`,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 8, 0],
            scale: [1, 1.3, 0.9, 1.1, 1],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.7, p.opacity * 1.2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Falling symbol overlays (confetti, hearts, snowflakes, stars, bubbles) */}
      {effectiveType !== 'particles' && symbolItems.map((item) => (
        <motion.div
          key={item.id}
          className="absolute select-none"
          style={{
            left: `${item.x}%`,
            top: -30,
            fontSize: item.size,
            lineHeight: 1,
            ...(effectiveType === 'bubbles' ? {
              opacity: 0.15,
              color: colors.accent,
            } : {}),
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, item.wobbleX, -item.wobbleX * 0.6, item.wobbleX * 0.3, 0],
            rotate: [0, item.rotateEnd],
            opacity: effectiveType === 'bubbles'
              ? [0, 0.25, 0.2, 0.15, 0]
              : [0, 1, 1, 0.8, 0],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {item.symbol}
        </motion.div>
      ))}
    </div>
  );
}
