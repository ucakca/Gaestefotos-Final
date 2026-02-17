import prisma from '../config/database';
import { logger } from '../utils/logger';
import { resolvePrompt, renderPrompt } from './promptTemplates';
import { withKnowledge } from './cache/knowledgeStore';
import { generateCompletion } from '../lib/groq';

// ─── GAME TYPES ─────────────────────────────────────────────────────────────

export type GameType =
  | 'compliment_mirror'
  | 'slot_machine'
  | 'mystery_overlay'
  | 'mimik_duell'
  | 'face_switch'
  | 'vows_and_views';

export interface GameConfig {
  type: GameType;
  name: string;
  description: string;
  icon: string;
  category: 'app' | 'booth' | 'guestbook';
  requiresBooth: boolean;
  requiresAI: boolean;
}

export const GAME_CATALOG: GameConfig[] = [
  {
    type: 'compliment_mirror',
    name: 'Compliment Mirror',
    description: 'Mach ein Selfie und erhalte ein KI-generiertes Kompliment!',
    icon: '🪞',
    category: 'app',
    requiresBooth: false,
    requiresAI: true,
  },
  {
    type: 'slot_machine',
    name: 'Virtual Slot Machine',
    description: 'Spin-Button → 3 Aufgaben/Props → 5 Sekunden um zu posieren!',
    icon: '🎰',
    category: 'booth',
    requiresBooth: true,
    requiresAI: false,
  },
  {
    type: 'mystery_overlay',
    name: 'Mystery Overlay',
    description: 'Blind posieren ohne Live-View — chaotische & lustige Ergebnisse!',
    icon: '🎭',
    category: 'booth',
    requiresBooth: true,
    requiresAI: false,
  },
  {
    type: 'mimik_duell',
    name: 'Mimik-Duell',
    description: 'Mimik-Wettbewerb mit KI-Score 0-100. Wer hat die beste Grimasse?',
    icon: '😜',
    category: 'booth',
    requiresBooth: true,
    requiresAI: true,
  },
  {
    type: 'face_switch',
    name: 'Face Switch',
    description: 'Gesichter in der Gruppe werden getauscht — ohne dass der Gast es vorher weiß!',
    icon: '🔄',
    category: 'booth',
    requiresBooth: true,
    requiresAI: true,
  },
  {
    type: 'vows_and_views',
    name: 'Vows & Views',
    description: 'Selfie + schriftliche Botschaft im Polaroid-Style. Digitales Gästebuch!',
    icon: '💌',
    category: 'guestbook',
    requiresBooth: false,
    requiresAI: false,
  },
];

// ─── SLOT MACHINE ───────────────────────────────────────────────────────────

const SLOT_PROPS = [
  'Superhelden-Pose', 'Gangster-Rap', 'Ballerina', 'Roboter',
  'Diva', 'Ninja', 'Zeitlupe', 'Rockstar', 'Zombie',
  'Selfie-Queen', 'Denker-Pose', 'Macarena', 'Moonwalk',
  'Titanic', 'Dabbing', 'Karate Kid', 'Modelposen',
  'Rückwärts-Selfie', 'Pyramide bauen', 'Freeze!',
];

const SLOT_ACCESSORIES = [
  'Sonnenbrille 🕶️', 'Schnurrbart 🥸', 'Krone 👑', 'Cowboyhut 🤠',
  'Feenflügel 🧚', 'Megafon 📢', 'Plüschtier 🧸', 'Konfetti 🎉',
  'Riesenhände 🖐️', 'Perücke 🎀', 'Superhelden-Cape 🦸', 'Luftgitarre 🎸',
];

const SLOT_CHALLENGES = [
  'In 3 Sek!', 'Mit geschlossenen Augen!', 'Rückwärts!',
  'Nur mit einer Hand!', 'Auf einem Bein!', 'In Superzeitlupe!',
  'Laut dazu singen!', 'Flüsternd!', 'Als Team!',
];

export function spinSlotMachine(): { prop: string; accessory: string; challenge: string } {
  return {
    prop: SLOT_PROPS[Math.floor(Math.random() * SLOT_PROPS.length)],
    accessory: SLOT_ACCESSORIES[Math.floor(Math.random() * SLOT_ACCESSORIES.length)],
    challenge: SLOT_CHALLENGES[Math.floor(Math.random() * SLOT_CHALLENGES.length)],
  };
}

// ─── COMPLIMENT MIRROR ──────────────────────────────────────────────────────

