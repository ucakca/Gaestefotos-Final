/**
 * Conditional Motion Wrapper
 * 
 * Framer-Motion wird nur im Browser geladen, nicht bei SSR.
 * Reduziert Bundle-Size für SSR-Routen.
 * 
 * Usage:
 * import { motion, AnimatePresence } from '@/utils/motion';
 * 
 * Note: Aktuell als Platzhalter - vollständige Conditional Loading
 * Implementierung würde komplexes Client-only Loading erfordern.
 * Für jetzt: Direkter Re-Export von framer-motion.
 */

'use client';

// Direct re-export for now - full conditional loading would require
// more complex architecture changes across all components
export { motion, AnimatePresence } from 'framer-motion';

/**
 * Hook to check if reduced motion is preferred
 */
export const usePrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
