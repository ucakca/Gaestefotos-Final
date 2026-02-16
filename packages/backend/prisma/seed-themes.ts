import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default Event Themes — Seed Data
 * 
 * 3 Themes pro Event-Type, designed mit Anti-Kitsch-Regeln:
 * - Max 3 Hauptfarben
 * - Max 3 gleichzeitige Animationen
 * - Keine Neon-Farben
 * - Ein Statement-Element pro Theme
 */

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

interface ThemeAnimation {
  type: string;
  duration: number;
  easing: string;
  delay?: number;
}

interface ThemeAnimations {
  entrance: ThemeAnimation;
  hover: ThemeAnimation;
  ambient: ThemeAnimation | null;
}

interface ThemeFonts {
  heading: string;
  body: string;
  accent: string;
}

interface ThemeSeed {
  slug: string;
  name: string;
  eventType: string;
  season: string | null;
  locationStyle: string | null;
  colors: ThemeColors;
  animations: ThemeAnimations;
  fonts: ThemeFonts;
  wallLayout: string;
  description: string;
  tags: string[];
  isPremium: boolean;
}

const themes: ThemeSeed[] = [
  // ── WEDDING ──────────────────────────────────────────
  {
    slug: 'wedding-elegant-ivory',
    name: 'Elegant Ivory',
    eventType: 'wedding',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#8B7355',
      secondary: '#D4C5B2',
      accent: '#C9A96E',
      background: '#FDFBF7',
      surface: '#FFFFFF',
      text: '#2C2419',
      textMuted: '#8B8178',
    },
    animations: {
      entrance: { type: 'fadeUp', duration: 600, easing: 'easeOut' },
      hover: { type: 'lift', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Playfair Display', body: 'Lato', accent: 'Cormorant Garamond' },
    wallLayout: 'masonry',
    description: 'Zeitlose Eleganz mit warmen Ivory- und Goldtönen. Perfekt für klassische Hochzeiten.',
    tags: ['elegant', 'klassisch', 'gold', 'ivory', 'zeitlos'],
    isPremium: false,
  },
  {
    slug: 'wedding-romantic-blush',
    name: 'Romantic Blush',
    eventType: 'wedding',
    season: 'spring',
    locationStyle: null,
    colors: {
      primary: '#C48B9F',
      secondary: '#E8D5DC',
      accent: '#9B6B7A',
      background: '#FFF8FA',
      surface: '#FFFFFF',
      text: '#3D2B33',
      textMuted: '#9E8A91',
    },
    animations: {
      entrance: { type: 'fadeScale', duration: 500, easing: 'easeOut' },
      hover: { type: 'glow', duration: 300, easing: 'easeInOut' },
      ambient: { type: 'floatingPetals', duration: 8000, easing: 'linear' },
    },
    fonts: { heading: 'Cormorant Garamond', body: 'Nunito Sans', accent: 'Dancing Script' },
    wallLayout: 'masonry',
    description: 'Sanfte Rosatöne mit schwebendem Blütenblatt-Effekt. Romantisch und modern.',
    tags: ['romantisch', 'rosa', 'blush', 'frühling', 'blüten'],
    isPremium: false,
  },
  {
    slug: 'wedding-modern-minimal',
    name: 'Modern Minimal',
    eventType: 'wedding',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#1A1A1A',
      secondary: '#F5F5F0',
      accent: '#D4AF37',
      background: '#FFFFFF',
      surface: '#FAFAFA',
      text: '#1A1A1A',
      textMuted: '#6B6B6B',
    },
    animations: {
      entrance: { type: 'slideUp', duration: 400, easing: 'easeOut' },
      hover: { type: 'underline', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Inter', body: 'Inter', accent: 'Space Grotesk' },
    wallLayout: 'grid',
    description: 'Klare Linien, viel Weißraum, ein goldener Akzent. Für moderne Paare.',
    tags: ['modern', 'minimal', 'schwarz-weiß', 'gold'],
    isPremium: false,
  },

  // ── PARTY / BIRTHDAY ────────────────────────────────
  {
    slug: 'party-vibrant-sunset',
    name: 'Vibrant Sunset',
    eventType: 'party',
    season: 'summer',
    locationStyle: null,
    colors: {
      primary: '#FF6B35',
      secondary: '#FFD166',
      accent: '#EF476F',
      background: '#FFF9F0',
      surface: '#FFFFFF',
      text: '#2D1B0E',
      textMuted: '#8B7355',
    },
    animations: {
      entrance: { type: 'bounceIn', duration: 500, easing: 'spring' },
      hover: { type: 'scale', duration: 150, easing: 'easeOut' },
      ambient: { type: 'colorShift', duration: 10000, easing: 'linear' },
    },
    fonts: { heading: 'Poppins', body: 'Poppins', accent: 'Righteous' },
    wallLayout: 'masonry',
    description: 'Warme, lebhafte Farben inspiriert von Sonnenuntergängen. Party-Stimmung pur.',
    tags: ['party', 'lebhaft', 'sommer', 'warm', 'sonnenuntergang'],
    isPremium: false,
  },
  {
    slug: 'party-neon-night',
    name: 'Neon Night',
    eventType: 'party',
    season: null,
    locationStyle: 'indoor',
    colors: {
      primary: '#7B2FF7',
      secondary: '#1A1A2E',
      accent: '#00D4FF',
      background: '#0F0F1A',
      surface: '#1A1A2E',
      text: '#E8E8F0',
      textMuted: '#8888AA',
    },
    animations: {
      entrance: { type: 'fadeUp', duration: 400, easing: 'easeOut' },
      hover: { type: 'neonGlow', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter', accent: 'Orbitron' },
    wallLayout: 'grid',
    description: 'Dunkles Design mit leuchtenden Akzenten. Ideal für Club-Events und Nachtpartys.',
    tags: ['nacht', 'club', 'dunkel', 'neon', 'party'],
    isPremium: true,
  },
  {
    slug: 'party-confetti-pop',
    name: 'Confetti Pop',
    eventType: 'party',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#FF4081',
      secondary: '#FFD740',
      accent: '#536DFE',
      background: '#FFFFFF',
      surface: '#FFF8E1',
      text: '#212121',
      textMuted: '#757575',
    },
    animations: {
      entrance: { type: 'popIn', duration: 400, easing: 'spring' },
      hover: { type: 'wiggle', duration: 300, easing: 'easeInOut' },
      ambient: { type: 'confetti', duration: 5000, easing: 'linear' },
    },
    fonts: { heading: 'Fredoka One', body: 'Nunito', accent: 'Baloo 2' },
    wallLayout: 'masonry',
    description: 'Bunt, fröhlich und voller Energie. Perfekt für Geburtstage und Feiern.',
    tags: ['bunt', 'fröhlich', 'konfetti', 'geburtstag', 'feier'],
    isPremium: false,
  },

  // ── BUSINESS / CORPORATE ─────────────────────────────
  {
    slug: 'business-professional-slate',
    name: 'Professional Slate',
    eventType: 'business',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#1E293B',
      secondary: '#475569',
      accent: '#3B82F6',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    animations: {
      entrance: { type: 'fadeIn', duration: 300, easing: 'easeOut' },
      hover: { type: 'lift', duration: 150, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Inter', body: 'Inter', accent: 'Inter' },
    wallLayout: 'grid',
    description: 'Seriös und professionell. Klare Typografie, dezente Animationen.',
    tags: ['business', 'professionell', 'seriös', 'blau', 'corporate'],
    isPremium: false,
  },
  {
    slug: 'business-tech-gradient',
    name: 'Tech Gradient',
    eventType: 'business',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#6366F1',
      secondary: '#818CF8',
      accent: '#06B6D4',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
    },
    animations: {
      entrance: { type: 'slideUp', duration: 400, easing: 'easeOut' },
      hover: { type: 'gradientShift', duration: 300, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter', accent: 'JetBrains Mono' },
    wallLayout: 'grid',
    description: 'Modernes Dark-Theme mit Gradient-Akzenten. Ideal für Tech-Konferenzen.',
    tags: ['tech', 'konferenz', 'gradient', 'dunkel', 'modern'],
    isPremium: true,
  },
  {
    slug: 'business-clean-white',
    name: 'Clean White',
    eventType: 'business',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#111827',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textMuted: '#6B7280',
    },
    animations: {
      entrance: { type: 'fadeIn', duration: 250, easing: 'easeOut' },
      hover: { type: 'borderHighlight', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', accent: 'Inter' },
    wallLayout: 'grid',
    description: 'Minimalistisch und aufgeräumt. Maximal professionell mit grünem Akzent.',
    tags: ['minimal', 'weiß', 'clean', 'professionell', 'grün'],
    isPremium: false,
  },

  // ── FAMILY ───────────────────────────────────────────
  {
    slug: 'family-warm-earth',
    name: 'Warm Earth',
    eventType: 'family',
    season: 'autumn',
    locationStyle: null,
    colors: {
      primary: '#92400E',
      secondary: '#D97706',
      accent: '#B45309',
      background: '#FFFBEB',
      surface: '#FFFFFF',
      text: '#451A03',
      textMuted: '#92400E',
    },
    animations: {
      entrance: { type: 'fadeUp', duration: 500, easing: 'easeOut' },
      hover: { type: 'warmGlow', duration: 300, easing: 'easeInOut' },
      ambient: { type: 'fallingLeaves', duration: 12000, easing: 'linear' },
    },
    fonts: { heading: 'Merriweather', body: 'Source Sans 3', accent: 'Caveat' },
    wallLayout: 'masonry',
    description: 'Warme Erdtöne mit fallendem Laub. Gemütlich und einladend.',
    tags: ['familie', 'warm', 'herbst', 'erdtöne', 'gemütlich'],
    isPremium: false,
  },
  {
    slug: 'family-garden-fresh',
    name: 'Garden Fresh',
    eventType: 'family',
    season: 'spring',
    locationStyle: 'outdoor',
    colors: {
      primary: '#166534',
      secondary: '#86EFAC',
      accent: '#F59E0B',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#14532D',
      textMuted: '#6B7280',
    },
    animations: {
      entrance: { type: 'growIn', duration: 500, easing: 'spring' },
      hover: { type: 'lift', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Nunito', body: 'Nunito Sans', accent: 'Pacifico' },
    wallLayout: 'masonry',
    description: 'Frische Grüntöne für Garten- und Outdoor-Events. Natürlich und lebendig.',
    tags: ['garten', 'outdoor', 'grün', 'frühling', 'natur'],
    isPremium: false,
  },
  {
    slug: 'family-soft-pastel',
    name: 'Soft Pastel',
    eventType: 'family',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#7C3AED',
      secondary: '#A78BFA',
      accent: '#F9A8D4',
      background: '#FAF5FF',
      surface: '#FFFFFF',
      text: '#3B0764',
      textMuted: '#7C3AED',
    },
    animations: {
      entrance: { type: 'fadeScale', duration: 400, easing: 'easeOut' },
      hover: { type: 'softBounce', duration: 200, easing: 'spring' },
      ambient: null,
    },
    fonts: { heading: 'Quicksand', body: 'Quicksand', accent: 'Comfortaa' },
    wallLayout: 'masonry',
    description: 'Sanfte Pastelltöne für Taufen, Babyshower und Kinderfeste.',
    tags: ['pastell', 'sanft', 'taufe', 'babyshower', 'kinder'],
    isPremium: false,
  },

  // ── MILESTONE (Graduation, Anniversary, etc.) ────────
  {
    slug: 'milestone-achievement-gold',
    name: 'Achievement Gold',
    eventType: 'milestone',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#D4AF37',
      background: '#FAFAF5',
      surface: '#FFFFFF',
      text: '#111827',
      textMuted: '#6B7280',
    },
    animations: {
      entrance: { type: 'slideUp', duration: 500, easing: 'easeOut' },
      hover: { type: 'shimmer', duration: 400, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Playfair Display', body: 'Source Sans 3', accent: 'Cormorant Garamond' },
    wallLayout: 'masonry',
    description: 'Würdevoll und feierlich mit Goldakzent. Für Jubiläen und Abschlussfeiern.',
    tags: ['jubiläum', 'abschluss', 'gold', 'feierlich', 'elegant'],
    isPremium: false,
  },
  {
    slug: 'milestone-celebration-sparkle',
    name: 'Celebration Sparkle',
    eventType: 'milestone',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#7C2D12',
      secondary: '#FDBA74',
      accent: '#EA580C',
      background: '#FFF7ED',
      surface: '#FFFFFF',
      text: '#431407',
      textMuted: '#9A3412',
    },
    animations: {
      entrance: { type: 'fadeUp', duration: 450, easing: 'easeOut' },
      hover: { type: 'sparkle', duration: 300, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans', accent: 'Satisfy' },
    wallLayout: 'masonry',
    description: 'Warme Orange-Töne mit Funkeln-Effekt. Feierlich aber nicht übertrieben.',
    tags: ['feier', 'warm', 'orange', 'funkeln', 'meilenstein'],
    isPremium: false,
  },

  // ── CUSTOM (Generic fallback) ────────────────────────
  {
    slug: 'custom-neutral-canvas',
    name: 'Neutral Canvas',
    eventType: 'custom',
    season: null,
    locationStyle: null,
    colors: {
      primary: '#374151',
      secondary: '#9CA3AF',
      accent: '#6366F1',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textMuted: '#6B7280',
    },
    animations: {
      entrance: { type: 'fadeIn', duration: 300, easing: 'easeOut' },
      hover: { type: 'lift', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Inter', body: 'Inter', accent: 'Inter' },
    wallLayout: 'masonry',
    description: 'Neutrales Basis-Theme, passt zu allem. Guter Ausgangspunkt für Anpassungen.',
    tags: ['neutral', 'basis', 'vielseitig', 'standard'],
    isPremium: false,
  },
];

async function seedThemes() {
  console.log('🎨 Seeding Event Themes...');

  let created = 0;
  let skipped = 0;

  for (const theme of themes) {
    const existing = await prisma.eventTheme.findUnique({ where: { slug: theme.slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.eventTheme.create({
      data: {
        slug: theme.slug,
        name: theme.name,
        eventType: theme.eventType,
        season: theme.season,
        locationStyle: theme.locationStyle,
        colors: theme.colors as any,
        animations: theme.animations as any,
        fonts: theme.fonts as any,
        wallLayout: theme.wallLayout,
        description: theme.description,
        tags: theme.tags,
        isPremium: theme.isPremium,
        isPublic: true,
        isAiGenerated: false,
      },
    });
    created++;
  }

  console.log(`✅ Themes seeded: ${created} created, ${skipped} skipped (already exist)`);
}

seedThemes()
  .catch((e) => {
    console.error('❌ Theme seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
