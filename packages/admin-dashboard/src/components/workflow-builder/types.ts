// ─── Workflow Builder Types ──────────────────────────────────────────────────

export type StepCategory = 'animation' | 'feature' | 'cloud' | 'hardware' | 'ai';

export interface StepTypeDefinition {
  type: string;
  label: string;
  category: StepCategory;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  bgColor: string;
  borderColor: string;
  defaultConfig: Record<string, any>;
  configFields: ConfigField[];
  outputs: OutputHandle[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea' | 'color';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: any;
  placeholder?: string;
}

export interface OutputHandle {
  id: string;
  label: string;
  type: 'default' | 'skip' | 'retake' | 'conditional';
}

export interface WorkflowNodeData {
  type: string;
  label: string;
  category: StepCategory;
  stepNumber: number;
  config: Record<string, any>;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  outputs: OutputHandle[];
}

export interface WorkflowEdgeData {
  label?: string;
  type?: 'default' | 'skip' | 'retake' | 'conditional';
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: any[];
  edges: any[];
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Step Type Registry ─────────────────────────────────────────────────────

export const STEP_CATEGORIES: { key: StepCategory; label: string; color: string }[] = [
  { key: 'animation', label: 'Animation', color: 'orange' },
  { key: 'feature', label: 'Feature', color: 'amber' },
  { key: 'ai', label: 'KI / AI', color: 'violet' },
  { key: 'cloud', label: 'Cloud', color: 'blue' },
  { key: 'hardware', label: 'Hardware', color: 'emerald' },
];

export const STEP_TYPES: StepTypeDefinition[] = [
  // ── ANIMATION ──
  {
    type: 'TOUCH_TO_START',
    label: 'Touch to Start',
    category: 'animation',
    icon: 'Hand',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultConfig: { triggerType: 'touch', idleAnimation: 'random' },
    configFields: [
      { key: 'triggerType', label: 'Trigger', type: 'select', options: [
        { value: 'touch', label: 'Touch' },
        { value: 'motion', label: 'Bewegung' },
        { value: 'auto', label: 'Automatisch' },
      ]},
      { key: 'idleAnimation', label: 'Idle Animation', type: 'select', options: [
        { value: 'random', label: 'Zufällig' },
        { value: 'bounce', label: 'Bounce' },
        { value: 'fade', label: 'Fade' },
        { value: 'none', label: 'Keine' },
      ]},
      { key: 'idleTimeout', label: 'Idle Timeout (s)', type: 'number', min: 5, max: 300, defaultValue: 30 },
    ],
    outputs: [{ id: 'default', label: 'Gestartet', type: 'default' }],
  },
  {
    type: 'BEFORE_COUNTDOWN',
    label: 'Before Countdown',
    category: 'animation',
    icon: 'Sparkles',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultConfig: { animation: 'random', duration: 2 },
    configFields: [
      { key: 'animation', label: 'Animation', type: 'select', options: [
        { value: 'random', label: 'Zufällig' },
        { value: 'zoom', label: 'Zoom' },
        { value: 'slide', label: 'Slide' },
        { value: 'flash', label: 'Flash' },
      ]},
      { key: 'duration', label: 'Dauer (s)', type: 'number', min: 1, max: 10, defaultValue: 2 },
    ],
    outputs: [{ id: 'default', label: 'Playback Ended', type: 'default' }],
  },
  {
    type: 'COUNTDOWN',
    label: 'Countdown',
    category: 'animation',
    icon: 'Timer',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultConfig: { duration: 3, animation: 'random', sound: true },
    configFields: [
      { key: 'duration', label: 'Countdown (s)', type: 'number', min: 1, max: 10, defaultValue: 3 },
      { key: 'animation', label: 'Animation', type: 'select', options: [
        { value: 'random', label: 'Zufällig' },
        { value: 'numeric', label: 'Zahlen' },
        { value: 'circle', label: 'Kreis' },
        { value: 'bar', label: 'Balken' },
      ]},
      { key: 'sound', label: 'Sound', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Playback Ended', type: 'default' }],
  },
  {
    type: 'COMPLIMENT',
    label: 'Compliment',
    category: 'animation',
    icon: 'Heart',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultConfig: { animation: 'random', textSource: 'auto', customTexts: '' },
    configFields: [
      { key: 'animation', label: 'Animation', type: 'select', options: [
        { value: 'random', label: 'Zufällig' },
        { value: 'typewriter', label: 'Schreibmaschine' },
        { value: 'fade', label: 'Einblenden' },
        { value: 'confetti', label: 'Konfetti' },
      ]},
      { key: 'textSource', label: 'Text-Quelle', type: 'select', options: [
        { value: 'auto', label: 'KI-generiert' },
        { value: 'custom', label: 'Eigene Texte' },
      ]},
      { key: 'customTexts', label: 'Eigene Texte (1 pro Zeile)', type: 'textarea', placeholder: 'Tolles Foto!\nWunderbar!\nPerfekt!' },
    ],
    outputs: [{ id: 'default', label: 'Playback Ended', type: 'default' }],
  },
  {
    type: 'AFTER_SHARE',
    label: 'After Share',
    category: 'animation',
    icon: 'PartyPopper',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    defaultConfig: { animation: 'single', duration: 3 },
    configFields: [
      { key: 'animation', label: 'Animation', type: 'select', options: [
        { value: 'single', label: 'Einzelbild' },
        { value: 'confetti', label: 'Konfetti' },
        { value: 'fireworks', label: 'Feuerwerk' },
        { value: 'thankyou', label: 'Danke-Screen' },
      ]},
      { key: 'duration', label: 'Dauer (s)', type: 'number', min: 1, max: 10, defaultValue: 3 },
    ],
    outputs: [
      { id: 'default', label: 'Playback Ended', type: 'default' },
      { id: 'retake', label: 'Retake', type: 'retake' },
    ],
  },

  // ── FEATURE ──
  {
    type: 'LED_RING',
    label: 'LED Ring',
    category: 'feature',
    icon: 'Lightbulb',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    defaultConfig: { mode: 'start', color: '#ffffff', brightness: 100, effect: 'solid' },
    configFields: [
      { key: 'mode', label: 'Modus', type: 'select', options: [
        { value: 'start', label: 'Einschalten' },
        { value: 'stop', label: 'Ausschalten' },
        { value: 'flash', label: 'Flash' },
        { value: 'pulse', label: 'Pulsieren' },
      ]},
      { key: 'color', label: 'Farbe', type: 'color', defaultValue: '#ffffff' },
      { key: 'brightness', label: 'Helligkeit (%)', type: 'number', min: 0, max: 100, defaultValue: 100 },
      { key: 'effect', label: 'Effekt', type: 'select', options: [
        { value: 'solid', label: 'Durchgehend' },
        { value: 'rainbow', label: 'Regenbogen' },
        { value: 'warm', label: 'Warmweiß' },
        { value: 'cool', label: 'Kaltweiß' },
      ]},
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'TAKE_PHOTO',
    label: 'Take Photo',
    category: 'feature',
    icon: 'Camera',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    defaultConfig: { captureMode: 'single', burstCount: 1, flash: true, mirror: false },
    configFields: [
      { key: 'captureMode', label: 'Aufnahme-Modus', type: 'select', options: [
        { value: 'single', label: 'Einzelbild' },
        { value: 'burst', label: 'Burst (mehrere)' },
        { value: 'gif', label: 'GIF' },
        { value: 'video', label: 'Video' },
      ]},
      { key: 'burstCount', label: 'Anzahl (Burst)', type: 'number', min: 1, max: 10, defaultValue: 1 },
      { key: 'flash', label: 'Blitz', type: 'toggle', defaultValue: true },
      { key: 'mirror', label: 'Spiegeln', type: 'toggle', defaultValue: false },
    ],
    outputs: [{ id: 'default', label: 'Foto aufgenommen', type: 'default' }],
  },
  {
    type: 'SELECTION_SCREEN',
    label: 'Selection Screen',
    category: 'feature',
    icon: 'LayoutGrid',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    defaultConfig: { mode: 'step', allowMultiple: false, maxSelect: 1 },
    configFields: [
      { key: 'mode', label: 'Modus', type: 'select', options: [
        { value: 'step', label: 'Schritt wählen' },
        { value: 'photo', label: 'Foto wählen' },
        { value: 'filter', label: 'Filter wählen' },
        { value: 'layout', label: 'Layout wählen' },
      ]},
      { key: 'allowMultiple', label: 'Mehrfachauswahl', type: 'toggle', defaultValue: false },
      { key: 'maxSelect', label: 'Max. Auswahl', type: 'number', min: 1, max: 10, defaultValue: 1 },
    ],
    outputs: [
      { id: 'default', label: 'Gewählt', type: 'default' },
      { id: 'skip', label: 'Skip', type: 'skip' },
    ],
  },
  {
    type: 'FOTO_SPIEL',
    label: 'Foto-Spiel',
    category: 'feature',
    icon: 'Gamepad2',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    defaultConfig: { gameType: 'random', difficulty: 'easy' },
    configFields: [
      { key: 'gameType', label: 'Spiel-Typ', type: 'select', options: [
        { value: 'random', label: 'Zufällig' },
        { value: 'emoji_challenge', label: 'Emoji Challenge' },
        { value: 'filter_roulette', label: 'Filter Roulette' },
        { value: 'cover_shoot', label: 'Cover Shooting' },
        { value: 'photobomb', label: 'Fotobomber' },
      ]},
      { key: 'difficulty', label: 'Schwierigkeit', type: 'select', options: [
        { value: 'easy', label: 'Leicht' },
        { value: 'medium', label: 'Mittel' },
        { value: 'hard', label: 'Schwer' },
      ]},
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'DIGITAL_GRAFFITI',
    label: 'Digital Graffiti',
    category: 'feature',
    icon: 'Pen',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    defaultConfig: { enableEmojis: true, enableText: true, brushSizes: 3, maxDuration: 60 },
    configFields: [
      { key: 'enableEmojis', label: 'Emojis erlauben', type: 'toggle', defaultValue: true },
      { key: 'enableText', label: 'Text erlauben', type: 'toggle', defaultValue: true },
      { key: 'brushSizes', label: 'Pinselgrößen', type: 'number', min: 1, max: 10, defaultValue: 3 },
      { key: 'maxDuration', label: 'Max. Dauer (s)', type: 'number', min: 10, max: 300, defaultValue: 60 },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },

  // ── AI / KI ──
  {
    type: 'AI_MODIFY',
    label: 'KI-Kunst (Style Transfer)',
    category: 'ai',
    icon: 'Wand2',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'style_transfer', prompt: 'Transform the person in a renaissance painting', strength: 0.7 },
    configFields: [
      { key: 'prompt', label: 'KI-Prompt', type: 'textarea', placeholder: 'Beschreibe den gewünschten Effekt...' },
      { key: 'strength', label: 'Stärke (0-1)', type: 'number', min: 0, max: 1, defaultValue: 0.7 },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },
  {
    type: 'AI_FACE_SWITCH',
    label: 'Face Switch',
    category: 'ai',
    icon: 'Shuffle',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'face_switch', mode: 'swap_all', showBefore: true },
    configFields: [
      { key: 'mode', label: 'Modus', type: 'select', options: [
        { value: 'swap_all', label: 'Alle Gesichter tauschen' },
        { value: 'swap_random', label: 'Zufällig tauschen' },
        { value: 'swap_with_template', label: 'Mit Vorlage tauschen' },
      ]},
      { key: 'showBefore', label: 'Vorher/Nachher zeigen', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },
  {
    type: 'AI_BG_REMOVAL',
    label: 'Hintergrund entfernen',
    category: 'ai',
    icon: 'Eraser',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'bg_removal', replaceBg: 'transparent', customBgUrl: '' },
    configFields: [
      { key: 'replaceBg', label: 'Hintergrund ersetzen', type: 'select', options: [
        { value: 'transparent', label: 'Transparent' },
        { value: 'white', label: 'Weiß' },
        { value: 'blur', label: 'Unschärfe (Original)' },
        { value: 'custom', label: 'Eigenes Bild' },
        { value: 'event_theme', label: 'Event-Thema' },
      ]},
      { key: 'customBgUrl', label: 'Eigenes Hintergrund-Bild (URL)', type: 'text', placeholder: 'https://...' },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },
  {
    type: 'AI_OLDIFY',
    label: 'Oldify (Alterung)',
    category: 'ai',
    icon: 'Clock',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'ai_oldify', ageOffset: 40, showBefore: true },
    configFields: [
      { key: 'ageOffset', label: 'Jahre älter', type: 'number', min: 10, max: 60, defaultValue: 40 },
      { key: 'showBefore', label: 'Vorher/Nachher zeigen', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },
  {
    type: 'AI_CARTOON',
    label: 'Cartoon-Effekt',
    category: 'ai',
    icon: 'Palette',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'ai_cartoon', style: 'pixar', intensity: 0.8 },
    configFields: [
      { key: 'style', label: 'Cartoon-Stil', type: 'select', options: [
        { value: 'pixar', label: 'Pixar / 3D' },
        { value: 'anime', label: 'Anime' },
        { value: 'comic', label: 'Comic' },
        { value: 'caricature', label: 'Karikatur' },
        { value: 'watercolor', label: 'Aquarell' },
      ]},
      { key: 'intensity', label: 'Intensität (0-1)', type: 'number', min: 0, max: 1, defaultValue: 0.8 },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },
  {
    type: 'AI_STYLE_POP',
    label: 'Style Pop',
    category: 'ai',
    icon: 'Sparkles',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    defaultConfig: { aiFeature: 'ai_style_pop', style: 'pop_art', preserveFace: true },
    configFields: [
      { key: 'style', label: 'Stil', type: 'select', options: [
        { value: 'pop_art', label: 'Pop Art' },
        { value: 'neon', label: 'Neon Glow' },
        { value: 'retro', label: 'Retro 80s' },
        { value: 'cyberpunk', label: 'Cyberpunk' },
        { value: 'renaissance', label: 'Renaissance' },
        { value: 'impressionist', label: 'Impressionismus' },
      ]},
      { key: 'preserveFace', label: 'Gesicht beibehalten', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Verarbeitet', type: 'default' }],
  },

  // ── CLOUD ──
  {
    type: 'SMS_SHARE',
    label: 'SMS',
    category: 'cloud',
    icon: 'MessageSquare',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { mediaType: 'finalPhoto', messageTemplate: 'Hier ist dein Foto von {eventName}!' },
    configFields: [
      { key: 'mediaType', label: 'Medien-Typ', type: 'select', options: [
        { value: 'finalPhoto', label: 'Finales Foto' },
        { value: 'original', label: 'Original' },
        { value: 'galleryLink', label: 'Galerie-Link' },
      ]},
      { key: 'messageTemplate', label: 'Nachricht', type: 'textarea', placeholder: 'Hier ist dein Foto von {eventName}!' },
    ],
    outputs: [{ id: 'default', label: 'Gesendet', type: 'default' }],
  },
  {
    type: 'EMAIL_SHARE',
    label: 'Email',
    category: 'cloud',
    icon: 'Mail',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { mediaType: 'finalPhoto', subject: 'Dein Foto von {eventName}', template: 'default' },
    configFields: [
      { key: 'mediaType', label: 'Medien-Typ', type: 'select', options: [
        { value: 'finalPhoto', label: 'Finales Foto' },
        { value: 'original', label: 'Original' },
        { value: 'galleryLink', label: 'Galerie-Link' },
      ]},
      { key: 'subject', label: 'Betreff', type: 'text', placeholder: 'Dein Foto von {eventName}' },
      { key: 'template', label: 'Template', type: 'select', options: [
        { value: 'default', label: 'Standard' },
        { value: 'branded', label: 'Gebrandetes Template' },
        { value: 'minimal', label: 'Minimal' },
      ]},
    ],
    outputs: [{ id: 'default', label: 'Gesendet', type: 'default' }],
  },
  {
    type: 'QR_CODE',
    label: 'QR Code',
    category: 'cloud',
    icon: 'QrCode',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { mediaType: 'finalPhoto', displayDuration: 10, showDownloadLink: true },
    configFields: [
      { key: 'mediaType', label: 'Verlinkt auf', type: 'select', options: [
        { value: 'finalPhoto', label: 'Finales Foto' },
        { value: 'gallery', label: 'Event-Galerie' },
        { value: 'cloud', label: 'Cloud Medien-Seite' },
      ]},
      { key: 'displayDuration', label: 'Anzeige-Dauer (s)', type: 'number', min: 5, max: 60, defaultValue: 10 },
      { key: 'showDownloadLink', label: 'Download-Link zeigen', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'FACE_SEARCH',
    label: 'Face Search',
    category: 'cloud',
    icon: 'ScanFace',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { aiFeature: 'face_search', autoSearch: true, showResults: true },
    configFields: [
      { key: 'autoSearch', label: 'Auto-Suche', type: 'toggle', defaultValue: true },
      { key: 'showResults', label: 'Ergebnisse anzeigen', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'GALLERY_EMBED',
    label: 'Gallery Embed',
    category: 'cloud',
    icon: 'Code',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { embedType: 'iframe', theme: 'auto', maxPhotos: 50 },
    configFields: [
      { key: 'embedType', label: 'Embed-Typ', type: 'select', options: [
        { value: 'iframe', label: 'iFrame' },
        { value: 'script', label: 'Script-Tag' },
        { value: 'oembed', label: 'oEmbed' },
      ]},
      { key: 'theme', label: 'Theme', type: 'select', options: [
        { value: 'auto', label: 'Automatisch' },
        { value: 'light', label: 'Hell' },
        { value: 'dark', label: 'Dunkel' },
      ]},
      { key: 'maxPhotos', label: 'Max. Fotos', type: 'number', min: 1, max: 500, defaultValue: 50 },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'SLIDESHOW',
    label: 'Slideshow',
    category: 'cloud',
    icon: 'Tv',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { interval: 5, transition: 'fade', shuffle: false, showCaptions: false },
    configFields: [
      { key: 'interval', label: 'Intervall (s)', type: 'number', min: 2, max: 30, defaultValue: 5 },
      { key: 'transition', label: 'Übergang', type: 'select', options: [
        { value: 'fade', label: 'Einblenden' },
        { value: 'slide', label: 'Slide' },
        { value: 'zoom', label: 'Zoom' },
        { value: 'flip', label: 'Flip' },
        { value: 'random', label: 'Zufällig' },
      ]},
      { key: 'shuffle', label: 'Zufällige Reihenfolge', type: 'toggle', defaultValue: false },
      { key: 'showCaptions', label: 'Bildunterschriften', type: 'toggle', defaultValue: false },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'ZIP_DOWNLOAD',
    label: 'ZIP Download',
    category: 'cloud',
    icon: 'Archive',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { includeOriginals: true, maxPhotos: 0, quality: 'original' },
    configFields: [
      { key: 'includeOriginals', label: 'Originalbilder einschließen', type: 'toggle', defaultValue: true },
      { key: 'quality', label: 'Qualität', type: 'select', options: [
        { value: 'original', label: 'Original' },
        { value: 'high', label: 'Hoch (2048px)' },
        { value: 'medium', label: 'Mittel (1024px)' },
      ]},
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
  {
    type: 'LEAD_COLLECTION',
    label: 'Lead-Erfassung',
    category: 'cloud',
    icon: 'UserPlus',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    defaultConfig: { requiredFields: 'email', showConsent: true, consentText: 'Ich stimme der Kontaktaufnahme zu.' },
    configFields: [
      { key: 'requiredFields', label: 'Pflichtfelder', type: 'select', options: [
        { value: 'email', label: 'Nur E-Mail' },
        { value: 'email_name', label: 'E-Mail + Name' },
        { value: 'email_name_phone', label: 'E-Mail + Name + Telefon' },
        { value: 'all', label: 'Alle (inkl. Firma)' },
      ]},
      { key: 'showConsent', label: 'DSGVO-Einwilligung anzeigen', type: 'toggle', defaultValue: true },
      { key: 'consentText', label: 'Einwilligungs-Text', type: 'textarea', placeholder: 'Ich stimme der Kontaktaufnahme zu.' },
    ],
    outputs: [
      { id: 'default', label: 'Erfasst', type: 'default' },
      { id: 'skip', label: 'Übersprungen', type: 'skip' },
    ],
  },

  // ── HARDWARE ──
  {
    type: 'PRINT',
    label: 'Drucken',
    category: 'hardware',
    icon: 'Printer',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    defaultConfig: { copies: 1, size: 'standard', quality: 'high', showPreview: true },
    configFields: [
      { key: 'copies', label: 'Kopien', type: 'number', min: 1, max: 5, defaultValue: 1 },
      { key: 'size', label: 'Größe', type: 'select', options: [
        { value: 'standard', label: '10×15 cm' },
        { value: 'strip', label: 'Fotostreifen' },
        { value: 'sticker', label: 'Sticker' },
        { value: 'polaroid', label: 'Polaroid' },
      ]},
      { key: 'quality', label: 'Qualität', type: 'select', options: [
        { value: 'high', label: 'Hoch (300 DPI)' },
        { value: 'standard', label: 'Standard (200 DPI)' },
      ]},
      { key: 'showPreview', label: 'Druckvorschau', type: 'toggle', defaultValue: true },
    ],
    outputs: [{ id: 'default', label: 'Gedruckt', type: 'default' }],
  },
  {
    type: 'BOOTH_DISPLAY',
    label: 'Booth Display',
    category: 'hardware',
    icon: 'Monitor',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    defaultConfig: { content: 'photo', displayMode: 'fullscreen', showOverlay: false },
    configFields: [
      { key: 'content', label: 'Inhalt', type: 'select', options: [
        { value: 'photo', label: 'Aktuelles Foto' },
        { value: 'slideshow', label: 'Diashow' },
        { value: 'idle', label: 'Idle-Screen' },
        { value: 'custom', label: 'Eigenes Bild' },
      ]},
      { key: 'displayMode', label: 'Anzeige', type: 'select', options: [
        { value: 'fullscreen', label: 'Vollbild' },
        { value: 'split', label: 'Geteilt' },
        { value: 'pip', label: 'Bild-in-Bild' },
      ]},
      { key: 'showOverlay', label: 'Overlay anzeigen', type: 'toggle', defaultValue: false },
    ],
    outputs: [{ id: 'default', label: 'Fertig', type: 'default' }],
  },
];

export function getStepType(type: string): StepTypeDefinition | undefined {
  return STEP_TYPES.find(s => s.type === type);
}

export function getStepsByCategory(category: StepCategory): StepTypeDefinition[] {
  return STEP_TYPES.filter(s => s.category === category);
}
