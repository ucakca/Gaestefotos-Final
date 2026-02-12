export interface MosaicWizardState {
  currentStep: number;
  // Step 1: Mode + Grid
  mode: 'DIGITAL' | 'PRINT';
  gridWidth: number;
  gridHeight: number;
  tileSizeMm: number;
  boardWidthMm: number | null;
  boardHeightMm: number | null;
  // Step 2: Target Image
  targetImageUrl: string | null;
  // Step 3: Overlay
  overlayIntensity: number;
  scatterValue: number;
  // Step 4: Display
  selectedAnimations: string[];
  showTicker: boolean;
  showQrOverlay: boolean;
  autoFillEnabled: boolean;
  autoFillThreshold: number;
  // Print-specific
  printEnabled: boolean;
  printConfirmation: boolean;
  reservationTimeout: number;
  // Status
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
}

export const INITIAL_WIZARD_STATE: MosaicWizardState = {
  currentStep: 1,
  mode: 'DIGITAL',
  gridWidth: 12,
  gridHeight: 12,
  tileSizeMm: 50,
  boardWidthMm: null,
  boardHeightMm: null,
  targetImageUrl: null,
  overlayIntensity: 35,
  scatterValue: 0,
  selectedAnimations: ['ZOOM_FLY', 'PUZZLE', 'FLIP', 'PARTICLES', 'RIPPLE'],
  showTicker: true,
  showQrOverlay: true,
  autoFillEnabled: true,
  autoFillThreshold: 85,
  printEnabled: false,
  printConfirmation: true,
  reservationTimeout: 15,
  status: 'DRAFT',
};

export const GRID_PRESETS = [
  { label: 'Klein', w: 8, h: 8, tiles: 64, guests: '20–40', icon: '⬛' },
  { label: 'Mittel', w: 12, h: 12, tiles: 144, guests: '50–80', icon: '🟪' },
  { label: 'Groß', w: 24, h: 24, tiles: 576, guests: '100–200', icon: '🟦' },
  { label: 'XL', w: 36, h: 24, tiles: 864, guests: '200–400', icon: '🟩' },
] as const;

export const PRINT_BOARD_PRESETS = [
  { label: '60 × 60 cm', wmm: 600, hmm: 600 },
  { label: '80 × 60 cm', wmm: 800, hmm: 600 },
  { label: '100 × 70 cm', wmm: 1000, hmm: 700 },
  { label: '120 × 80 cm', wmm: 1200, hmm: 800 },
] as const;

export const TILE_SIZE_PRESETS = [
  { label: '3 × 3 cm', mm: 30 },
  { label: '5 × 5 cm', mm: 50 },
  { label: '7,5 × 7,5 cm', mm: 75 },
] as const;

export const ANIMATIONS = [
  { value: 'FLIP', label: 'Flip', desc: '3D-Karten-Flip' },
  { value: 'PUZZLE', label: 'Puzzle', desc: 'Dreh-Animation' },
  { value: 'PARTICLES', label: 'Partikel', desc: 'Blur-Fade Effekt' },
  { value: 'ZOOM_FLY', label: 'Zoom', desc: 'Fliegt auf Position' },
  { value: 'RIPPLE', label: 'Ripple', desc: 'Spring-Pop Effekt' },
] as const;

export const WIZARD_STEPS = [
  { num: 1, label: 'Modus' },
  { num: 2, label: 'Zielbild' },
  { num: 3, label: 'Overlay' },
  { num: 4, label: 'Display' },
  { num: 5, label: 'Start' },
] as const;
