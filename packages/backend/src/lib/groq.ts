import { logger } from '../utils/logger';
import { getDefaultConfig, chatCompletion, getActiveProviderInfo, type ChatMessage, type LLMResponse } from './llmClient';
import { withKnowledge, type KnowledgeFeature } from '../services/cache/knowledgeStore';

interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate text completion using the active LLM provider (Groq, Grok/xAI, or OpenAI).
 * Backwards-compatible wrapper around the unified llmClient.
 */
export async function generateCompletion(
  prompt: string,
  systemPrompt?: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AIResponse> {
  const config = getDefaultConfig();
  const messages: ChatMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const result: LLMResponse = await chatCompletion(config, messages, {
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  });

  return {
    content: result.content,
    usage: result.usage,
  };
}

/**
 * Generate album suggestions based on event type
 */
export const suggestAlbums = withKnowledge<
  { eventType: string; eventTitle?: string },
  string[]
>(
  'suggest-albums',
  async ({ eventType, eventTitle }) => {
    const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App für Events. 
Generiere passende Album-Namen auf Deutsch. 
Antworte NUR mit einer JSON-Array von Strings, keine Erklärungen.
Beispiel: ["Getting Ready", "Trauung", "Feier"]`;

    const prompt = `Generiere 5-7 passende Album-Namen für ein Event vom Typ "${eventType}"${eventTitle ? ` mit dem Titel "${eventTitle}"` : ''}.
Die Namen sollten kurz und prägnant sein (max 3 Wörter).`;

    const response = await generateCompletion(prompt, systemPrompt, { temperature: 0.8 });
    const albums = JSON.parse(response.content);
    return Array.isArray(albums) ? albums : [];
  },
  { fallback: ({ eventType }) => getDefaultAlbums(eventType) }
);

/**
 * Generate event description
 */
export const suggestDescription = withKnowledge<
  { eventType: string; eventTitle: string; eventDate?: string },
  string
>(
  'suggest-description',
  async ({ eventType, eventTitle, eventDate }) => {
    const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine kurze, einladende Event-Beschreibung auf Deutsch.
Max 2 Sätze, freundlicher Ton, mit Emoji.`;

    const prompt = `Schreibe eine kurze Beschreibung für "${eventTitle}" (${eventType})${eventDate ? ` am ${eventDate}` : ''}.`;

    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 100 });
    return response.content.trim();
  },
  { fallback: ({ eventTitle }) => `Willkommen bei ${eventTitle}! 📸 Teilt eure schönsten Momente.` }
);

/**
 * Generate invitation text
 */
export const suggestInvitationText = withKnowledge<
  { eventType: string; eventTitle: string; hostName?: string },
  string
>(
  'suggest-invitation',
  async ({ eventType, eventTitle, hostName }) => {
    const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere einen kurzen Einladungstext auf Deutsch für Gäste.
Max 3 Sätze, einladend und persönlich, mit Emoji.`;

    const prompt = `Schreibe einen Einladungstext für "${eventTitle}" (${eventType})${hostName ? ` von ${hostName}` : ''}.
Die Gäste sollen motiviert werden, Fotos hochzuladen.`;

    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 150 });
    return response.content.trim();
  },
  { fallback: ({ eventTitle }) => `Haltet die schönsten Momente von ${eventTitle} fest! 📸 Ladet eure Fotos hoch und teilt sie mit allen Gästen.` }
);

/**
 * Generate challenge ideas
 */
export const suggestChallenges = withKnowledge<
  { eventType: string },
  { title: string; description: string }[]
>(
  'suggest-challenges',
  async ({ eventType }) => {
    const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere kreative Foto-Challenge-Ideen auf Deutsch.
Antworte NUR mit einem JSON-Array von Objekten mit "title" und "description".
Beispiel: [{"title": "Selfie mit Brautpaar", "description": "Macht ein Selfie mit den Frischvermählten!"}]`;

    const prompt = `Generiere 5 kreative Foto-Challenge-Ideen für ein "${eventType}" Event.
Jede Challenge sollte einen kurzen Titel und eine einladende Beschreibung haben.`;

    const response = await generateCompletion(prompt, systemPrompt, { temperature: 0.9 });
    const challenges = JSON.parse(response.content);
    return Array.isArray(challenges) ? challenges : [];
  },
  { fallback: ({ eventType }) => getDefaultChallenges(eventType) }
);

/**
 * Generate guestbook welcome message
 */
export const suggestGuestbookMessage = withKnowledge<
  { eventType: string; eventTitle: string },
  string
