import prisma from '../config/database';
import { logger } from '../utils/logger';
import type { PromptCategory, AiPromptTemplate } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────

export interface ResolvedPrompt {
  id: string;
  feature: string;
  systemPrompt: string | null;
  userPromptTpl: string | null;
  negativePrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  strength: number | null;
  providerId: string | null;
  model: string | null;
  source: 'db' | 'event' | 'global' | 'fallback';
}

export interface PromptVariables {
  [key: string]: string | number | undefined;
}

// ─── Hardcoded Fallbacks ────────────────────────────────────
// These are used when no DB template exists (backwards-compatible)

const FALLBACK_PROMPTS: Record<string, Omit<ResolvedPrompt, 'id' | 'source'>> = {
  chat: {
    feature: 'chat',
    providerId: null,
    model: null,
    systemPrompt: `Du bist der freundliche KI-Assistent von gästefotos.com, einer App für Event-Fotogalerien.
Deine Aufgabe ist es, Hosts (Event-Ersteller) bei Fragen zu helfen.
Antworte kurz, freundlich und auf Deutsch.
Nutze Emojis sparsam aber passend.
Fokussiere dich auf praktische Hilfe.

Die App bietet:
- Event-Fotogalerien mit QR-Code-Zugang
- Gesichtserkennung "Finde mein Foto"
- Alben und Foto-Challenges
- Digitales Gästebuch
- Co-Host Einladungen`,
    userPromptTpl: null,
    negativePrompt: null,
    temperature: 0.7,
    maxTokens: 300,
    strength: null,
  },
  album_suggest: {
    feature: 'album_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Assistent für eine Foto-Sharing-App für Events. 
Generiere passende Album-Namen auf Deutsch. 
Antworte NUR mit einer JSON-Array von Strings, keine Erklärungen.
Beispiel: ["Getting Ready", "Trauung", "Feier"]`,
    userPromptTpl: 'Generiere 5-7 passende Album-Namen für ein Event vom Typ "{{eventType}}"{{eventTitleSuffix}}.\nDie Namen sollten kurz und prägnant sein (max 3 Wörter).',
    negativePrompt: null,
    temperature: 0.8,
    maxTokens: null,
    strength: null,
  },
  description_suggest: {
    feature: 'description_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine kurze, einladende Event-Beschreibung auf Deutsch.
Max 2 Sätze, freundlicher Ton, mit Emoji.`,
    userPromptTpl: 'Schreibe eine kurze Beschreibung für "{{eventTitle}}" ({{eventType}}){{dateSuffix}}.',
    negativePrompt: null,
    temperature: null,
    maxTokens: 100,
    strength: null,
  },
  invitation_suggest: {
    feature: 'invitation_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere einen kurzen Einladungstext auf Deutsch für Gäste.
Max 3 Sätze, einladend und persönlich, mit Emoji.`,
    userPromptTpl: 'Schreibe einen Einladungstext für "{{eventTitle}}" ({{eventType}}){{hostSuffix}}.\nDie Gäste sollen motiviert werden, Fotos hochzuladen.',
    negativePrompt: null,
    temperature: null,
    maxTokens: 150,
    strength: null,
  },
  challenge_suggest: {
    feature: 'challenge_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere kreative Foto-Challenge-Ideen auf Deutsch.
Antworte NUR mit einem JSON-Array von Objekten mit "title" und "description".
Beispiel: [{"title": "Selfie mit Brautpaar", "description": "Macht ein Selfie mit den Frischvermählten!"}]`,
    userPromptTpl: 'Generiere 5 kreative Foto-Challenge-Ideen für ein "{{eventType}}" Event.\nJede Challenge sollte einen kurzen Titel und eine einladende Beschreibung haben.',
    negativePrompt: null,
    temperature: 0.9,
    maxTokens: null,
    strength: null,
  },
  guestbook_suggest: {
    feature: 'guestbook_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine einladende Gästebuch-Begrüßungsnachricht auf Deutsch.
Max 2 Sätze, herzlich und persönlich.`,
    userPromptTpl: 'Schreibe eine Willkommensnachricht für das Gästebuch von "{{eventTitle}}" ({{eventType}}).',
    negativePrompt: null,
    temperature: null,
    maxTokens: 100,
    strength: null,
  },
  color_scheme: {
    feature: 'color_scheme',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Farbdesign-Experte für Event-Apps.
Generiere harmonische Farbschemata als HEX-Werte.
Antworte NUR mit einem JSON-Array von Objekten.
Jedes Objekt hat: primary, secondary, accent, background (alle als HEX z.B. "#E91E63"), und name (deutscher Name des Schemas).
Beispiel: [{"primary": "#E91E63", "secondary": "#FCE4EC", "accent": "#FFD700", "background": "#FFF8F0", "name": "Romantisches Rosa"}]`,
    userPromptTpl: 'Generiere 4 passende Farbschemata für ein "{{eventType}}" Event.{{keywordStr}}{{moodStr}}\nDie Farben sollten harmonisch sein und zur Stimmung des Events passen.\nBerücksichtige: Kontrast für Lesbarkeit, moderne Ästhetik, emotionale Wirkung.',
    negativePrompt: null,
    temperature: 0.8,
    maxTokens: 800,
    strength: null,
  },
  compliment_mirror: {
    feature: 'compliment_mirror',
    providerId: null,
    model: null,
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
    negativePrompt: null,
    temperature: 0.95,
    maxTokens: 150,
    strength: null,
  },
  // Style Transfer prompts
  'style_transfer:oil-painting': {
    feature: 'style_transfer:oil-painting',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'oil painting style, thick brushstrokes, rich colors, classic art, museum quality',
    negativePrompt: 'photo, realistic, modern',
    temperature: null,
    maxTokens: null,
    strength: 0.65,
  },
  'style_transfer:watercolor': {
    feature: 'style_transfer:watercolor',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'watercolor painting, soft washes, flowing colors, delicate, artistic',
    negativePrompt: 'photo, sharp, digital',
    temperature: null,
    maxTokens: null,
    strength: 0.6,
  },
  'style_transfer:pop-art': {
    feature: 'style_transfer:pop-art',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'pop art style, bold colors, halftone dots, andy warhol inspired, comic book',
    negativePrompt: 'realistic, muted colors',
    temperature: null,
    maxTokens: null,
    strength: 0.7,
  },
  'style_transfer:cartoon': {
    feature: 'style_transfer:cartoon',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'cartoon style, animated, bright colors, clean lines, pixar style, fun',
    negativePrompt: 'realistic, photo, dark',
    temperature: null,
    maxTokens: null,
    strength: 0.65,
  },
  // Style Effects
  ai_oldify: {
    feature: 'ai_oldify',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'aged elderly version of the person, wrinkles, grey hair, realistic aging effect, same person but 40 years older, photorealistic',
    negativePrompt: 'young, smooth skin, child, cartoon, unrealistic',
    temperature: null,
    maxTokens: null,
    strength: 0.65,
  },
  ai_cartoon: {
    feature: 'ai_cartoon',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'pixar style 3d cartoon character, animated movie character, colorful, expressive, high quality cartoon rendering',
    negativePrompt: 'realistic, photograph, blurry, low quality, dark',
    temperature: null,
    maxTokens: null,
    strength: 0.75,
  },
  ai_style_pop: {
    feature: 'ai_style_pop',
    providerId: null,
    model: null,
    systemPrompt: null,
    userPromptTpl: 'vibrant pop art style, bold colors, andy warhol inspired, high contrast, artistic, modern pop art portrait',
    negativePrompt: 'dull, muted colors, black and white, boring, plain',
    temperature: null,
    maxTokens: null,
    strength: 0.7,
  },
  // ─── New Style Transfer Prompts (from AI-EFFEKTE-KATALOG) ───
  'style_transfer:caricature': {
    feature: 'style_transfer:caricature',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'exaggerated caricature drawing, big head, small body, humorous, colorful, professional caricature artist style',
    negativePrompt: 'realistic, photograph, normal proportions',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  'style_transfer:magazine-cover': {
    feature: 'style_transfer:magazine-cover',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'professional magazine cover photo, glamorous lighting, high fashion, vogue style, dramatic pose, editorial photography',
    negativePrompt: 'amateur, casual, low quality',
    temperature: null, maxTokens: null, strength: 0.55,
  },
  'style_transfer:comic-hero': {
    feature: 'style_transfer:comic-hero',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'marvel comic book style, bold outlines, halftone dots, dynamic pose, superhero comic panel, vibrant colors',
    negativePrompt: 'photograph, realistic, muted',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  'style_transfer:lego': {
    feature: 'style_transfer:lego',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'lego minifigure version of person, plastic toy, yellow skin, simple features, lego world background',
    negativePrompt: 'realistic, photograph, detailed skin',
    temperature: null, maxTokens: null, strength: 0.80,
  },
  'style_transfer:claymation': {
    feature: 'style_transfer:claymation',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'stop motion claymation character, wallace and gromit style, plasticine texture, warm lighting',
    negativePrompt: 'photograph, realistic, digital',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  'style_transfer:neon-portrait': {
    feature: 'style_transfer:neon-portrait',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'cyberpunk neon portrait, dark background, vibrant neon lights reflecting on skin, futuristic, blade runner aesthetic',
    negativePrompt: 'daylight, natural, flat lighting',
    temperature: null, maxTokens: null, strength: 0.65,
  },
  'style_transfer:barbie': {
    feature: 'style_transfer:barbie',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'barbie doll version, perfect plastic skin, glossy, pink background, toy box aesthetic, fashion doll',
    negativePrompt: 'realistic, wrinkles, natural skin',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  'style_transfer:ghibli': {
    feature: 'style_transfer:ghibli',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'studio ghibli anime style, miyazaki inspired, soft watercolor, dreamy atmosphere, detailed background, spirited away aesthetic',
    negativePrompt: 'realistic, photograph, dark, gritty',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  'style_transfer:headshot': {
    feature: 'style_transfer:headshot',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'professional linkedin headshot, studio lighting, clean background, business attire, confident expression',
    negativePrompt: 'casual, blurry, dark, amateur',
    temperature: null, maxTokens: null, strength: 0.50,
  },
  'style_transfer:stained-glass': {
    feature: 'style_transfer:stained-glass',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'stained glass window art style, vibrant colored glass pieces, black lead lines, church window, backlit',
    negativePrompt: 'photograph, realistic, modern',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  'style_transfer:ukiyo-e': {
    feature: 'style_transfer:ukiyo-e',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'ukiyo-e japanese woodblock print style, flat colors, wave patterns, traditional japanese art',
    negativePrompt: 'photograph, 3d, modern, digital',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  'style_transfer:sketch': {
    feature: 'style_transfer:sketch',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'pencil sketch drawing, detailed graphite shading, artistic portrait, hand drawn, fine lines on white paper',
    negativePrompt: 'color, photograph, digital, painting',
    temperature: null, maxTokens: null, strength: 0.65,
  },
  'style_transfer:vintage': {
    feature: 'style_transfer:vintage',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'vintage 1970s photograph, warm film grain, faded colors, soft focus, retro polaroid aesthetic, nostalgic',
    negativePrompt: 'modern, digital, sharp, HDR',
    temperature: null, maxTokens: null, strength: 0.55,
  },
  'style_transfer:anime': {
    feature: 'style_transfer:anime',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'anime style portrait, big expressive eyes, colorful hair highlights, clean cel-shading, japanese animation',
    negativePrompt: 'realistic, photograph, western cartoon',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  // ─── New LLM Game Prompts ───
  fortune_teller: {
    feature: 'fortune_teller',
    providerId: null,
    model: null,
    systemPrompt: `Du bist eine mystische Wahrsagerin auf einer Party.
Deine Aufgabe: Gib dem Gast eine witzige, kreative Zukunftsvorhersage.

REGELN:
- Antworte NUR auf Deutsch
- Sei mystisch aber humorvoll
- Nutze 1-2 passende Emojis
- Die Vorhersage soll max 3 Sätze sein
- Gib auch einen "Glücksgegenstand" an
- Antworte NUR als JSON: {"prediction": "...", "luckyItem": "...", "luckyNumber": 7}`,
    userPromptTpl: 'Gib dem Gast eine witzige Zukunftsvorhersage.{{eventContext}}{{guestContext}}',
    negativePrompt: null,
    temperature: 0.95,
    maxTokens: 200,
    strength: null,
  },
  ai_roast: {
    feature: 'ai_roast',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Stand-Up-Comedian auf einer Party.
Deine Aufgabe: Roaste den Gast liebevoll und witzig.

REGELN:
- Antworte NUR auf Deutsch
- Sei witzig aber NIEMALS verletzend oder beleidigend
- Nutze 1-2 Emojis
- Der Roast soll max 2 Sätze sein, plus ein "Rettungs-Kompliment"
- Antworte NUR als JSON: {"roast": "...", "rescue": "..."}`,
    userPromptTpl: 'Roaste den Gast liebevoll.{{eventContext}}{{guestContext}}',
    negativePrompt: null,
    temperature: 0.95,
    maxTokens: 200,
    strength: null,
  },
  caption_suggest: {
    feature: 'caption_suggest',
    providerId: null,
    model: null,
    systemPrompt: `Du bist ein Social-Media-Experte.
Generiere kreative Instagram-Captions auf Deutsch.
Antworte NUR mit einem JSON-Array von Strings.
Jede Caption soll 1-2 Sätze + passende Hashtags haben.
Beispiel: ["Beste Party ever! 🎉 #wedding #bestnight"]`,
    userPromptTpl: 'Generiere 3 Instagram-Captions für ein Foto von "{{eventType}}".',
    negativePrompt: null,
    temperature: 0.85,
    maxTokens: 200,
    strength: null,
  },
  emoji_me: {
    feature: 'emoji_me',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'transform the person into an emoji character, round yellow emoji face with their features and expression, cute emoji style, simple clean design',
    negativePrompt: 'realistic, photograph, detailed skin, complex background',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  pet_me: {
    feature: 'pet_me',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'transform the person into an adorable animal version of themselves, cute anthropomorphic animal, fluffy, same clothing and pose, pixar style',
    negativePrompt: 'scary, realistic animal, horror, dark',
    temperature: null, maxTokens: null, strength: 0.75,
  },
  yearbook: {
    feature: 'yearbook',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: '1990s high school yearbook photo, soft studio lighting, gradient blue background, slightly awkward smile, retro school portrait, film grain',
    negativePrompt: 'modern, digital, outdoor, casual',
    temperature: null, maxTokens: null, strength: 0.60,
  },
  miniature: {
    feature: 'miniature',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'miniature diorama scene, tilt-shift effect, tiny figurine version of the person, macro photography, detailed small world, miniature model',
    negativePrompt: 'full size, normal scale, blurry',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  time_machine: {
    feature: 'time_machine',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'person transported to a historical era, medieval knight, ancient rome, 1920s gatsby, victorian era, historically accurate clothing and setting',
    negativePrompt: 'modern clothing, contemporary, anachronistic',
    temperature: null, maxTokens: null, strength: 0.70,
  },
  ai_categorize: {
    feature: 'ai_categorize',
    providerId: null, model: null,
    systemPrompt: `Du bist ein Foto-Kategorisierer für Event-Fotogalerien.
Analysiere das Foto und ordne es der passendsten Kategorie zu.
Antworte NUR als JSON: {"category": "...", "confidence": 0.9}`,
    userPromptTpl: 'Kategorisiere dieses Event-Foto. Verfügbare Kategorien: {{categories}}',
    negativePrompt: null,
    temperature: 0.3, maxTokens: 50, strength: null,
  },
  trading_card: {
    feature: 'trading_card',
    providerId: null, model: null, systemPrompt: null,
    userPromptTpl: 'trading card design, holographic border, stats panel, character portrait, collectible card game style, shiny foil effect, fantasy card art',
    negativePrompt: 'plain, no border, photograph, simple',
    temperature: null, maxTokens: null, strength: 0.70,
  },
};

// ─── Core Functions ─────────────────────────────────────────

/**
 * Resolve the active prompt template for a feature.
 * Priority: event-specific → global DB → hardcoded fallback
 */
export async function resolvePrompt(
  feature: string,
  eventId?: string,
): Promise<ResolvedPrompt> {
  const fallback = FALLBACK_PROMPTS[feature] || null;

  try {
    // 1. Try event-specific template
    if (eventId) {
      const eventTemplate = await prisma.aiPromptTemplate.findFirst({
        where: { feature, eventId, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (eventTemplate) {
        const resolved = templateToResolved(eventTemplate);
        // Merge with fallback for any null fields
        if (fallback) {
          resolved.systemPrompt = resolved.systemPrompt ?? fallback.systemPrompt;
          resolved.userPromptTpl = resolved.userPromptTpl ?? fallback.userPromptTpl;
          resolved.negativePrompt = resolved.negativePrompt ?? fallback.negativePrompt;
          resolved.temperature = resolved.temperature ?? fallback.temperature;
          resolved.maxTokens = resolved.maxTokens ?? fallback.maxTokens;
          resolved.strength = resolved.strength ?? fallback.strength;
        }
        return { ...resolved, source: 'event' as const };
      }
    }

    // 2. Try global template
    const globalTemplate = await prisma.aiPromptTemplate.findFirst({
      where: { feature, eventId: null, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (globalTemplate) {
      const resolved = templateToResolved(globalTemplate);
      // Merge with fallback for any null fields
      if (fallback) {
        resolved.systemPrompt = resolved.systemPrompt ?? fallback.systemPrompt;
        resolved.userPromptTpl = resolved.userPromptTpl ?? fallback.userPromptTpl;
        resolved.negativePrompt = resolved.negativePrompt ?? fallback.negativePrompt;
        resolved.temperature = resolved.temperature ?? fallback.temperature;
        resolved.maxTokens = resolved.maxTokens ?? fallback.maxTokens;
        resolved.strength = resolved.strength ?? fallback.strength;
      }
      return { ...resolved, source: 'global' as const };
    }
  } catch (error) {
    logger.warn('[PromptTemplates] DB lookup failed, using fallback', {
      feature,
      error: (error as Error).message,
    });
  }

  // 3. Hardcoded fallback
  if (fallback) {
    return { ...fallback, id: `fallback:${feature}`, source: 'fallback' };
  }

  // 4. No template found at all
  return {
    id: `empty:${feature}`,
    feature,
    systemPrompt: null,
    userPromptTpl: null,
    negativePrompt: null,
    temperature: null,
    maxTokens: null,
    strength: null,
    providerId: null,
    model: null,
    source: 'fallback',
  };
}

/**
 * Render a user prompt template by replacing {{variables}}
 */
export function renderPrompt(template: string | null, variables: PromptVariables): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

/**
 * Get all templates for a feature (all versions)
 */
export async function getTemplateHistory(feature: string, eventId?: string) {
  return prisma.aiPromptTemplate.findMany({
    where: { feature, eventId: eventId ?? null },
    orderBy: { version: 'desc' },
  });
}

/**
 * List all active templates, optionally filtered
 */
export async function listActiveTemplates(filters?: {
  category?: PromptCategory;
  eventId?: string;
}) {
  return prisma.aiPromptTemplate.findMany({
    where: {
      isActive: true,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.eventId !== undefined && { eventId: filters.eventId }),
    },
    orderBy: [{ category: 'asc' }, { feature: 'asc' }],
  });
}

/**
 * Create or update a prompt template (creates new version)
 */
export async function upsertTemplate(data: {
  feature: string;
  name: string;
  description?: string;
  category: PromptCategory;
  systemPrompt?: string;
  userPromptTpl?: string;
  negativePrompt?: string;
  temperature?: number;
  maxTokens?: number;
  strength?: number;
  providerId?: string;
  model?: string;
  eventId?: string;
  variables?: any;
  tags?: any;
  createdBy?: string;
}) {
  const { feature, eventId } = data;

  // Find current max version
  const existing = await prisma.aiPromptTemplate.findFirst({
    where: { feature, eventId: eventId ?? null },
    orderBy: { version: 'desc' },
  });

  const nextVersion = existing ? existing.version + 1 : 1;

  // Deactivate old versions
  if (existing) {
    await prisma.aiPromptTemplate.updateMany({
      where: { feature, eventId: eventId ?? null, isActive: true },
      data: { isActive: false },
    });
  }

  // Create new version
  return prisma.aiPromptTemplate.create({
    data: {
      feature,
      name: data.name,
      description: data.description,
      category: data.category,
      systemPrompt: data.systemPrompt,
      userPromptTpl: data.userPromptTpl,
      negativePrompt: data.negativePrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      strength: data.strength,
      providerId: data.providerId ?? null,
      model: data.model ?? null,
      version: nextVersion,
      isActive: true,
      isDefault: false,
      eventId: eventId ?? null,
      variables: data.variables,
      tags: data.tags,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Restore a specific version as the active one
 */
export async function restoreVersion(templateId: string) {
  const template = await prisma.aiPromptTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error('Template not found');

  // Deactivate all versions of this feature+scope
  await prisma.aiPromptTemplate.updateMany({
    where: { feature: template.feature, eventId: template.eventId, isActive: true },
    data: { isActive: false },
  });

  // Create a new version with the old content
  const latest = await prisma.aiPromptTemplate.findFirst({
    where: { feature: template.feature, eventId: template.eventId },
    orderBy: { version: 'desc' },
  });

  return prisma.aiPromptTemplate.create({
    data: {
      feature: template.feature,
      name: template.name,
      description: template.description,
      category: template.category,
      systemPrompt: template.systemPrompt,
      userPromptTpl: template.userPromptTpl,
      negativePrompt: template.negativePrompt,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      strength: template.strength,
      version: (latest?.version ?? 0) + 1,
      isActive: true,
      isDefault: false,
      eventId: template.eventId,
      variables: template.variables as any,
      tags: template.tags as any,
      createdBy: template.createdBy,
    },
  });
}

/**
 * Delete a non-default template
 */
export async function deleteTemplate(templateId: string) {
  const template = await prisma.aiPromptTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error('Template not found');
  if (template.isDefault) throw new Error('System-Default-Templates können nicht gelöscht werden');

  return prisma.aiPromptTemplate.delete({ where: { id: templateId } });
}

/**
 * Seed default prompts into the database (idempotent)
 */
export async function seedDefaultPrompts() {
  let created = 0;
  const categoryMap: Record<string, PromptCategory> = {
    chat: 'SYSTEM',
    album_suggest: 'SUGGEST',
    description_suggest: 'SUGGEST',
    invitation_suggest: 'SUGGEST',
    challenge_suggest: 'SUGGEST',
    guestbook_suggest: 'SUGGEST',
    color_scheme: 'SUGGEST',
    caption_suggest: 'SUGGEST',
    compliment_mirror: 'GAME',
    fortune_teller: 'GAME',
    ai_roast: 'GAME',
    ai_oldify: 'STYLE',
    ai_cartoon: 'STYLE',
    ai_style_pop: 'STYLE',
  };

  const nameMap: Record<string, string> = {
    chat: 'KI Chat-Assistent',
    album_suggest: 'Album-Vorschläge',
    description_suggest: 'Event-Beschreibung',
    invitation_suggest: 'Einladungstext',
    challenge_suggest: 'Challenge-Ideen',
    guestbook_suggest: 'Gästebuch-Nachricht',
    color_scheme: 'Farbschema-Generator',
    caption_suggest: 'Caption Generator',
    compliment_mirror: 'Compliment Mirror',
    fortune_teller: 'AI Fortune Teller',
    ai_roast: 'AI Roast',
    ai_oldify: 'Oldify-Effekt',
    ai_cartoon: 'Cartoon-Effekt',
    ai_style_pop: 'Style Pop-Effekt',
  };

  for (const [feature, prompt] of Object.entries(FALLBACK_PROMPTS)) {
    const existing = await prisma.aiPromptTemplate.findFirst({
      where: { feature, eventId: null },
    });
    if (existing) continue;

    const cat = feature.startsWith('style_transfer:') ? 'STYLE' : (categoryMap[feature] || 'CUSTOM');
    const name = feature.startsWith('style_transfer:')
      ? `Style: ${feature.split(':')[1]}`
      : (nameMap[feature] || feature);

    await prisma.aiPromptTemplate.create({
      data: {
        feature,
        name,
        category: cat as PromptCategory,
        systemPrompt: prompt.systemPrompt,
        userPromptTpl: prompt.userPromptTpl,
        negativePrompt: prompt.negativePrompt,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        strength: prompt.strength,
        version: 1,
        isActive: true,
        isDefault: true,
        eventId: null,
      },
    });
    created++;
  }

  logger.info(`[PromptTemplates] Seeded ${created} default prompt templates`);
  return { created };
}

// ─── Helpers ────────────────────────────────────────────────

function templateToResolved(template: AiPromptTemplate): Omit<ResolvedPrompt, 'source'> {
  return {
    id: template.id,
    feature: template.feature,
    systemPrompt: template.systemPrompt,
    userPromptTpl: template.userPromptTpl,
    negativePrompt: template.negativePrompt,
    temperature: template.temperature,
    maxTokens: template.maxTokens,
    strength: template.strength,
    providerId: template.providerId,
    model: template.model,
  };
}
