export type DesignPresetKey =
  | 'classic'
  | 'emerald_sand'
  | 'sunset'
  | 'berry'
  | 'ocean'
  | 'lavender'
  | 'mono';

export type DesignPreset = {
  key: DesignPresetKey;
  label: string;
  heroGradient: string;
  accentGradient: string;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    key: 'classic',
    label: 'Classic',
    heroGradient: 'linear-gradient(135deg, #8B1538 0%, #E11D48 100%)',
    accentGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
  },
  {
    key: 'emerald_sand',
    label: 'Emerald & Sand',
    heroGradient: 'linear-gradient(135deg, var(--brand-green) 0%, var(--app-accent) 100%)',
    accentGradient: 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)',
  },
  {
    key: 'sunset',
    label: 'Sunset',
    heroGradient: 'linear-gradient(135deg, #FB7185 0%, #F97316 55%, #F59E0B 100%)',
    accentGradient: 'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
  },
  {
    key: 'berry',
    label: 'Berry',
    heroGradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F43F5E 100%)',
    accentGradient: 'linear-gradient(135deg, #7C3AED 0%, #F43F5E 100%)',
  },
  {
    key: 'ocean',
    label: 'Ocean',
    heroGradient: 'linear-gradient(135deg, #0EA5E9 0%, #22C55E 100%)',
    accentGradient: 'linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%)',
  },
  {
    key: 'lavender',
    label: 'Lavender',
    heroGradient: 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
    accentGradient: 'linear-gradient(135deg, #A78BFA 0%, #60A5FA 100%)',
  },
  {
    key: 'mono',
    label: 'Mono',
    heroGradient: 'linear-gradient(135deg, var(--app-fg) 0%, var(--app-muted) 100%)',
    accentGradient: 'linear-gradient(135deg, var(--app-fg) 0%, var(--app-muted) 100%)',
  },
];

export function getDesignPreset(key?: string | null): DesignPreset | null {
  if (!key) return null;
  const found = DESIGN_PRESETS.find((p) => p.key === key);
  return found || null;
}
