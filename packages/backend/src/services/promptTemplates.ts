import prisma from '../config/database';
import { logger } from '../utils/logger';
import type { PromptCategory } from '@prisma/client';

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
  source: 'db' | 'fallback';
}

export interface PromptVariables {
  [key: string]: string | number | undefined;
}

// ─── Hardcoded Fallbacks ────────────────────────────────────
// These are used when no DB template exists (backwards-compatible)

const FALLBACK_PROMPTS: Record<string, Omit<ResolvedPrompt, 'id' | 'source'>> = {
  chat: {
    feature: 'chat',
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
    systemPrompt: null,
    userPromptTpl: 'oil painting style, thick brushstrokes, rich colors, classic art, museum quality',
    negativePrompt: 'photo, realistic, modern',
    temperature: null,
    maxTokens: null,
    strength: 0.65,
  },
  'style_transfer:watercolor': {
    feature: 'style_transfer:watercolor',
    systemPrompt: null,
    userPromptTpl: 'watercolor painting, soft washes, flowing colors, delicate, artistic',
    negativePrompt: 'photo, sharp, digital',
    temperature: null,
    maxTokens: null,
    strength: 0.6,
  },
  'style_transfer:pop-art': {
    feature: 'style_transfer:pop-art',
    systemPrompt: null,
    userPromptTpl: 'pop art style, bold colors, halftone dots, andy warhol inspired, comic book',
    negativePrompt: 'realistic, muted colors',
    temperature: null,
    maxTokens: null,
    strength: 0.7,
  },
  'style_transfer:cartoon': {
    feature: 'style_transfer:cartoon',
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
    systemPrompt: null,
    userPromptTpl: 'aged elderly version of the person, wrinkles, grey hair, realistic aging effect, same person but 40 years older, photorealistic',
    negativePrompt: 'young, smooth skin, child, cartoon, unrealistic',
    temperature: null,
    maxTokens: null,
    strength: 0.65,
  },
  ai_cartoon: {
    feature: 'ai_cartoon',
    systemPrompt: null,
    userPromptTpl: 'pixar style 3d cartoon character, animated movie character, colorful, expressive, high quality cartoon rendering',
    negativePrompt: 'realistic, photograph, blurry, low quality, dark',
    temperature: null,
    maxTokens: null,
    strength: 0.75,
  },
  ai_style_pop: {
    feature: 'ai_style_pop',
    systemPrompt: null,
    userPromptTpl: 'vibrant pop art style, bold colors, andy warhol inspired, high contrast, artistic, modern pop art portrait',
    negativePrompt: 'dull, muted colors, black and white, boring, plain',
    temperature: null,
    maxTokens: null,
    strength: 0.7,
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
  try {
    // 1. Try event-specific template
    if (eventId) {
      const eventTemplate = await prisma.aiPromptTemplate.findFirst({
        where: { feature, eventId, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (eventTemplate) {
        return { ...templateToResolved(eventTemplate), source: 'db' };
      }
    }

    // 2. Try global template
    const globalTemplate = await prisma.aiPromptTemplate.findFirst({
      where: { feature, eventId: null, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (globalTemplate) {
      return { ...templateToResolved(globalTemplate), source: 'db' };
    }
  } catch (error) {
    logger.warn('[PromptTemplates] DB lookup failed, using fallback', {
      feature,
      error: (error as Error).message,
    });
  }

  // 3. Hardcoded fallback
  const fallback = FALLBACK_PROMPTS[feature];
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
    compliment_mirror: 'GAME',
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
    compliment_mirror: 'Compliment Mirror',
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

function templateToResolved(template: {
  id: string;
  feature: string;
  systemPrompt: string | null;
  userPromptTpl: string | null;
  negativePrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  strength: number | null;
}): Omit<ResolvedPrompt, 'source'> {
  return {
    id: template.id,
    feature: template.feature,
    systemPrompt: template.systemPrompt,
    userPromptTpl: template.userPromptTpl,
    negativePrompt: template.negativePrompt,
    temperature: template.temperature,
    maxTokens: template.maxTokens,
    strength: template.strength,
  };
}
