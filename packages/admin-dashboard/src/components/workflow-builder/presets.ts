import type { Node, Edge } from '@xyflow/react';

interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: Node[];
  edges: Edge[];
}

let nodeIdCounter = 0;
function nid() { return `preset-${++nodeIdCounter}`; }

function makeNode(id: string, type: string, label: string, category: string, x: number, y: number, config: Record<string, any> = {}, outputs: any[] = [{ id: 'default', label: '', type: 'default' }]): Node {
  const COLORS: Record<string, { color: string; bgColor: string; borderColor: string; icon: string }> = {
    TOUCH_TO_START: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Hand' },
    BEFORE_COUNTDOWN: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Sparkles' },
    COUNTDOWN: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Timer' },
    COMPLIMENT: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Heart' },
    AFTER_SHARE: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'PartyPopper' },
    LED_RING: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Lightbulb' },
    TAKE_PHOTO: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Camera' },
    SELECTION_SCREEN: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'LayoutGrid' },
    FOTO_SPIEL: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Gamepad2' },
    DIGITAL_GRAFFITI: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Pen' },
    AI_MODIFY: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'Wand2' },
    SMS_SHARE: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'MessageSquare' },
    EMAIL_SHARE: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'Mail' },
    QR_CODE: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'QrCode' },
    FACE_SEARCH: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'ScanFace' },
    PRINT: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', icon: 'Printer' },
    BOOTH_DISPLAY: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', icon: 'Monitor' },
  };

  const c = COLORS[type] || COLORS.TAKE_PHOTO;

  return {
    id,
    type: 'workflowStep',
    position: { x, y },
    data: {
      type,
      label,
      category,
      stepNumber: 0,
      config,
      color: c.color,
      bgColor: c.bgColor,
      borderColor: c.borderColor,
      icon: c.icon,
      outputs,
    },
  };
}

