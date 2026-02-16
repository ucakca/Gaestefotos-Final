'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useEventTheme } from './EventThemeProvider';

/**
 * Ambient floating particle overlay for the Live Wall.
 * Renders soft glowing orbs using the event theme colors.
 * Only renders when a theme is active.
 */
export function WallThemeOverlay() {
  const { colors, animations, isThemed } = useEventTheme();

  const particles = useMemo(() => {
    if (!isThemed) return [];
    const ambient = animations.ambient;
    const count = ambient ? 18 : 12;
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
  }, [isThemed, colors, animations]);

  if (!isThemed || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
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
    </div>
  );
}
