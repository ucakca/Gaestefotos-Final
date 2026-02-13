/**
 * Centralized chart color constants.
 * Recharts renders SVG and requires concrete hex/rgb values —
 * CSS custom properties in HSL format are not supported in SVG attributes.
 */

export const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  grid: '#e5e7eb',
  axis: '#6b7280',
  axisLight: '#94a3b8',
} as const;

export const CHART_PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
] as const;