const COMPLIMENTS = [
  'Du strahlst heller als jeder Kronleuchter! ✨',
  'Wenn Lächeln ansteckend wäre, wärst du eine Pandemie! 😄',
  'Dein Style: 11 von 10 Sternen ⭐',
  'Die Kamera liebt dich — und wir auch! 📸',
  'Du siehst aus, als hättest du gerade das Internet gewonnen! 🏆',
  'Wenn du ein Selfie wärst, wärst du Insta-Worthy! 🔥',
  'Achtung: Übermäßige Attraktivität kann blenden! 😎',
  'Du bist der Grund, warum diese Party rockt! 🎉',
  'Vorsicht: Dein Charisma kann Rauchmelder auslösen! 🔥',
  'Du siehst aus wie das Finale eines Feuerwerks! 💥',
  'Style-Level: Runway-ready! 💃',
  'Dein Lächeln hat gerade die Tanzfläche erobert! 💪',
];

const VERDICTS = [
  '🏅 Party-MVP',
  '🌟 Style-Icon des Abends',
  '👑 Selfie-Königin/König',
  '🎭 Pose-Profi',
  '🔥 Hot & Ready',
  '💎 Diamant unter Gästen',
  '🦸 Superheld/in des Abends',
  '🎯 Treffer ins Schwarze',
];

export function generateCompliment(): { compliment: string; verdict: string } {
  return {
    compliment: COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)],
    verdict: VERDICTS[Math.floor(Math.random() * VERDICTS.length)],
  };
}

/**
 * LLM-powered Compliment Mirror — generates unique, personalized compliments.
 * Falls back to random hardcoded compliment if LLM fails.
 * Uses AI cache to avoid duplicate API calls for similar contexts.
 */
export const generateComplimentAI = withKnowledge<
  { eventType?: string; eventTitle?: string; guestName?: string; locale?: string },
  { compliment: string; verdict: string; source: 'ai' | 'fallback' }
>(
  'compliment-mirror',
  async ({ eventType, eventTitle, guestName, locale }) => {
    try {
      const prompt = await resolvePrompt('compliment_mirror');

      // Build context variables
      const eventContext = eventType
        ? ` Event-Typ: ${eventType}${eventTitle ? `, Titel: "${eventTitle}"` : ''}.`
        : '';
      const guestContext = guestName ? ` Gastname: ${guestName}.` : '';

      const systemPrompt = prompt.systemPrompt || FALLBACK_PROMPTS_CM.systemPrompt;
      const userPromptTpl = prompt.userPromptTpl || FALLBACK_PROMPTS_CM.userPromptTpl;

      const userPrompt = renderPrompt(userPromptTpl, {
        eventContext,
        guestContext,
      });

      const response = await generateCompletion(userPrompt, systemPrompt, {
        maxTokens: prompt.maxTokens || 150,
        temperature: prompt.temperature || 0.95,
      });

      // Parse JSON response
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.compliment && parsed.verdict) {
          return { compliment: parsed.compliment, verdict: parsed.verdict, source: 'ai' as const };
        }
      }

      // If parsing fails, use the whole response as compliment
      return {
        compliment: content.length > 200 ? content.substring(0, 200) + '...' : content,
        verdict: '🪞 KI-Kompliment',
        source: 'ai' as const,
      };
    } catch (error) {
      logger.warn('[ComplimentMirror] LLM failed, using fallback', {
        error: (error as Error).message,
      });
      const fallback = generateCompliment();
      return { ...fallback, source: 'fallback' as const };
    }
  },
  {
    fallback: () => {
      const result = generateCompliment();
      return { ...result, source: 'fallback' as const };
    },
  }
);

// Local constant for inline fallback prompt (avoids circular dependency)
const FALLBACK_PROMPTS_CM = {
  systemPrompt: `Du bist der "Compliment Mirror" — ein witziger, charmanter KI-Spiegel auf einer Party.
Ein Gast steht vor dir und hat gerade ein Selfie gemacht.
Deine Aufgabe: Gib dem Gast ein kreatives, lustiges Kompliment und ein witziges "Urteil" (Titel/Badge).

REGELN:
- Antworte NUR auf Deutsch
- Sei lustig, charmant und übertrieben positiv
- Nutze 1-2 passende Emojis
- Das Kompliment soll max 2 Sätze sein
- Das Urteil soll ein kurzer, lustiger Titel sein (z.B. "Party-MVP 🏅" oder "Selfie-Königin 👑")
- Variiere stark — nie das gleiche Kompliment zweimal
- Antworte NUR als JSON: {"compliment": "...", "verdict": "..."}
- Wenn ein Event-Typ gegeben ist, passe das Kompliment an den Kontext an`,
  userPromptTpl: 'Gib dem Gast ein kreatives Kompliment.{{eventContext}}{{guestContext}}',
};

