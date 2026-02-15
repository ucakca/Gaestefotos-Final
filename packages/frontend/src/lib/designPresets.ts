export type DesignPresetKey =
  | 'classic'
  | 'emerald_sand'
  | 'sunset'
  | 'berry'
  | 'ocean'
  | 'lavender'
  | 'mono'
  | 'rose_gold'
  | 'midnight'
  | 'forest'
  | 'champagne';

export type DesignPreset = {
  key: DesignPresetKey;
  label: string;
  heroGradient: string;
  accentGradient: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  category?: 'wedding' | 'party' | 'business' | 'general';
  emoji?: string;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  // Wedding Presets
  {
    key: 'classic',
    label: 'Classic Rose',
    heroGradient: 'linear-gradient(135deg, #8B1538 0%, #E11D48 100%)',
    accentGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
    colors: { primary: '#8B1538', secondary: '#FFFFFF', accent: '#EC4899' },
    category: 'wedding',
    emoji: '💒',
  },
  {
    key: 'rose_gold',
    label: 'Rose Gold',
    heroGradient: 'linear-gradient(135deg, #B76E79 0%, #E8C4C4 100%)',
    accentGradient: 'linear-gradient(135deg, #D4A574 0%, #B76E79 100%)',
    colors: { primary: '#B76E79', secondary: '#FDF8F6', accent: '#D4A574' },
    category: 'wedding',
    emoji: '💍',
  },
  {
    key: 'champagne',
    label: 'Champagne',
    heroGradient: 'linear-gradient(135deg, #C9A961 0%, #E8D5A3 100%)',
    accentGradient: 'linear-gradient(135deg, #C9A961 0%, #8B7355 100%)',
    colors: { primary: '#C9A961', secondary: '#FFFEF5', accent: '#8B7355' },
    category: 'wedding',
    emoji: '🥂',
  },
  {
    key: 'lavender',
    label: 'Lavender Dream',
    heroGradient: 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
    accentGradient: 'linear-gradient(135deg, #A78BFA 0%, #60A5FA 100%)',
    colors: { primary: '#A78BFA', secondary: '#FAF5FF', accent: '#F472B6' },
    category: 'wedding',
    emoji: '💜',
  },
  // Party Presets
  {
    key: 'sunset',
    label: 'Sunset Party',
    heroGradient: 'linear-gradient(135deg, #FB7185 0%, #F97316 55%, #F59E0B 100%)',
    accentGradient: 'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
    colors: { primary: '#F97316', secondary: '#FFF7ED', accent: '#FB7185' },
    category: 'party',
    emoji: '🌅',
  },
  {
    key: 'berry',
    label: 'Berry Blast',
    heroGradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F43F5E 100%)',
    accentGradient: 'linear-gradient(135deg, #7C3AED 0%, #F43F5E 100%)',
    colors: { primary: '#7C3AED', secondary: '#FAF5FF', accent: '#EC4899' },
    category: 'party',
    emoji: '🎉',
  },
  {
    key: 'midnight',
    label: 'Midnight Glow',
    heroGradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
    accentGradient: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    colors: { primary: '#1E1B4B', secondary: '#EEF2FF', accent: '#6366F1' },
    category: 'party',
    emoji: '🌙',
  },
  // Business Presets
  {
    key: 'mono',
    label: 'Professional',
    heroGradient: 'linear-gradient(135deg, var(--foreground) 0%, var(--muted-foreground) 100%)',
    accentGradient: 'linear-gradient(135deg, var(--foreground) 0%, var(--muted-foreground) 100%)',
    colors: { primary: '#1F2937', secondary: '#F9FAFB', accent: '#6B7280' },
    category: 'business',
    emoji: '💼',
  },
  {
    key: 'ocean',
    label: 'Ocean Blue',
    heroGradient: 'linear-gradient(135deg, #0EA5E9 0%, #22C55E 100%)',
    accentGradient: 'linear-gradient(135deg, #0EA5E9 0%, #A855F7 100%)',
    colors: { primary: '#0EA5E9', secondary: '#F0F9FF', accent: '#22C55E' },
    category: 'business',
    emoji: '🌊',
  },
  // General Presets
  {
    key: 'emerald_sand',
    label: 'Emerald & Sand',
    heroGradient: 'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)',
    accentGradient: 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)',
    colors: { primary: '#10B981', secondary: '#F5F5F5', accent: '#F59E0B' },
    category: 'general',
    emoji: '🌿',
  },
  {
    key: 'forest',
    label: 'Forest',
    heroGradient: 'linear-gradient(135deg, #166534 0%, #15803D 50%, #22C55E 100%)',
    accentGradient: 'linear-gradient(135deg, #166534 0%, #84CC16 100%)',
    colors: { primary: '#166534', secondary: '#F0FDF4', accent: '#22C55E' },
    category: 'general',
    emoji: '🌲',
  },
];

export function getDesignPreset(key?: string | null): DesignPreset | null {
  if (!key) return null;
  const found = DESIGN_PRESETS.find((p) => p.key === key);
  return found || null;
}

export function getPresetsForEventType(eventType?: string | null): DesignPreset[] {
  const categoryMap: Record<string, 'wedding' | 'party' | 'business' | 'general'> = {
    wedding: 'wedding',
    family: 'general',
    milestone: 'general',
    business: 'business',
    party: 'party',
    custom: 'general',
  };
  
  const targetCategory = eventType ? categoryMap[eventType] || 'general' : null;
  
  if (!targetCategory) return DESIGN_PRESETS;
  
  // Return presets sorted: matching category first, then others
  return [
    ...DESIGN_PRESETS.filter(p => p.category === targetCategory),
    ...DESIGN_PRESETS.filter(p => p.category !== targetCategory),
  ];
}
