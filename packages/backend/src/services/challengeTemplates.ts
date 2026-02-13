/**
 * Predefined Booth Games (Kategorie A: Smartphone-basiert, kein Booth nötig)
 *
 * These are ready-to-use challenge templates that hosts can add with one click.
 * All are designed for smartphone use by event guests.
 */

export interface ChallengeTemplate {
  id: string;
  type: 'PHOTO' | 'PHOTOBOMB' | 'COVER_SHOOT' | 'EMOJI_CHALLENGE' | 'FILTER_ROULETTE';
  title: string;
  description: string;
  icon: string;
  category: 'game' | 'classic';
  difficulty: 'easy' | 'medium' | 'hard';
  gameConfig: Record<string, any>;
  tags: string[];
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ─── Kategorie A: Smartphone-Spiele ────────────────────────────
  {
    id: 'photobomb',
    type: 'PHOTOBOMB',
    title: 'Der Fotobomber',
    description: 'Schmuggle dich in 3 Fotos anderer Gäste! Die lustigste Fotobombe gewinnt.',
    icon: 'bomb',
    category: 'game',
    difficulty: 'medium',
    gameConfig: {
      requiredPhotos: 3,
      useFaceSearch: true,
      scoringMode: 'vote',
    },
    tags: ['fun', 'social', 'interactive'],
  },
  {
    id: 'emoji-challenge',
    type: 'EMOJI_CHALLENGE',
    title: 'Emoji-Challenge',
    description: 'Stelle das angezeigte Emoji mit deinem Gesicht nach und mach ein Selfie!',
    icon: 'smile-plus',
    category: 'game',
    difficulty: 'easy',
    gameConfig: {
      emojis: ['😂', '😱', '🤔', '😍', '🤪', '😎', '🥳', '😤', '🤯', '🥺'],
      scoringMode: 'vote',
      selfieRequired: true,
    },
    tags: ['selfie', 'fun', 'easy'],
  },
  {
    id: 'filter-roulette',
    type: 'FILTER_ROULETTE',
    title: 'Filter-Roulette',
    description: 'Mach ein Selfie — ein zufälliger KI-Effekt wird darauf angewendet! Überraschung!',
    icon: 'sparkles',
    category: 'game',
    difficulty: 'easy',
    gameConfig: {
      filters: ['oil-painting', 'pop-art', 'cartoon', 'vintage', 'neon-glow', 'anime'],
      selfieRequired: true,
      randomFilter: true,
    },
    tags: ['creative', 'selfie', 'surprise'],
  },
  {
    id: 'cover-shoot',
    type: 'COVER_SHOOT',
    title: 'Das Cover-Shooting',
    description: 'Posiere für dein eigenes Magazin-Cover! Wähle ein Magazin und schieße das perfekte Cover-Foto.',
    icon: 'book-open',
    category: 'game',
    difficulty: 'easy',
    gameConfig: {
      overlays: [
        { name: 'VOGUE', color: '#000000', textColor: '#ffffff' },
        { name: 'GQ', color: '#1a1a2e', textColor: '#e0c097' },
        { name: 'Rolling Stone', color: '#cc0000', textColor: '#ffffff' },
        { name: 'TIME', color: '#e4002b', textColor: '#ffffff' },
        { name: 'National Geographic', color: '#ffcc00', textColor: '#000000' },
      ],
      scoringMode: 'vote',
    },
    tags: ['creative', 'selfie', 'fun'],
  },

  // ─── Klassische Foto-Challenges ────────────────────────────────
  {
    id: 'best-smile',
    type: 'PHOTO',
    title: 'Das schönste Lächeln',
    description: 'Zeig dein strahlendstes Lächeln!',
    icon: 'smile',
    category: 'classic',
    difficulty: 'easy',
    gameConfig: {},
    tags: ['selfie', 'easy'],
  },
  {
    id: 'funny-face',
    type: 'PHOTO',
    title: 'Das lustigste Gesicht',
    description: 'Wer kann die lustigste Grimasse schneiden?',
    icon: 'laugh',
    category: 'classic',
    difficulty: 'easy',
    gameConfig: {},
    tags: ['fun', 'selfie'],
  },
  {
    id: 'group-selfie',
    type: 'PHOTO',
    title: 'Gruppen-Selfie',
    description: 'Mache ein Selfie mit mindestens 5 Personen!',
    icon: 'users',
    category: 'classic',
    difficulty: 'medium',
    gameConfig: { minPeople: 5 },
    tags: ['group', 'social'],
  },
  {
    id: 'dance-floor',
    type: 'PHOTO',
    title: 'Tanzflächen-Action',
    description: 'Fange den besten Tanzmoment ein!',
    icon: 'music',
    category: 'classic',
    difficulty: 'easy',
    gameConfig: {},
    tags: ['party', 'action'],
  },
  {
    id: 'secret-handshake',
    type: 'PHOTO',
    title: 'Der geheime Handschlag',
    description: 'Erfinde mit einem Fremden einen geheimen Handschlag und fotografiert das Ergebnis!',
    icon: 'handshake',
    category: 'classic',
    difficulty: 'medium',
    gameConfig: {},
    tags: ['social', 'creative'],
  },
  {
    id: 'mirror-selfie',
    type: 'PHOTO',
    title: 'Spiegel-Selfie',
    description: 'Finde einen kreativen Spiegel für ein einzigartiges Selfie!',
    icon: 'image',
    category: 'classic',
    difficulty: 'easy',
    gameConfig: {},
    tags: ['creative', 'selfie'],
  },
];

export function getTemplateById(id: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find(t => t.id === id);
}

export function getGameTemplates(): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.category === 'game');
}

export function getClassicTemplates(): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.category === 'classic');
}