>(
  'suggest-guestbook',
  async ({ eventType, eventTitle }) => {
    const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine einladende Gästebuch-Begrüßungsnachricht auf Deutsch.
Max 2 Sätze, herzlich und persönlich.`;

    const prompt = `Schreibe eine Willkommensnachricht für das Gästebuch von "${eventTitle}" (${eventType}).`;

    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 100 });
    return response.content.trim();
  },
  { fallback: () => `Herzlich willkommen im Gästebuch! Hinterlasst eure Glückwünsche und Grüße. 💝` }
);

// Fallback functions
function getDefaultAlbums(eventType: string): string[] {
  const defaults: Record<string, string[]> = {
    wedding: ['Getting Ready', 'Trauung', 'Empfang', 'Tortenanschnitt', 'Party'],
    family: ['Ankommen', 'Feier', 'Gruppenfoto', 'Besondere Momente'],
    milestone: ['Vorbereitung', 'Feier', 'Geschenke', 'Erinnerungen'],
    business: ['Empfang', 'Vorträge', 'Networking', 'Team'],
    party: ['Ankommen', 'Party', 'Highlights', 'Ende'],
    custom: ['Allgemein', 'Highlights', 'Besondere Momente'],
  };
  return defaults[eventType] || defaults.custom;
}

function getDefaultChallenges(eventType: string): { title: string; description: string }[] {
  const defaults: Record<string, { title: string; description: string }[]> = {
    wedding: [
      { title: 'Selfie mit Brautpaar', description: 'Macht ein Selfie mit den Frischvermählten!' },
      { title: 'Tanzflächen-Schnappschuss', description: 'Zeigt eure besten Moves auf der Tanzfläche!' },
      { title: 'Deko-Detail', description: 'Findet das schönste Deko-Element!' },
      { title: 'Lieblingsmoment', description: 'Fangt euren emotionalsten Moment ein!' },
      { title: 'Vintage-Foto', description: 'Macht ein Foto im Retro-Stil!' },
    ],
    family: [
      { title: 'Generationen-Foto', description: 'Alle Generationen auf einem Bild!' },
      { title: 'Kinderlachen', description: 'Fangt das schönste Kinderlachen ein!' },
      { title: 'Familien-Selfie', description: 'Ein Selfie mit möglichst vielen Familienmitgliedern!' },
      { title: 'Tischmoment', description: 'Der lustigste Moment am Tisch!' },
      { title: 'Verwandtschafts-Quiz', description: 'Wer erkennt wen? Macht Rätsel-Fotos!' },
    ],
    milestone: [
      { title: 'Selfie mit Geburtstagskind', description: 'Ein Selfie mit dem Star des Tages!' },
      { title: 'Tortenanschnitt', description: 'Der magische Moment mit der Torte!' },
      { title: 'Geschenke-Chaos', description: 'Zeigt den Geschenke-Berg!' },
      { title: 'Party-Stimmung', description: 'Fangt die ausgelassenste Stimmung ein!' },
      { title: 'Überraschungsmoment', description: 'Der beste Überraschungs-Gesichtsausdruck!' },
    ],
    business: [
      { title: 'Team-Spirit', description: 'Zeigt euren Team-Zusammenhalt!' },
      { title: 'Networking in Action', description: 'Die besten Gespräche dokumentiert!' },
      { title: 'Behind the Scenes', description: 'Was passiert hinter den Kulissen?' },
      { title: 'Office-Fun', description: 'Der lustigste Moment im Büro/Event!' },
      { title: 'Success-Pose', description: 'Eure beste Erfolgs-Pose!' },
    ],
    party: [
      { title: 'Gruppenfoto', description: 'Alle zusammen auf einem Bild!' },
      { title: 'Dance Moves', description: 'Zeigt eure besten Tanzschritte!' },
      { title: 'Bestes Outfit', description: 'Wer hat das coolste Outfit?' },
      { title: 'Party-Animal', description: 'Wer feiert am wildesten?' },
      { title: 'Mitternachts-Selfie', description: 'Ein Selfie um Mitternacht!' },
    ],
    custom: [
      { title: 'Gruppenfoto', description: 'Sammelt so viele Leute wie möglich für ein Foto!' },
      { title: 'Bestes Lachen', description: 'Fangt den lustigsten Moment ein!' },
      { title: 'Food-Foto', description: 'Zeigt das leckerste Essen!' },
      { title: 'Schnappschuss', description: 'Der spontanste Moment des Events!' },
      { title: 'Best Dressed', description: 'Wer ist am schicksten gekleidet?' },
    ],
  };
  return defaults[eventType] || defaults.custom;
}

/**
 * Simple chat completion for bot responses
 */
export async function complete(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await generateCompletion(userMessage, systemPrompt, {
    maxTokens: 300,
    temperature: 0.7,
  });
  return response.content;
}

type ColorScheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  name: string;
};

/**
 * Suggest color scheme based on event type and optional keywords
 */
export const suggestColorScheme = withKnowledge<
  { eventType: string; keywords?: string[]; mood?: string },
  ColorScheme[]
>(
  'suggest-colors',
  async ({ eventType, keywords, mood }) => {
    const systemPrompt = `Du bist ein Farbdesign-Experte für Event-Apps.
Generiere harmonische Farbschemata als HEX-Werte.
Antworte NUR mit einem JSON-Array von Objekten.
Jedes Objekt hat: primary, secondary, accent, background (alle als HEX z.B. "#E91E63"), und name (deutscher Name des Schemas).
Beispiel: [{"primary": "#E91E63", "secondary": "#FCE4EC", "accent": "#FFD700", "background": "#FFF8F0", "name": "Romantisches Rosa"}]`;

    const keywordStr = keywords?.length ? ` Stichworte: ${keywords.join(', ')}.` : '';
    const moodStr = mood ? ` Stimmung: ${mood}.` : '';

    const prompt = `Generiere 4 passende Farbschemata für ein "${eventType}" Event.${keywordStr}${moodStr}
Die Farben sollten harmonisch sein und zur Stimmung des Events passen.
Berücksichtige: Kontrast für Lesbarkeit, moderne Ästhetik, emotionale Wirkung.`;

    const response = await generateCompletion(prompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 800,
    });
    const schemes = JSON.parse(response.content);
    return Array.isArray(schemes) ? schemes : [];
  },
  { fallback: ({ eventType }) => getDefaultColorSchemes(eventType) }
);

function getDefaultColorSchemes(eventType: string): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  name: string;
}[] {
  const defaults: Record<string, typeof defaultSchemes> = {
    wedding: [
      { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FFD700', background: '#FFF8F0', name: 'Romantisches Rosa' },
      { primary: '#8B5A2B', secondary: '#F5E6D3', accent: '#D4AF37', background: '#FFFBF5', name: 'Elegantes Gold' },
      { primary: '#2E7D32', secondary: '#E8F5E9', accent: '#FFB74D', background: '#FAFFF5', name: 'Natürliches Grün' },
      { primary: '#5E35B1', secondary: '#EDE7F6', accent: '#FFD54F', background: '#FAF5FF', name: 'Royales Violett' },
    ],
    party: [
      { primary: '#FF5722', secondary: '#FBE9E7', accent: '#FFEB3B', background: '#FFFDE7', name: 'Party Orange' },
      { primary: '#9C27B0', secondary: '#F3E5F5', accent: '#00BCD4', background: '#F5F5F5', name: 'Disco Neon' },
      { primary: '#E91E63', secondary: '#FCE4EC', accent: '#4CAF50', background: '#FAFAFA', name: 'Pink Party' },
      { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FF4081', background: '#F5F5F5', name: 'Nacht Blau' },
    ],
    business: [
      { primary: '#1976D2', secondary: '#E3F2FD', accent: '#FF9800', background: '#FAFAFA', name: 'Business Blau' },
      { primary: '#455A64', secondary: '#ECEFF1', accent: '#00BCD4', background: '#FFFFFF', name: 'Modern Grau' },
      { primary: '#00695C', secondary: '#E0F2F1', accent: '#FFC107', background: '#FAFAFA', name: 'Professionelles Teal' },
      { primary: '#37474F', secondary: '#F5F5F5', accent: '#7C4DFF', background: '#FFFFFF', name: 'Elegant Dunkel' },
    ],
    family: [
      { primary: '#4CAF50', secondary: '#E8F5E9', accent: '#FF9800', background: '#FFFDE7', name: 'Familien Grün' },
      { primary: '#2196F3', secondary: '#E3F2FD', accent: '#FFEB3B', background: '#FAFAFA', name: 'Freundliches Blau' },
      { primary: '#FF7043', secondary: '#FBE9E7', accent: '#8BC34A', background: '#FFF8E1', name: 'Warmes Orange' },
      { primary: '#7B1FA2', secondary: '#F3E5F5', accent: '#4DB6AC', background: '#FAFAFA', name: 'Verspieltes Lila' },
    ],
  };
  
  const defaultSchemes = [
    { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FFD700', background: '#FFF8F0', name: 'Klassisch Rosa' },
    { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FF9800', background: '#FAFAFA', name: 'Modern Blau' },
    { primary: '#4CAF50', secondary: '#E8F5E9', accent: '#FFC107', background: '#FFFDE7', name: 'Frisches Grün' },
    { primary: '#9C27B0', secondary: '#F3E5F5', accent: '#00BCD4', background: '#FAFAFA', name: 'Kreativ Lila' },
  ];
  
  return defaults[eventType] || defaultSchemes;
}

// ─── Theme Generation ────────────────────────────────────────

export interface GeneratedThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface GeneratedThemeAnimation {
  type: string;
  duration: number;
  easing: string;
}

export interface GeneratedThemeAnimations {
  entrance: GeneratedThemeAnimation;
  hover: GeneratedThemeAnimation;
  ambient: GeneratedThemeAnimation | null;
}

export interface GeneratedThemeFonts {
  heading: string;
  body: string;
  accent: string;
}

export interface GeneratedTheme {
  name: string;
  colors: GeneratedThemeColors;
  animations: GeneratedThemeAnimations;
  fonts: GeneratedThemeFonts;
  wallLayout: string;
  tasteScore: number;
}

/**
 * Generate event themes based on event type and optional context.
 * Uses Knowledge Store for permanent caching (selbstlernendes System).
 */
export const suggestTheme = withKnowledge<
  { eventType: string; season?: string; location?: string },
  GeneratedTheme[]
>(
  'suggest-theme',
  async ({ eventType, season, location }) => {
    const systemPrompt = `Du bist ein Event-Theme-Designer für eine Foto-Sharing-App.
Generiere 3 moderne, geschmackvolle Themes als JSON-Array.

ANTI-KITSCH-REGELN (strikt einhalten!):
- Max 3 Hauptfarben + 2 Neutraltöne (background, surface)
- Max 3 Animationstypen (entrance, hover, ambient)
- Keine Neon-Farben auf hellem Hintergrund
- Keine Comic-Schriften (Comic Sans, Papyrus, etc.)
- Ein Statement-Element pro Theme (nicht mehr!)
- Farben als HEX-Werte
- tasteScore 0-100 (selbstkritisch bewerten)

Erlaubte Animation-Types:
entrance: fadeIn, fadeUp, fadeScale, slideUp, bounceIn, popIn, growIn
hover: lift, scale, glow, neonGlow, shimmer, sparkle, underline, borderHighlight, gradientShift, softBounce, wiggle, warmGlow
ambient: floatingPetals, confetti, colorShift, fallingLeaves (oder null für keine)

Erlaubte wallLayout: masonry, grid

Antworte NUR mit einem JSON-Array von 3 Theme-Objekten.`;

    let prompt = `Generiere 3 Theme-Varianten für ein "${eventType}" Event`;
    if (season) prompt += ` im ${season}`;
    if (location) prompt += `, Location: ${location}`;
    prompt += `.

Für jedes Theme:
{
  "name": "Kurzer Name (2-3 Wörter)",
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "textMuted": "#hex" },
  "animations": { "entrance": { "type": "...", "duration": 300-600, "easing": "easeOut" }, "hover": { "type": "...", "duration": 150-400, "easing": "easeInOut" }, "ambient": null },
  "fonts": { "heading": "Google Font Name", "body": "Google Font Name", "accent": "Google Font Name" },
  "wallLayout": "masonry",
  "tasteScore": 70-95
}`;

    const response = await generateCompletion(prompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 2000,
    });

    // Parse response — handle markdown code blocks
    let content = response.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const themes = JSON.parse(content);
    if (!Array.isArray(themes)) return [];

    // Validate and sanitize each theme
    return themes.filter((t: any) =>
      t.name && t.colors?.primary && t.fonts?.heading && typeof t.tasteScore === 'number'
    ).map((t: any) => ({
      name: t.name,
      colors: {
        primary: t.colors.primary,
        secondary: t.colors.secondary || t.colors.primary,
        accent: t.colors.accent || t.colors.primary,
        background: t.colors.background || '#FFFFFF',
        surface: t.colors.surface || '#FAFAFA',
        text: t.colors.text || '#1A1A1A',
        textMuted: t.colors.textMuted || '#6B7280',
      },
      animations: {
        entrance: t.animations?.entrance || { type: 'fadeIn', duration: 300, easing: 'easeOut' },
        hover: t.animations?.hover || { type: 'lift', duration: 200, easing: 'easeInOut' },
        ambient: t.animations?.ambient || null,
      },
      fonts: {
        heading: t.fonts.heading,
        body: t.fonts.body || t.fonts.heading,
        accent: t.fonts.accent || t.fonts.heading,
      },
      wallLayout: t.wallLayout || 'masonry',
      tasteScore: Math.min(100, Math.max(0, t.tasteScore)),
    }));
  },
  { fallback: ({ eventType }) => getDefaultThemes(eventType) }
);

function getDefaultThemes(eventType: string): GeneratedTheme[] {
  const base: GeneratedTheme = {
    name: 'Classic Elegant',
    colors: {
      primary: '#374151', secondary: '#9CA3AF', accent: '#6366F1',
      background: '#F9FAFB', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280',
    },
    animations: {
      entrance: { type: 'fadeIn', duration: 300, easing: 'easeOut' },
      hover: { type: 'lift', duration: 200, easing: 'easeInOut' },
      ambient: null,
    },
    fonts: { heading: 'Inter', body: 'Inter', accent: 'Inter' },
    wallLayout: 'masonry',
    tasteScore: 75,
  };

  const themeMap: Record<string, GeneratedTheme[]> = {
    wedding: [
      { ...base, name: 'Elegant Ivory', colors: { ...base.colors, primary: '#8B7355', secondary: '#D4C5B2', accent: '#C9A96E', background: '#FDFBF7' }, fonts: { heading: 'Playfair Display', body: 'Lato', accent: 'Cormorant Garamond' } },
      { ...base, name: 'Romantic Blush', colors: { ...base.colors, primary: '#C48B9F', secondary: '#E8D5DC', accent: '#9B6B7A', background: '#FFF8FA' }, fonts: { heading: 'Cormorant Garamond', body: 'Nunito Sans', accent: 'Dancing Script' } },
      { ...base, name: 'Modern Minimal', colors: { ...base.colors, primary: '#1A1A1A', secondary: '#F5F5F0', accent: '#D4AF37' }, fonts: { heading: 'Inter', body: 'Inter', accent: 'Space Grotesk' }, wallLayout: 'grid' },
    ],
    party: [
      { ...base, name: 'Vibrant Sunset', colors: { ...base.colors, primary: '#FF6B35', secondary: '#FFD166', accent: '#EF476F', background: '#FFF9F0' }, fonts: { heading: 'Poppins', body: 'Poppins', accent: 'Righteous' } },
      { ...base, name: 'Confetti Pop', colors: { ...base.colors, primary: '#FF4081', secondary: '#FFD740', accent: '#536DFE' }, fonts: { heading: 'Fredoka One', body: 'Nunito', accent: 'Baloo 2' }, animations: { ...base.animations, ambient: { type: 'confetti', duration: 5000, easing: 'linear' } } },
      { ...base, name: 'Neon Night', colors: { ...base.colors, primary: '#7B2FF7', secondary: '#1A1A2E', accent: '#00D4FF', background: '#0F0F1A', surface: '#1A1A2E', text: '#E8E8F0', textMuted: '#8888AA' }, fonts: { heading: 'Space Grotesk', body: 'Inter', accent: 'Orbitron' }, wallLayout: 'grid' },
    ],
    business: [
      { ...base, name: 'Professional Slate', colors: { ...base.colors, primary: '#1E293B', secondary: '#475569', accent: '#3B82F6', background: '#F8FAFC' }, wallLayout: 'grid' },
      { ...base, name: 'Tech Gradient', colors: { ...base.colors, primary: '#6366F1', secondary: '#818CF8', accent: '#06B6D4', background: '#0F172A', surface: '#1E293B', text: '#F1F5F9', textMuted: '#94A3B8' }, fonts: { heading: 'Space Grotesk', body: 'Inter', accent: 'JetBrains Mono' }, wallLayout: 'grid' },
      { ...base, name: 'Clean White', colors: { ...base.colors, primary: '#111827', accent: '#10B981' }, fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', accent: 'Inter' }, wallLayout: 'grid' },
    ],
  };

  return themeMap[eventType] || [base, { ...base, name: 'Warm Classic', colors: { ...base.colors, primary: '#92400E', accent: '#D97706', background: '#FFFBEB' } }, { ...base, name: 'Cool Modern', colors: { ...base.colors, primary: '#1E40AF', accent: '#06B6D4' } }];
}

export default {
  generateCompletion,
  suggestAlbums,
  suggestDescription,
  suggestInvitationText,
  suggestChallenges,
  suggestGuestbookMessage,
  suggestColorScheme,
  suggestTheme,
  complete,
};