// ─── MIMIK-DUELL ────────────────────────────────────────────────────────────

const MIMIK_CHALLENGES = [
  { emoji: '😱', name: 'Überrascht', description: 'Zeig dein bestes überraschtes Gesicht!' },
  { emoji: '😡', name: 'Wütend', description: 'So wütend wie möglich — aber lustig!' },
  { emoji: '🥺', name: 'Traurig', description: 'Das traurigste Hundeblick-Gesicht!' },
  { emoji: '😂', name: 'Lachend', description: 'So heftig lachen wie noch nie!' },
  { emoji: '🤔', name: 'Nachdenklich', description: 'Das nachdenklichste Philosophen-Gesicht!' },
  { emoji: '😎', name: 'Cool', description: 'So cool wie ein Eiswürfel in der Sonne!' },
  { emoji: '🤪', name: 'Verrückt', description: 'Die verrückteste Grimasse ever!' },
  { emoji: '😏', name: 'Schmunzelnd', description: 'Das verschmitzteste Grinsen!' },
  { emoji: '🥳', name: 'Party', description: 'Party-Gesicht Maximum Level!' },
  { emoji: '🤩', name: 'Begeistert', description: 'Als ob du gerade im Lotto gewonnen hast!' },
];

export function getRandomMimikChallenge(): typeof MIMIK_CHALLENGES[0] {
  return MIMIK_CHALLENGES[Math.floor(Math.random() * MIMIK_CHALLENGES.length)];
}

// Simple score based on randomness (real AI scoring would use face-api.js expression detection)
export function scoreMimik(): number {
  // In production: use face-api.js to detect expressions and score accuracy
  // For now: weighted random with tendency towards high scores for fun
  const base = 60 + Math.floor(Math.random() * 30); // 60-89
  const bonus = Math.random() > 0.7 ? Math.floor(Math.random() * 11) : 0; // 10% chance of 90-100
  return Math.min(100, base + bonus);
}

// ─── MYSTERY OVERLAY ────────────────────────────────────────────────────────

const OVERLAYS = [
  { id: 'crown', name: 'Krone', category: 'royal' },
  { id: 'mustache', name: 'Schnurrbart', category: 'funny' },
  { id: 'sunglasses', name: 'Sonnenbrille', category: 'cool' },
  { id: 'heart-frame', name: 'Herz-Rahmen', category: 'love' },
  { id: 'party-hat', name: 'Partyhut', category: 'party' },
  { id: 'flower-crown', name: 'Blumenkranz', category: 'nature' },
  { id: 'devil-horns', name: 'Teufelshörner', category: 'funny' },
  { id: 'angel-halo', name: 'Heiligenschein', category: 'angel' },
  { id: 'pirate', name: 'Piraten-Set', category: 'adventure' },
  { id: 'stars', name: 'Sternchen-Regen', category: 'sparkle' },
];

export function getRandomOverlay(): typeof OVERLAYS[0] {
  return OVERLAYS[Math.floor(Math.random() * OVERLAYS.length)];
}

// ─── GAME SESSION MANAGEMENT ────────────────────────────────────────────────

export interface GameSession {
  id: string;
  eventId: string;
  gameType: GameType;
  data: any;
  score?: number;
  createdAt: Date;
}

// In-memory store for active game sessions (could be Redis in production)
const activeSessions = new Map<string, GameSession>();

export function createGameSession(eventId: string, gameType: GameType, data: any): GameSession {
  const session: GameSession = {
    id: crypto.randomUUID(),
    eventId,
    gameType,
    data,
    createdAt: new Date(),
  };
  activeSessions.set(session.id, session);

  // Auto-cleanup after 10 minutes
  setTimeout(() => activeSessions.delete(session.id), 10 * 60 * 1000);

  return session;
}

export function getGameSession(sessionId: string): GameSession | undefined {
  return activeSessions.get(sessionId);
}

export function updateGameSession(sessionId: string, updates: Partial<GameSession>): GameSession | undefined {
  const session = activeSessions.get(sessionId);
  if (!session) return undefined;
  Object.assign(session, updates);
  return session;
}
