'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import type { EventTheme, ThemeColors, ThemeAnimations, ThemeFonts } from '@/types/theme';

// ─── Context ─────────────────────────────────────────────────

interface EventThemeContextValue {
  theme: EventTheme | null;
  colors: ThemeColors;
  animations: ThemeAnimations;
  fonts: ThemeFonts;
  wallLayout: string;
  isThemed: boolean;
}

const DEFAULT_COLORS: ThemeColors = {
  primary: '#374151',
  secondary: '#9CA3AF',
  accent: '#6366F1',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
};

const DEFAULT_ANIMATIONS: ThemeAnimations = {
  entrance: { type: 'fadeIn', duration: 300, easing: 'easeOut' },
  hover: { type: 'lift', duration: 200, easing: 'easeInOut' },
  ambient: null,
};

const DEFAULT_FONTS: ThemeFonts = {
  heading: 'Inter',
  body: 'Inter',
  accent: 'Inter',
};

const EventThemeContext = createContext<EventThemeContextValue>({
  theme: null,
  colors: DEFAULT_COLORS,
  animations: DEFAULT_ANIMATIONS,
  fonts: DEFAULT_FONTS,
  wallLayout: 'masonry',
  isThemed: false,
});

// ─── Provider ────────────────────────────────────────────────

interface EventThemeProviderProps {
  theme: EventTheme | null;
  customOverrides?: Partial<EventTheme> | null;
  children: React.ReactNode;
}

export function EventThemeProvider({ theme, customOverrides, children }: EventThemeProviderProps) {
  const mergedColors = useMemo<ThemeColors>(() => {
    const base = theme?.colors || DEFAULT_COLORS;
    const overrides = (customOverrides?.colors || {}) as Partial<ThemeColors>;
    return { ...base, ...overrides };
  }, [theme, customOverrides]);

  const mergedAnimations = useMemo<ThemeAnimations>(() => {
    const base = theme?.animations || DEFAULT_ANIMATIONS;
    const overrides = customOverrides?.animations;
    if (!overrides) return base;
    return {
      entrance: overrides.entrance || base.entrance,
      hover: overrides.hover || base.hover,
      ambient: overrides.ambient !== undefined ? overrides.ambient : base.ambient,
    };
  }, [theme, customOverrides]);

  const mergedFonts = useMemo<ThemeFonts>(() => {
    const base = theme?.fonts || DEFAULT_FONTS;
    const overrides = (customOverrides?.fonts || {}) as Partial<ThemeFonts>;
    return { ...base, ...overrides };
  }, [theme, customOverrides]);

  const wallLayout = customOverrides?.wallLayout || theme?.wallLayout || 'masonry';

  // Inject CSS custom properties for theme colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', mergedColors.primary);
    root.style.setProperty('--theme-secondary', mergedColors.secondary);
    root.style.setProperty('--theme-accent', mergedColors.accent);
    root.style.setProperty('--theme-background', mergedColors.background);
    root.style.setProperty('--theme-surface', mergedColors.surface);
    root.style.setProperty('--theme-text', mergedColors.text);
    root.style.setProperty('--theme-text-muted', mergedColors.textMuted);

    return () => {
      root.style.removeProperty('--theme-primary');
      root.style.removeProperty('--theme-secondary');
      root.style.removeProperty('--theme-accent');
      root.style.removeProperty('--theme-background');
      root.style.removeProperty('--theme-surface');
      root.style.removeProperty('--theme-text');
      root.style.removeProperty('--theme-text-muted');
    };
  }, [mergedColors]);

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontFamilies = new Set([mergedFonts.heading, mergedFonts.body, mergedFonts.accent]);
    // Skip loading default system font
    fontFamilies.delete('Inter');

    if (fontFamilies.size === 0) return;

    const families = Array.from(fontFamilies)
      .map((f) => f.replace(/\s+/g, '+') + ':wght@400;500;600;700')
      .join('&family=');

    const linkId = 'event-theme-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

    return () => {
      link?.remove();
    };
  }, [mergedFonts]);

  const value = useMemo<EventThemeContextValue>(
    () => ({
      theme,
      colors: mergedColors,
      animations: mergedAnimations,
      fonts: mergedFonts,
      wallLayout,
      isThemed: !!theme,
    }),
    [theme, mergedColors, mergedAnimations, mergedFonts, wallLayout]
  );

  return (
    <EventThemeContext.Provider value={value}>
      <div
        style={{
          fontFamily: `"${mergedFonts.body}", sans-serif`,
          color: mergedColors.text,
          backgroundColor: mergedColors.background,
        }}
      >
        {children}
      </div>
    </EventThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useEventTheme() {
  return useContext(EventThemeContext);
}
