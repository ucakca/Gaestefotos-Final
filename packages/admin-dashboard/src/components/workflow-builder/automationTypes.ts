/**
 * Automation Types — Subset of executable step types for the Pipeline Builder.
 * Only steps that the backend workflowExecutor can actually run.
 * 
 * This file does NOT replace types.ts — it's an additional registry
 * specifically for the "Automationen" tab.
 */

// ─── Automation Step Definition ─────────────────────────────────────────────

export interface AutomationStepDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;       // tailwind text color
  bgColor: string;     // tailwind bg color
  group: 'trigger' | 'condition' | 'action';
  configFields: AutomationConfigField[];
  defaultConfig: Record<string, any>;
}

export interface AutomationConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
}

export interface AutomationStep {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface AutomationPipeline {
  id?: string;
  name: string;
  description: string;
  trigger: AutomationStep;
  steps: AutomationStep[];
  isActive: boolean;
}

// ─── Triggers ───────────────────────────────────────────────────────────────

export const AUTOMATION_TRIGGERS: AutomationStepDef[] = [
  {
    type: 'TRIGGER_PHOTO_UPLOADED',
    label: 'Foto hochgeladen',
    description: 'Wird ausgelöst wenn ein Gast oder Fotograf ein Foto hochlädt',
    icon: 'Upload',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    group: 'trigger',
    defaultConfig: { source: 'any' },
    configFields: [
      { key: 'source', label: 'Quelle', type: 'select', options: [
        { value: 'any', label: 'Alle Quellen' },
        { value: 'guest', label: 'Gast-Upload' },
        { value: 'booth', label: 'Photo Booth' },
        { value: 'photographer', label: 'Fotograf' },
      ]},
    ],
  },
  {
    type: 'TRIGGER_TIMER',
    label: 'Zeitgesteuert',
    description: 'Läuft automatisch zu einem bestimmten Zeitpunkt',
    icon: 'Clock',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    group: 'trigger',
    defaultConfig: { mode: 'after_event_end', delayMinutes: 60 },
    configFields: [
      { key: 'mode', label: 'Zeitpunkt', type: 'select', options: [
        { value: 'after_event_start', label: 'Nach Event-Beginn' },
        { value: 'after_event_end', label: 'Nach Event-Ende' },
      ]},
      { key: 'delayMinutes', label: 'Verzögerung (Minuten)', type: 'number', min: 0, max: 10080, defaultValue: 60 },
    ],
  },
  {
    type: 'TRIGGER_EVENT_START',
    label: 'Event gestartet',
    description: 'Wird ausgelöst wenn das Event beginnt',
    icon: 'Flag',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    group: 'trigger',
    defaultConfig: {},
    configFields: [],
  },
  {
    type: 'TRIGGER_EVENT_END',
    label: 'Event beendet',
    description: 'Wird ausgelöst wenn das Event endet',
    icon: 'FlagOff',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    group: 'trigger',
    defaultConfig: {},
    configFields: [],
  },
  {
    type: 'TRIGGER_GUEST_JOINED',
    label: 'Gast beigetreten',
    description: 'Wird ausgelöst wenn ein neuer Gast dem Event beitritt',
    icon: 'UserPlus',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    group: 'trigger',
    defaultConfig: {},
    configFields: [],
  },
];

// ─── Conditions ─────────────────────────────────────────────────────────────

export const AUTOMATION_CONDITIONS: AutomationStepDef[] = [
  {
    type: 'CONDITION',
    label: 'Wenn / Dann / Sonst',
    description: 'Prüft eine Bedingung und verzweigt den Flow',
    icon: 'GitBranch',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    group: 'condition',
    defaultConfig: { field: 'quality_score', operator: 'greater_than', value: '50' },
    configFields: [
      { key: 'field', label: 'Feld prüfen', type: 'select', options: [
        { value: 'upload_source', label: 'Upload-Quelle' },
        { value: 'quality_score', label: 'Qualitäts-Score' },
        { value: 'has_face', label: 'Gesicht erkannt' },
        { value: 'is_duplicate', label: 'Ist Duplikat' },
        { value: 'photo_count', label: 'Foto-Anzahl' },
        { value: 'file_size', label: 'Dateigröße' },
        { value: 'has_consent', label: 'Hat Einwilligung' },
      ]},
      { key: 'operator', label: 'Operator', type: 'select', options: [
        { value: 'equals', label: '= Gleich' },
        { value: 'not_equals', label: '≠ Ungleich' },
        { value: 'greater_than', label: '> Größer als' },
        { value: 'less_than', label: '< Kleiner als' },
        { value: 'is_true', label: 'Ist wahr' },
        { value: 'is_false', label: 'Ist falsch' },
      ]},
      { key: 'value', label: 'Vergleichswert', type: 'text', placeholder: 'z.B. 50, booth, true' },
    ],
  },
];

// ─── Actions ────────────────────────────────────────────────────────────────

export const AUTOMATION_ACTIONS: AutomationStepDef[] = [
  // AI
  {
    type: 'AI_CATEGORIZE_PHOTO',
    label: 'KI-Kategorisierung',
    description: 'Erkennt Inhalte und vergibt automatisch Kategorien',
    icon: 'Tags',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    group: 'action',
    defaultConfig: { autoTag: true, confidenceThreshold: 0.7 },
    configFields: [
      { key: 'autoTag', label: 'Automatisch taggen', type: 'toggle', defaultValue: true },
      { key: 'confidenceThreshold', label: 'Mindest-Konfidenz (0-1)', type: 'number', min: 0, max: 1, defaultValue: 0.7 },
    ],
  },
  {
    type: 'AI_MODIFY',
    label: 'KI Style Transfer',
    description: 'Wendet einen KI-Stil auf das Foto an',
    icon: 'Wand2',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    group: 'action',
    defaultConfig: { prompt: '', strength: 0.7 },
    configFields: [
      { key: 'prompt', label: 'Stil-Prompt', type: 'textarea', placeholder: 'z.B. Renaissance painting, watercolor style...' },
      { key: 'strength', label: 'Stärke (0-1)', type: 'number', min: 0.1, max: 1, defaultValue: 0.7 },
    ],
  },
  {
    type: 'AI_BG_REMOVAL',
    label: 'Hintergrund entfernen',
    description: 'Entfernt den Hintergrund mit KI',
    icon: 'Eraser',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    group: 'action',
    defaultConfig: { replaceBg: 'transparent' },
    configFields: [
      { key: 'replaceBg', label: 'Hintergrund ersetzen mit', type: 'select', options: [
        { value: 'transparent', label: 'Transparent (PNG)' },
        { value: 'white', label: 'Weiß' },
      ]},
    ],
  },
  {
    type: 'QUALITY_GATE',
    label: 'Qualitäts-Check',
    description: 'Prüft Schärfe, Auflösung und Duplikate',
    icon: 'ShieldCheck',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    group: 'action',
    defaultConfig: { minBlurScore: 50, minResolution: 640, checkDuplicates: true },
    configFields: [
      { key: 'minBlurScore', label: 'Min. Schärfe (0-100)', type: 'number', min: 0, max: 100, defaultValue: 50 },
      { key: 'minResolution', label: 'Min. Auflösung (px)', type: 'number', min: 100, max: 4000, defaultValue: 640 },
      { key: 'checkDuplicates', label: 'Duplikat-Erkennung', type: 'toggle', defaultValue: true },
    ],
  },

  // Data
  {
    type: 'ADD_TAG',
    label: 'Tags hinzufügen',
    description: 'Fügt Tags zum Foto hinzu',
    icon: 'Tag',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    group: 'action',
    defaultConfig: { tags: '' },
    configFields: [
      { key: 'tags', label: 'Tags (kommagetrennt)', type: 'text', placeholder: 'booth, hochzeit, vip' },
    ],
  },
  {
    type: 'MOVE_TO_ALBUM',
    label: 'In Album verschieben',
    description: 'Verschiebt das Foto in ein bestimmtes Album',
    icon: 'FolderInput',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    group: 'action',
    defaultConfig: { albumName: '' },
    configFields: [
      { key: 'albumName', label: 'Album-Name', type: 'text', placeholder: 'z.B. Booth-Fotos' },
    ],
  },

  // Communication
  {
    type: 'SEND_EMAIL',
    label: 'Email senden',
    description: 'Sendet eine Email an Host oder Gast',
    icon: 'Mail',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    group: 'action',
    defaultConfig: { to: 'host', subject: '', template: 'notification' },
    configFields: [
      { key: 'to', label: 'Empfänger', type: 'select', options: [
        { value: 'host', label: 'Event-Host' },
        { value: 'guest', label: 'Gast (Uploader)' },
        { value: 'all_guests', label: 'Alle Gäste' },
      ]},
      { key: 'subject', label: 'Betreff', type: 'text', placeholder: 'Neues Foto von {eventName}' },
      { key: 'template', label: 'Template', type: 'select', options: [
        { value: 'notification', label: 'Benachrichtigung' },
        { value: 'gallery_link', label: 'Galerie-Link' },
        { value: 'thank_you', label: 'Danke-Email' },
      ]},
    ],
  },
  {
    type: 'SEND_NOTIFICATION',
    label: 'Push-Benachrichtigung',
    description: 'Sendet eine Push-Nachricht',
    icon: 'Bell',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    group: 'action',
    defaultConfig: { to: 'host', message: '' },
    configFields: [
      { key: 'to', label: 'Empfänger', type: 'select', options: [
        { value: 'host', label: 'Event-Host' },
        { value: 'admins', label: 'Alle Admins' },
      ]},
      { key: 'message', label: 'Nachricht', type: 'text', placeholder: 'Neues Foto hochgeladen!' },
    ],
  },
  {
    type: 'WEBHOOK',
    label: 'Webhook aufrufen',
    description: 'Sendet Daten an eine externe URL',
    icon: 'Webhook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    group: 'action',
    defaultConfig: { url: '', method: 'POST' },
    configFields: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com/webhook' },
      { key: 'method', label: 'HTTP-Methode', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
      ]},
    ],
  },

  // Other
  {
    type: 'PRINT_JOB',
    label: 'Druckauftrag',
    description: 'Erstellt einen Druckauftrag für das Print-Terminal',
    icon: 'Printer',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    group: 'action',
    defaultConfig: { copies: 1, size: 'standard' },
    configFields: [
      { key: 'copies', label: 'Kopien', type: 'number', min: 1, max: 5, defaultValue: 1 },
      { key: 'size', label: 'Größe', type: 'select', options: [
        { value: 'standard', label: '10×15 cm' },
        { value: 'strip', label: 'Fotostreifen' },
      ]},
    ],
  },
  {
    type: 'DELAY',
    label: 'Warten',
    description: 'Wartet eine bestimmte Zeit bevor es weitergeht',
    icon: 'Timer',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    group: 'action',
    defaultConfig: { duration: 5, unit: 'seconds' },
    configFields: [
      { key: 'duration', label: 'Dauer', type: 'number', min: 1, max: 300, defaultValue: 5 },
      { key: 'unit', label: 'Einheit', type: 'select', options: [
        { value: 'seconds', label: 'Sekunden' },
        { value: 'minutes', label: 'Minuten' },
      ]},
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getAutomationStepDef(type: string): AutomationStepDef | undefined {
  return [
    ...AUTOMATION_TRIGGERS,
    ...AUTOMATION_CONDITIONS,
    ...AUTOMATION_ACTIONS,
  ].find(s => s.type === type);
}

export function getAllAutomationSteps(): AutomationStepDef[] {
  return [...AUTOMATION_TRIGGERS, ...AUTOMATION_CONDITIONS, ...AUTOMATION_ACTIONS];
}
