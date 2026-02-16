'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ThemeColors, ThemeFonts } from '@/types/theme';

interface ThemePreviewCardProps {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  wallLayout?: string;
  tasteScore?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ThemePreviewCard({
  name,
  colors,
  fonts,
  wallLayout = 'masonry',
  tasteScore,
  selected = false,
  onClick,
  className = '',
}: ThemePreviewCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-xl overflow-hidden border-2 text-left transition-all ${
        selected ? 'ring-2 ring-offset-2 ring-blue-500 border-blue-500' : 'border-transparent hover:border-gray-300'
      } ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Color Preview Area */}
      <div
        className="p-4 pb-3"
        style={{ backgroundColor: colors.background }}
      >
        {/* Header simulation */}
        <div
          className="text-sm font-semibold mb-2 truncate"
          style={{ fontFamily: `"${fonts.heading}", serif`, color: colors.text }}
        >
          {name}
        </div>

        {/* Photo grid simulation */}
        <div className={`gap-1.5 ${wallLayout === 'grid' ? 'grid grid-cols-3' : 'flex flex-wrap'}`}>
          {[colors.primary, colors.secondary, colors.accent, colors.surface, colors.primary, colors.secondary].map((c, i) => (
            <div
              key={i}
              className="rounded-md"
              style={{
                backgroundColor: c,
                width: wallLayout === 'grid' ? '100%' : i % 3 === 0 ? '45%' : '25%',
                height: wallLayout === 'grid' ? 24 : i % 2 === 0 ? 28 : 20,
                opacity: 0.85 + (i * 0.03),
              }}
            />
          ))}
        </div>

        {/* Accent bar */}
        <div
          className="mt-2 h-1 rounded-full w-2/3"
          style={{ backgroundColor: colors.accent }}
        />
      </div>

      {/* Footer with font/color info */}
      <div
        className="px-4 py-2 text-xs flex items-center justify-between"
        style={{ backgroundColor: colors.surface, color: colors.textMuted }}
      >
        <span style={{ fontFamily: `"${fonts.body}", sans-serif` }}>
          {fonts.heading}
        </span>
        {tasteScore !== undefined && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
            {tasteScore}
          </span>
        )}
      </div>

      {/* Color swatches */}
      <div className="flex h-1.5">
        {[colors.primary, colors.secondary, colors.accent].map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
          ✓
        </div>
      )}
    </motion.button>
  );
}