function makeEdge(source: string, target: string, sourceHandle = 'default', label?: string, edgeType?: string): Edge {
  return {
    id: `e-${source}-${target}-${sourceHandle}`,
    source,
    target,
    sourceHandle,
    animated: edgeType === 'skip' || edgeType === 'retake',
    style: {
      stroke: edgeType === 'skip' ? '#eab308' : edgeType === 'retake' ? '#ef4444' : '#94a3b8',
      strokeWidth: 2,
    },
    label: label || undefined,
    labelStyle: { fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
  };
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  // ── 1. Standard Photo Booth ──
  {
    id: 'standard-booth',
    name: 'Standard Photo Booth',
    description: 'Klassischer Booth-Ablauf: Start → Countdown → Foto → Vorschau → Teilen',
    icon: 'Camera',
    nodes: [
      makeNode('s1', 'TOUCH_TO_START', 'Touch to Start', 'animation', 0, 100, { triggerType: 'touch' }),
      makeNode('s2', 'LED_RING', 'LED Ring An', 'feature', 280, 100, { mode: 'start', color: '#ffffff' }),
      makeNode('s3', 'BEFORE_COUNTDOWN', 'Vorbereitung', 'animation', 560, 100, { animation: 'random', duration: 2 }),
      makeNode('s4', 'COUNTDOWN', 'Countdown', 'animation', 840, 100, { duration: 3, sound: true }),
      makeNode('s5', 'TAKE_PHOTO', 'Foto!', 'feature', 1120, 100, { captureMode: 'single', flash: true }),
      makeNode('s6', 'LED_RING', 'LED Ring Aus', 'feature', 1120, 280, { mode: 'stop' }),
      makeNode('s7', 'COMPLIMENT', 'Kompliment', 'animation', 840, 280, { animation: 'random' }),
      makeNode('s8', 'SELECTION_SCREEN', 'Auswahl', 'feature', 560, 280, { mode: 'step' },
        [{ id: 'default', label: 'Gewählt', type: 'default' }, { id: 'skip', label: 'Skip', type: 'skip' }]),
      makeNode('s9', 'SMS_SHARE', 'SMS', 'cloud', 280, 200, { mediaType: 'finalPhoto' }),
      makeNode('s10', 'EMAIL_SHARE', 'Email', 'cloud', 280, 360, { mediaType: 'finalPhoto' }),
      makeNode('s11', 'QR_CODE', 'QR Code', 'cloud', 0, 280, { mediaType: 'finalPhoto' }),
      makeNode('s12', 'AFTER_SHARE', 'Danke!', 'animation', 0, 440, { animation: 'thankyou' },
        [{ id: 'default', label: 'Fertig', type: 'default' }, { id: 'retake', label: 'Retake', type: 'retake' }]),
    ],
    edges: [
      makeEdge('s1', 's2'),
      makeEdge('s2', 's3'),
      makeEdge('s3', 's4'),
      makeEdge('s4', 's5'),
      makeEdge('s5', 's6'),
      makeEdge('s6', 's7'),
      makeEdge('s7', 's8'),
      makeEdge('s8', 's9', 'default'),
      makeEdge('s8', 's10', 'skip', 'Skip', 'skip'),
      makeEdge('s8', 's11', 'default'),
      makeEdge('s9', 's12'),
      makeEdge('s10', 's12'),
      makeEdge('s11', 's12'),
      makeEdge('s12', 's1', 'retake', 'Retake', 'retake'),
    ],
  },

  // ── 2. KI-Kunst Booth ──
  {
    id: 'ki-kunst-booth',
    name: 'KI-Kunst Booth',
    description: 'Photo Booth mit KI-Transformation: Foto → AI Modify → Teilen',
    icon: 'Wand2',
    nodes: [
      makeNode('k1', 'TOUCH_TO_START', 'Touch to Start', 'animation', 0, 150, { triggerType: 'touch' }),
      makeNode('k2', 'COUNTDOWN', 'Countdown', 'animation', 280, 150, { duration: 3 }),
      makeNode('k3', 'TAKE_PHOTO', 'Selfie!', 'feature', 560, 150, { captureMode: 'single', flash: true }),
      makeNode('k4', 'AI_MODIFY', 'KI-Kunst', 'cloud', 840, 150, { prompt: 'Transform into a renaissance painting', model: 'stylize' }),
      makeNode('k5', 'COMPLIMENT', 'Wow-Effekt', 'animation', 1120, 150, { animation: 'confetti' }),
      makeNode('k6', 'QR_CODE', 'QR Code', 'cloud', 1120, 330, { mediaType: 'finalPhoto' }),
      makeNode('k7', 'AFTER_SHARE', 'Danke!', 'animation', 840, 330, { animation: 'thankyou' },
        [{ id: 'default', label: 'Fertig', type: 'default' }, { id: 'retake', label: 'Retake', type: 'retake' }]),
    ],
    edges: [
      makeEdge('k1', 'k2'),
      makeEdge('k2', 'k3'),
      makeEdge('k3', 'k4'),
      makeEdge('k4', 'k5'),
      makeEdge('k5', 'k6'),
      makeEdge('k6', 'k7'),
      makeEdge('k7', 'k1', 'retake', 'Retake', 'retake'),
    ],
  },

  // ── 3. Mosaic Print Terminal ──
  {
    id: 'mosaic-print',
    name: 'Mosaic Print Terminal',
    description: 'Gast wählt Foto → Druckt Sticker → Klebt auf Mosaic Wall',
    icon: 'Printer',
    nodes: [
      makeNode('m1', 'TOUCH_TO_START', 'Willkommen', 'animation', 0, 150, { triggerType: 'touch' }),
      makeNode('m2', 'SELECTION_SCREEN', 'Foto wählen', 'feature', 280, 150, { mode: 'photo' },
        [{ id: 'default', label: 'Gewählt', type: 'default' }]),
      makeNode('m3', 'PRINT', 'Sticker drucken', 'hardware', 560, 150, { size: 'sticker', copies: 1, quality: 'high' }),
      makeNode('m4', 'BOOTH_DISPLAY', 'Position zeigen', 'hardware', 840, 150, { content: 'custom', displayMode: 'fullscreen' }),
      makeNode('m5', 'AFTER_SHARE', 'Viel Spaß!', 'animation', 1120, 150, { animation: 'confetti' }),
    ],
    edges: [
      makeEdge('m1', 'm2'),
      makeEdge('m2', 'm3'),
      makeEdge('m3', 'm4'),
      makeEdge('m4', 'm5'),
    ],
  },

  // ── 4. Foto-Spiel Booth ──
  {
    id: 'foto-spiel',
    name: 'Foto-Spiel Booth',
    description: 'Interaktiver Spielablauf: Challenge → Foto → Graffiti → Teilen',
    icon: 'Gamepad2',
    nodes: [
      makeNode('g1', 'TOUCH_TO_START', 'Los geht\'s!', 'animation', 0, 150, { triggerType: 'touch' }),
      makeNode('g2', 'FOTO_SPIEL', 'Challenge', 'feature', 280, 150, { gameType: 'random' }),
      makeNode('g3', 'COUNTDOWN', 'Countdown', 'animation', 560, 150, { duration: 5 }),
      makeNode('g4', 'TAKE_PHOTO', 'Foto!', 'feature', 840, 150, { captureMode: 'single' }),
      makeNode('g5', 'DIGITAL_GRAFFITI', 'Verzieren', 'feature', 1120, 150, { enableEmojis: true, maxDuration: 30 }),
      makeNode('g6', 'QR_CODE', 'QR Code', 'cloud', 1120, 330, { mediaType: 'finalPhoto' }),
      makeNode('g7', 'AFTER_SHARE', 'Gewonnen!', 'animation', 840, 330, { animation: 'fireworks' }),
    ],
    edges: [
      makeEdge('g1', 'g2'),
      makeEdge('g2', 'g3'),
      makeEdge('g3', 'g4'),
      makeEdge('g4', 'g5'),
      makeEdge('g5', 'g6'),
      makeEdge('g6', 'g7'),
    ],
  },

  // ── 5. Minimal (nur QR) ──
  {
    id: 'minimal-qr',
    name: 'Minimal QR-Only',
    description: 'Einfachster Flow: Foto → QR → Fertig',
    icon: 'QrCode',
    nodes: [
      makeNode('q1', 'TOUCH_TO_START', 'Start', 'animation', 0, 150),
      makeNode('q2', 'COUNTDOWN', '3...2...1', 'animation', 280, 150, { duration: 3 }),
      makeNode('q3', 'TAKE_PHOTO', 'Foto!', 'feature', 560, 150),
      makeNode('q4', 'QR_CODE', 'QR Code', 'cloud', 840, 150),
    ],
    edges: [
      makeEdge('q1', 'q2'),
      makeEdge('q2', 'q3'),
      makeEdge('q3', 'q4'),
    ],
  },
];

export function getPreset(id: string): WorkflowPreset | undefined {
  return WORKFLOW_PRESETS.find(p => p.id === id);
}
