import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helper: Create ReactFlow node ───────────────────────────────────────────

const STEP_STYLES: Record<string, { color: string; bgColor: string; borderColor: string; icon: string; category: string }> = {
  TOUCH_TO_START:        { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Hand', category: 'animation' },
  BEFORE_COUNTDOWN:      { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Sparkles', category: 'animation' },
  COUNTDOWN:             { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Timer', category: 'animation' },
  COMPLIMENT:            { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'Heart', category: 'animation' },
  AFTER_SHARE:           { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', icon: 'PartyPopper', category: 'animation' },
  LED_RING:              { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Lightbulb', category: 'feature' },
  TAKE_PHOTO:            { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Camera', category: 'feature' },
  SELECTION_SCREEN:      { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'LayoutGrid', category: 'feature' },
  FOTO_SPIEL:            { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Gamepad2', category: 'feature' },
  DIGITAL_GRAFFITI:      { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', icon: 'Pen', category: 'feature' },
  AI_MODIFY:             { color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-300', icon: 'Wand2', category: 'ai' },
  AI_FACE_SWITCH:        { color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-300', icon: 'Shuffle', category: 'ai' },
  SMS_SHARE:             { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'MessageSquare', category: 'cloud' },
  EMAIL_SHARE:           { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'Mail', category: 'cloud' },
  QR_CODE:               { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'QrCode', category: 'cloud' },
  FACE_SEARCH:           { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: 'ScanFace', category: 'cloud' },
  PRINT:                 { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', icon: 'Printer', category: 'hardware' },
  BOOTH_DISPLAY:         { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', icon: 'Monitor', category: 'hardware' },
  TRIGGER_PHOTO_UPLOAD:  { color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', icon: 'Upload', category: 'trigger' },
  TRIGGER_QR_SCAN:       { color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', icon: 'QrCode', category: 'trigger' },
  TRIGGER_TIMER:         { color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', icon: 'Clock', category: 'trigger' },
  TRIGGER_MANUAL:        { color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', icon: 'MousePointerClick', category: 'trigger' },
  TRIGGER_EVENT_STATE:   { color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300', icon: 'Flag', category: 'trigger' },
  CONDITION:             { color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300', icon: 'GitBranch', category: 'logic' },
  DELAY:                 { color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300', icon: 'Timer', category: 'logic' },
  LOOP:                  { color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300', icon: 'Repeat', category: 'logic' },
};

type OutputDef = { id: string; label: string; type: string };

function node(
  id: string, type: string, label: string, x: number, y: number,
  config: Record<string, any> = {},
  outputs: OutputDef[] = [{ id: 'default', label: '', type: 'default' }],
  stepNumber = 0
) {
  const s = STEP_STYLES[type] || STEP_STYLES.TAKE_PHOTO;
  return {
    id, type: 'workflowStep', position: { x, y },
    data: { type, label, category: s.category, stepNumber, config, color: s.color, bgColor: s.bgColor, borderColor: s.borderColor, icon: s.icon, outputs },
  };
}

function edge(source: string, target: string, sourceHandle = 'default', label?: string, edgeType?: string) {
  return {
    id: `e-${source}-${target}-${sourceHandle}`,
    source, target, sourceHandle,
    animated: edgeType === 'skip' || edgeType === 'retake',
    style: { stroke: edgeType === 'skip' ? '#eab308' : edgeType === 'retake' ? '#ef4444' : '#94a3b8', strokeWidth: 2 },
    label: label || undefined,
    labelStyle: { fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
  };
}

// ─── Workflow definitions ────────────────────────────────────────────────────

const defaultWorkflows = [

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLEMENTIERTE FLOWS (exakt nach aktuellem Code auf app.gästefotos.com)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. Upload Flow (UploadModal.tsx) ──
  // Echte Logik: Name eingeben → Album wählen (opt) → Fotos per Drag&Drop → Validierung → Upload → Fertig
  {
    name: 'Upload Flow',
    description: 'Gast-Upload: Name → Album (opt) → Fotos auswählen → Validierung (JPG/PNG/WebP/HEIC, max 50MB) → Upload mit Progress → Fertig',
    flowType: 'UPLOAD',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('u1', 'TRIGGER_MANUAL', 'Kamera-Button', 0, 100, { buttonLabel: 'Foto aufnehmen' }),
        node('u2', 'DIGITAL_GRAFFITI', 'Name eingeben', 280, 100, { enableText: true, placeholder: 'Dein Name *' }),
        node('u3', 'SELECTION_SCREEN', 'Album wählen', 560, 100, { mode: 'step' },
          [{ id: 'default', label: 'Weiter', type: 'default' }]),
        node('u4', 'TAKE_PHOTO', 'Fotos auswählen', 840, 100, { captureMode: 'multi', maxFiles: 10 }),
        node('u5', 'CONDITION', 'Dateityp OK?', 1120, 100, { field: 'file_type', operator: 'contains', value: 'image/' },
          [{ id: 'then', label: 'Ja', type: 'default' }, { id: 'else', label: 'Ungültig', type: 'conditional' }]),
        node('u6', 'CONDITION', 'Größe ≤ 50MB?', 1400, 50, { field: 'file_size', operator: 'less_than', value: '52428800' },
          [{ id: 'then', label: 'OK', type: 'default' }, { id: 'else', label: 'Zu groß', type: 'conditional' }]),
        node('u7', 'AFTER_SHARE', 'Upload + Progress', 1680, 50, { animation: 'single' }),
        node('u8', 'AFTER_SHARE', 'Fehler anzeigen', 1400, 220, { animation: 'error' }),
      ],
      edges: [
        edge('u1','u2'), edge('u2','u3'), edge('u3','u4'), edge('u4','u5'),
        edge('u5','u6','then'), edge('u5','u8','else','Ungültig','skip'),
        edge('u6','u7','then'), edge('u6','u8','else','Zu groß','skip'),
      ],
    },
  },

  // ── 2. Gästebuch Flow (GuestbookTab.tsx) ──
  // Echte Logik: Ein Formular: Name (Pflicht) + Nachricht (Pflicht) + Foto (OPTIONAL) → Absenden
  // Kein Auswahlscreen — Foto ist einfach optional im selben Formular
  {
    name: 'Gästebuch Flow',
    description: 'Digitales Gästebuch: Name (Pflicht) → Nachricht (Pflicht) → Foto optional hinzufügen → Absenden',
    flowType: 'GUESTBOOK',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('gb1', 'TRIGGER_MANUAL', 'Gästebuch-Tab', 0, 100, { buttonLabel: 'Eintrag schreiben' }),
        node('gb2', 'DIGITAL_GRAFFITI', 'Name eingeben', 280, 100, { enableText: true, placeholder: 'Dein Name *', required: true }),
        node('gb3', 'DIGITAL_GRAFFITI', 'Nachricht schreiben', 560, 100, { enableText: true, enableEmojis: true, placeholder: 'Glückwünsche...', required: true }),
        node('gb4', 'CONDITION', 'Foto hinzufügen?', 840, 100, { field: 'user_choice', operator: 'equals', value: 'yes' },
          [{ id: 'then', label: 'Ja (optional)', type: 'default' }, { id: 'else', label: 'Ohne Foto', type: 'conditional' }]),
        node('gb5', 'TAKE_PHOTO', 'Foto/Selfie', 1120, 0, { captureMode: 'single', mirror: true, source: 'camera_or_gallery' }),
        node('gb6', 'AFTER_SHARE', 'Nachricht senden', 1120, 200, { animation: 'stamp' }),
      ],
      edges: [
        edge('gb1','gb2'), edge('gb2','gb3'), edge('gb3','gb4'),
        edge('gb4','gb5','then'), edge('gb4','gb6','else','Ohne Foto','skip'),
        edge('gb5','gb6'),
      ],
    },
  },

  // ── 3. Face Search Flow (FaceSearch.tsx) ──
  // Echte Logik: Einwilligung (Checkbox) → Selfie ODER Foto hochladen → Suche → Ergebnis-Grid → Neues Foto oder fertig
  {
    name: 'Face Search Flow',
    description: 'Gesichtserkennung: Einwilligung (biometrisch) → Selfie oder Foto-Upload → Suche → Ergebnis-Grid (mit %-Ähnlichkeit)',
    flowType: 'FACE_SEARCH',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('f1', 'TRIGGER_MANUAL', '"Finde mein Foto"', 0, 100, { buttonLabel: 'Finde Bilder von mir' }),
        node('f2', 'CONDITION', 'Einwilligung erteilt?', 280, 100, { field: 'has_consent', operator: 'is_true', value: '' },
          [{ id: 'then', label: 'Ja', type: 'default' }, { id: 'else', label: 'Nein → Abbruch', type: 'conditional' }]),
        node('f3', 'SELECTION_SCREEN', 'Selfie oder Upload', 560, 50, { mode: 'step' },
          [{ id: 'selfie', label: 'Selfie aufnehmen', type: 'default' }, { id: 'upload', label: 'Foto hochladen', type: 'conditional' }]),
        node('f4', 'TAKE_PHOTO', 'Selfie aufnehmen', 840, 0, { captureMode: 'single', mirror: true, facingMode: 'user' }),
        node('f5', 'TAKE_PHOTO', 'Foto hochladen', 840, 160, { captureMode: 'single', source: 'gallery' }),
        node('f6', 'FACE_SEARCH', 'Fotos suchen', 1120, 80, { minSimilarity: 0.6 }),
        node('f7', 'SELECTION_SCREEN', 'Ergebnis-Grid', 1400, 80, { mode: 'photo', showSimilarity: true }),
        node('f8', 'AFTER_SHARE', 'Fertig', 1400, 250, { animation: 'single' },
          [{ id: 'default', label: 'Schließen', type: 'default' }, { id: 'retake', label: 'Neues Foto', type: 'retake' }]),
      ],
      edges: [
        edge('f1','f2'),
        edge('f2','f3','then'), edge('f2','f8','else','Abbruch','skip'),
        edge('f3','f4','selfie'), edge('f3','f5','upload','Upload','skip'),
        edge('f4','f6'), edge('f5','f6'),
        edge('f6','f7'), edge('f7','f8'),
        edge('f8','f3','retake','Neues Foto','retake'),
      ],
    },
  },

  // ── 4. Foto-Spaß / Challenges Flow (ChallengesTab.tsx + BottomNav.tsx) ──
  // Echte Logik: Challenge-Liste → Card antippen → Upload-Modal (mit challengeId) → Selfie → Upload
  // Spiel-Typen: PHOTOBOMB, COVER_SHOOT, EMOJI_CHALLENGE, FILTER_ROULETTE
  {
    name: 'Foto-Spaß Flow',
    description: 'Foto-Spaß Hub: Challenge-Liste (Spiele + Photo) → Challenge wählen → Selfie machen → Upload mit Challenge-Badge',
    flowType: 'FOTO_SPIEL',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('g1', 'TRIGGER_MANUAL', 'Foto-Spaß Tab', 0, 100, { buttonLabel: 'Foto-Spaß' }),
        node('g2', 'SELECTION_SCREEN', 'Challenge wählen', 280, 100, { mode: 'step', games: 'PHOTOBOMB,COVER_SHOOT,EMOJI_CHALLENGE,FILTER_ROULETTE,PHOTO' }),
        node('g3', 'DIGITAL_GRAFFITI', 'Name eingeben', 560, 100, { enableText: true, placeholder: 'Dein Name *' }),
        node('g4', 'TAKE_PHOTO', 'Selfie machen', 840, 100, { captureMode: 'single', mirror: true }),
        node('g5', 'AFTER_SHARE', 'Upload + Badge', 1120, 100, { animation: 'confetti' }),
      ],
      edges: [
        edge('g1','g2'), edge('g2','g3'), edge('g3','g4'), edge('g4','g5'),
      ],
    },
  },

  // ── 5. KI Foto-Stil Flow (via Kamera Action Sheet) ──
  // Echte Logik: Action Sheet "KI Foto-Stil" → Upload-Modal öffnet sich mit challengeTitle='KI Foto-Stil'
  // Aktuell gleicher Flow wie normaler Upload, aber mit KI-Badge
  {
    name: 'KI Foto-Stil Flow',
    description: 'KI-Kunst aus Kamera-Menü: Foto aufnehmen → wird als "KI Foto-Stil" Challenge hochgeladen',
    flowType: 'KI_KUNST',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('ki1', 'TRIGGER_MANUAL', 'KI Foto-Stil', 0, 100, { buttonLabel: 'KI Foto-Stil' }),
        node('ki2', 'DIGITAL_GRAFFITI', 'Name eingeben', 280, 100, { enableText: true, placeholder: 'Dein Name *' }),
        node('ki3', 'TAKE_PHOTO', 'Selfie machen', 560, 100, { captureMode: 'single', mirror: true }),
        node('ki4', 'AFTER_SHARE', 'Upload (KI)', 840, 100, { animation: 'sparkle' }),
      ],
      edges: [
        edge('ki1','ki2'), edge('ki2','ki3'), edge('ki3','ki4'),
      ],
    },
  },

  // ── 6. Mosaic Print Terminal Flow (print-terminal/t/[slug]/page.tsx) ──
  // Echte Logik: IDLE → PIN oder QR → Lookup → Preview → Print → DONE (Auto-Reset 30s)
  {
    name: 'Mosaic Print Terminal',
    description: 'Print Terminal: Idle → Code eingeben ODER QR scannen → Foto-Vorschau → Drucken (300 DPI) → Position anzeigen → Reset',
    flowType: 'MOSAIC',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('pt1', 'TOUCH_TO_START', 'IDLE: Sticker drucken', 0, 100, { triggerType: 'touch' }),
        node('pt2', 'SELECTION_SCREEN', 'Eingabemethode', 280, 100, { mode: 'step' },
          [{ id: 'pin', label: 'Code eingeben', type: 'default' }, { id: 'qr', label: 'QR scannen', type: 'conditional' }]),
        node('pt3', 'DIGITAL_GRAFFITI', 'PIN: 4-stellig', 560, 0, { enableText: true, maxLength: 4, placeholder: '____' }),
        node('pt4', 'TAKE_PHOTO', 'QR scannen', 560, 200, { captureMode: 'qr_scan', facingMode: 'environment' }),
        node('pt5', 'CONDITION', 'Code gültig?', 840, 100, { field: 'pin_valid', operator: 'is_true', value: '' },
          [{ id: 'then', label: 'Ja', type: 'default' }, { id: 'else', label: 'Ungültig', type: 'conditional' }]),
        node('pt6', 'SELECTION_SCREEN', 'Foto-Vorschau', 1120, 50, { mode: 'photo' },
          [{ id: 'default', label: 'Jetzt drucken!', type: 'default' }, { id: 'skip', label: 'Abbrechen', type: 'skip' }]),
        node('pt7', 'PRINT', 'Wird gedruckt...', 1400, 50, { dpi: 300 }),
        node('pt8', 'AFTER_SHARE', 'Fertig! Position anzeigen', 1400, 220, { animation: 'confetti' }),
        node('pt9', 'DELAY', 'Auto-Reset 30s', 1120, 220, { duration: 30, unit: 'seconds' }),
        node('pt10', 'AFTER_SHARE', 'Fehler: Code ungültig', 840, 250, { animation: 'error' }),
      ],
      edges: [
        edge('pt1','pt2'),
        edge('pt2','pt3','pin'), edge('pt2','pt4','qr','QR','skip'),
        edge('pt3','pt5'), edge('pt4','pt5'),
        edge('pt5','pt6','then'), edge('pt5','pt10','else','Ungültig','skip'),
        edge('pt6','pt7','default'), edge('pt6','pt1','skip','Abbruch','skip'),
        edge('pt7','pt8'), edge('pt8','pt9'),
        edge('pt9','pt1'), edge('pt10','pt1'),
      ],
    },
  },

  // ── 7. Kamera Action Sheet (BottomNav.tsx) ──
  // Echte Logik: Kamera-Button → 4 Optionen: Foto aufnehmen, Foto-Spiel, KI Foto-Stil, Finde mein Foto
  {
    name: 'Kamera Action Sheet',
    description: 'Kamera-Button Menü: 4 Aktionen → Foto aufnehmen / Foto-Spiel / KI Foto-Stil / Finde mein Foto',
    flowType: 'CUSTOM',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('cam1', 'TRIGGER_MANUAL', 'Kamera-Button (Mitte)', 0, 150, { buttonLabel: 'Kamera' }),
        node('cam2', 'SELECTION_SCREEN', 'Was möchtest du tun?', 280, 150, { mode: 'step' },
          [{ id: 'photo', label: 'Foto aufnehmen', type: 'default' },
           { id: 'game', label: 'Foto-Spiel', type: 'conditional' },
           { id: 'ki', label: 'KI Foto-Stil', type: 'conditional' },
           { id: 'face', label: 'Finde mein Foto', type: 'skip' }]),
        node('cam3', 'AFTER_SHARE', '→ Upload Modal', 560, 0, { animation: 'single' }),
        node('cam4', 'AFTER_SHARE', '→ Foto-Spaß Tab', 560, 100, { animation: 'single' }),
        node('cam5', 'AFTER_SHARE', '→ Upload (KI Badge)', 560, 200, { animation: 'sparkle' }),
        node('cam6', 'AFTER_SHARE', '→ Face Search', 560, 300, { animation: 'single' }),
      ],
      edges: [
        edge('cam1','cam2'),
        edge('cam2','cam3','photo'), edge('cam2','cam4','game','Spiel','skip'),
        edge('cam2','cam5','ki','KI','skip'), edge('cam2','cam6','face','Face','skip'),
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HARDWARE-VORLAGEN (noch nicht implementiert — Electron/Booth-Software TBD)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 8. Photo Booth Vorlage (Hardware — noch nicht im Code) ──
  {
    name: 'Photo Booth (Vorlage)',
    description: '⚠️ VORLAGE — Hardware noch nicht implementiert. Klassischer Booth: Touch → Countdown → Foto → Share',
    flowType: 'BOOTH',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('b1', 'TOUCH_TO_START', 'Touch to Start', 0, 100, { triggerType: 'touch' }),
        node('b2', 'LED_RING', 'LED Ring', 280, 100, { mode: 'start', color: '#ffffff' }),
        node('b3', 'COUNTDOWN', 'Countdown', 560, 100, { duration: 3, sound: true }),
        node('b4', 'TAKE_PHOTO', 'Foto!', 840, 100, { captureMode: 'single', flash: true }),
        node('b5', 'SELECTION_SCREEN', 'Vorschau', 1120, 100, { mode: 'photo' },
          [{ id: 'default', label: 'OK', type: 'default' }, { id: 'retake', label: 'Nochmal', type: 'retake' }]),
        node('b6', 'QR_CODE', 'QR zum Teilen', 1400, 100, {}),
        node('b7', 'AFTER_SHARE', 'Danke!', 1400, 280, { animation: 'confetti' }),
      ],
      edges: [
        edge('b1','b2'), edge('b2','b3'), edge('b3','b4'), edge('b4','b5'),
        edge('b5','b6','default'), edge('b5','b3','retake','Nochmal','retake'),
        edge('b6','b7'),
      ],
    },
  },

  // ── 9. Mirror Booth Vorlage (Hardware — noch nicht im Code) ──
  {
    name: 'Mirror Booth (Vorlage)',
    description: '⚠️ VORLAGE — Hardware noch nicht implementiert. Mirror Booth mit Kompliment und Graffiti',
    flowType: 'MIRROR_BOOTH',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('mb1', 'TOUCH_TO_START', 'Attract Screen', 0, 100, { triggerType: 'motion' }),
        node('mb2', 'COMPLIMENT', 'Kompliment', 280, 100, { animation: 'typewriter' }),
        node('mb3', 'COUNTDOWN', 'Countdown', 560, 100, { duration: 3 }),
        node('mb4', 'TAKE_PHOTO', 'Foto!', 840, 100, { captureMode: 'single', flash: true, mirror: true }),
        node('mb5', 'DIGITAL_GRAFFITI', 'Graffiti/Emojis', 1120, 100, { enableEmojis: true }),
        node('mb6', 'QR_CODE', 'QR Code', 1120, 280, {}),
        node('mb7', 'PRINT', 'Drucken', 1400, 100, {}),
        node('mb8', 'AFTER_SHARE', 'Danke!', 1400, 280, { animation: 'confetti' }),
      ],
      edges: [
        edge('mb1','mb2'), edge('mb2','mb3'), edge('mb3','mb4'), edge('mb4','mb5'),
        edge('mb5','mb6'), edge('mb5','mb7'), edge('mb6','mb8'), edge('mb7','mb8'),
      ],
    },
  },

  // ── 10. KI Booth Vorlage (Hardware — noch nicht im Code) ──
  {
    name: 'KI Booth (Vorlage)',
    description: '⚠️ VORLAGE — Hardware noch nicht implementiert. KI-Transformation am Booth-Touchscreen',
    flowType: 'KI_BOOTH',
    isSystem: true, isLocked: true, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('kb1', 'TOUCH_TO_START', 'Start', 0, 100, { triggerType: 'touch' }),
        node('kb2', 'SELECTION_SCREEN', 'Stil wählen', 280, 100, { mode: 'filter' }),
        node('kb3', 'COUNTDOWN', 'Countdown', 560, 100, { duration: 3 }),
        node('kb4', 'TAKE_PHOTO', 'Foto!', 840, 100, { flash: false }),
        node('kb5', 'AI_MODIFY', 'KI-Transformation', 1120, 100, { prompt: 'Style transfer', strength: 0.7 }),
        node('kb6', 'QR_CODE', 'QR Code', 1120, 280, {}),
        node('kb7', 'AFTER_SHARE', 'Danke!', 840, 280, { animation: 'confetti' }),
      ],
      edges: [
        edge('kb1','kb2'), edge('kb2','kb3'), edge('kb3','kb4'), edge('kb4','kb5'),
        edge('kb5','kb6'), edge('kb6','kb7'),
      ],
    },
  },

  // ── 11. Leere Vorlage ──
  {
    name: 'Leere Vorlage',
    description: 'Leere Vorlage als Startpunkt für eigene Workflows',
    flowType: 'CUSTOM',
    isSystem: true, isLocked: false, isDefault: true, isPublic: true,
    steps: {
      nodes: [
        node('tpl1', 'TRIGGER_MANUAL', 'Start', 0, 100, { buttonLabel: 'Workflow starten' }),
        node('tpl2', 'AFTER_SHARE', 'Ende', 280, 100, { animation: 'single' }),
      ],
      edges: [
        edge('tpl1','tpl2'),
      ],
    },
  },
];

export async function seedWorkflows() {
  console.log('🔄 Seeding workflows...');

  for (const workflow of defaultWorkflows) {
    const existing = await prisma.boothWorkflow.findFirst({
      where: {
        name: workflow.name,
        isSystem: true,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Workflow "${workflow.name}" existiert bereits`);
      continue;
    }

    await prisma.boothWorkflow.create({
      data: {
        name: workflow.name,
        description: workflow.description,
        flowType: workflow.flowType as any,
        isSystem: workflow.isSystem,
        isLocked: workflow.isLocked,
        isDefault: workflow.isDefault,
        isPublic: workflow.isPublic,
        steps: workflow.steps,
        version: 1,
      },
    });

    console.log(`  ✅ Workflow "${workflow.name}" erstellt`);
  }

  console.log('✅ Workflows seeding complete');
}

// Run directly if called as script
if (require.main === module) {
  seedWorkflows()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
