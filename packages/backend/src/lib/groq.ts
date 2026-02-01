import Groq from 'groq-sdk';
import { logger } from '../utils/logger';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Default model - Llama 3 70B for best quality
const DEFAULT_MODEL = 'llama-3.1-70b-versatile';

interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate text completion using Groq
 */
export async function generateCompletion(
  prompt: string,
  systemPrompt?: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AIResponse> {
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const completion = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens || 500,
    temperature: options?.temperature || 0.7,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    usage: completion.usage ? {
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      total_tokens: completion.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Generate album suggestions based on event type
 */
export async function suggestAlbums(eventType: string, eventTitle?: string): Promise<string[]> {
  const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App für Events. 
Generiere passende Album-Namen auf Deutsch. 
Antworte NUR mit einer JSON-Array von Strings, keine Erklärungen.
Beispiel: ["Getting Ready", "Trauung", "Feier"]`;

  const prompt = `Generiere 5-7 passende Album-Namen für ein Event vom Typ "${eventType}"${eventTitle ? ` mit dem Titel "${eventTitle}"` : ''}.
Die Namen sollten kurz und prägnant sein (max 3 Wörter).`;

  try {
    const response = await generateCompletion(prompt, systemPrompt, { temperature: 0.8 });
    const albums = JSON.parse(response.content);
    return Array.isArray(albums) ? albums : [];
  } catch (error) {
    logger.error('Error generating album suggestions:', { error: (error as Error).message });
    // Fallback
    return getDefaultAlbums(eventType);
  }
}

/**
 * Generate event description
 */
export async function suggestDescription(
  eventType: string,
  eventTitle: string,
  eventDate?: string
): Promise<string> {
  const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine kurze, einladende Event-Beschreibung auf Deutsch.
Max 2 Sätze, freundlicher Ton, mit Emoji.`;

  const prompt = `Schreibe eine kurze Beschreibung für "${eventTitle}" (${eventType})${eventDate ? ` am ${eventDate}` : ''}.`;

  try {
    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 100 });
    return response.content.trim();
  } catch (error) {
    logger.error('Error generating description:', { error: (error as Error).message });
    return `Willkommen bei ${eventTitle}! 📸 Teilt eure schönsten Momente.`;
  }
}

/**
 * Generate invitation text
 */
export async function suggestInvitationText(
  eventType: string,
  eventTitle: string,
  hostName?: string
): Promise<string> {
  const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere einen kurzen Einladungstext auf Deutsch für Gäste.
Max 3 Sätze, einladend und persönlich, mit Emoji.`;

  const prompt = `Schreibe einen Einladungstext für "${eventTitle}" (${eventType})${hostName ? ` von ${hostName}` : ''}.
Die Gäste sollen motiviert werden, Fotos hochzuladen.`;

  try {
    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 150 });
    return response.content.trim();
  } catch (error) {
    logger.error('Error generating invitation:', { error: (error as Error).message });
    return `Haltet die schönsten Momente von ${eventTitle} fest! 📸 Ladet eure Fotos hoch und teilt sie mit allen Gästen.`;
  }
}

/**
 * Generate challenge ideas
 */
export async function suggestChallenges(eventType: string): Promise<{ title: string; description: string }[]> {
  const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere kreative Foto-Challenge-Ideen auf Deutsch.
Antworte NUR mit einem JSON-Array von Objekten mit "title" und "description".
Beispiel: [{"title": "Selfie mit Brautpaar", "description": "Macht ein Selfie mit den Frischvermählten!"}]`;

  const prompt = `Generiere 5 kreative Foto-Challenge-Ideen für ein "${eventType}" Event.
Jede Challenge sollte einen kurzen Titel und eine einladende Beschreibung haben.`;

  try {
    const response = await generateCompletion(prompt, systemPrompt, { temperature: 0.9 });
    const challenges = JSON.parse(response.content);
    return Array.isArray(challenges) ? challenges : [];
  } catch (error) {
    logger.error('Error generating challenges:', { error: (error as Error).message });
    return getDefaultChallenges(eventType);
  }
}

/**
 * Generate guestbook welcome message
 */
export async function suggestGuestbookMessage(eventType: string, eventTitle: string): Promise<string> {
  const systemPrompt = `Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine einladende Gästebuch-Begrüßungsnachricht auf Deutsch.
Max 2 Sätze, herzlich und persönlich.`;

  const prompt = `Schreibe eine Willkommensnachricht für das Gästebuch von "${eventTitle}" (${eventType}).`;

  try {
    const response = await generateCompletion(prompt, systemPrompt, { maxTokens: 100 });
    return response.content.trim();
  } catch (error) {
    logger.error('Error generating guestbook message:', { error: (error as Error).message });
    return `Herzlich willkommen im Gästebuch! Hinterlasst eure Glückwünsche und Grüße. 💝`;
  }
}

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

/**
 * Suggest color scheme based on event type and optional keywords
 */
export async function suggestColorScheme(
  eventType: string,
  keywords?: string[],
  mood?: string
): Promise<{
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  name: string;
}[]> {
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

  try {
    const response = await generateCompletion(prompt, systemPrompt, { 
      temperature: 0.8,
      maxTokens: 800 
    });
    const schemes = JSON.parse(response.content);
    return Array.isArray(schemes) ? schemes : getDefaultColorSchemes(eventType);
  } catch (error) {
    logger.error('Error generating color schemes:', { error: (error as Error).message });
    return getDefaultColorSchemes(eventType);
  }
}

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

export default {
  generateCompletion,
  suggestAlbums,
  suggestDescription,
  suggestInvitationText,
  suggestChallenges,
  suggestGuestbookMessage,
  suggestColorScheme,
  complete,
};
