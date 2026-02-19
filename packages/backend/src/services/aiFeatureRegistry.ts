/**
 * AI Feature Registry — Single Source of Truth
 * 
 * Zentrale Definition aller AI-Features mit:
 * - Feature-Key (string union type)
 * - Credit-Kosten
 * - Erwarteter Provider-Typ
 * - Kategorie (text/game/image/video/recognition)
 * - Label (deutsch)
 * 
 * Wird importiert von: aiExecution.ts, adminAiProviders.ts, promptTemplates.ts,
 * und den Admin-Dashboard-Seiten (Feature Registry, AI Provider, Prompt Studio).
 */

// ─── Feature Type ────────────────────────────────────────────

export type AiFeature =
  | 'face_switch'
  | 'bg_removal'
  | 'ai_oldify'
  | 'ai_cartoon'
  | 'ai_style_pop'
  | 'style_transfer'
  | 'drawbot'
  | 'highlight_reel'
  | 'compliment_mirror'
  | 'fortune_teller'
  | 'ai_roast'
  | 'chat'
  | 'album_suggest'
  | 'description_suggest'
  | 'invitation_suggest'
  | 'challenge_suggest'
  | 'guestbook_suggest'
  | 'caption_suggest'
  | 'color_scheme'
  | 'face_search'
  | 'ai_categorize'
  | 'time_machine'
  | 'pet_me'
  | 'yearbook'
  | 'celebrity_lookalike'
  | 'ai_bingo'
  | 'ai_dj'
  | 'emoji_me'
  | 'miniature'
  | 'ai_meme'
  | 'ai_superlatives'
  | 'ai_photo_critic'
  | 'ai_couple_match';

// ─── Feature Definition ──────────────────────────────────────

export interface AiFeatureDefinition {
  key: AiFeature;
  label: string;
  description: string;
  category: 'text' | 'game' | 'image' | 'video' | 'recognition';
  providerType: 'LLM' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'FACE_RECOGNITION' | 'STT' | 'TTS';
  creditCost: number;
  isWorkflow: boolean;
}

// ─── Registry ────────────────────────────────────────────────

export const AI_FEATURE_REGISTRY: AiFeatureDefinition[] = [
  // Text / LLM
  { key: 'chat', label: 'KI Chat-Assistent', description: 'FAQ & Event-Hilfe für Hosts', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'album_suggest', label: 'Album-Vorschläge', description: 'KI-generierte Album-Namen', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'description_suggest', label: 'Event-Beschreibung', description: 'Automatische Event-Beschreibungen', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'invitation_suggest', label: 'Einladungstext', description: 'KI-generierte Einladungstexte', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'challenge_suggest', label: 'Challenge-Ideen', description: 'Kreative Foto-Challenge-Vorschläge', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'guestbook_suggest', label: 'Gästebuch-Nachricht', description: 'Willkommensnachrichten für Gästebuch', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'color_scheme', label: 'Farbschema', description: 'Event-Farbschemata generieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'caption_suggest', label: 'Caption Generator', description: 'Social-Media-Captions generieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  { key: 'ai_categorize', label: 'AI Kategorisierung', description: 'Fotos automatisch kategorisieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false },
  // Games
  { key: 'compliment_mirror', label: 'Compliment Mirror', description: 'KI-Komplimente für Selfies', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true },
  { key: 'fortune_teller', label: 'AI Fortune Teller', description: 'Witzige Zukunftsvorhersagen', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true },
  { key: 'ai_roast', label: 'AI Roast', description: 'Liebevoller Comedy-Roast', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true },
  { key: 'celebrity_lookalike', label: 'Celebrity Lookalike', description: 'Welchem Promi siehst du ähnlich?', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true },
  { key: 'ai_bingo', label: 'AI Bingo', description: 'KI-generierte Foto-Aufgaben-Bingo-Karte', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true },
  { key: 'ai_dj', label: 'AI DJ', description: 'KI-Musikvorschläge für die Party', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true },
  { key: 'ai_meme', label: 'AI Meme Generator', description: 'KI-generierte Meme-Captions', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true },
  { key: 'ai_superlatives', label: 'AI Superlatives', description: 'Most likely to... Party-Awards', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true },
  { key: 'ai_photo_critic', label: 'AI Foto-Kritiker', description: 'Humorvolle Foto-Bewertung', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true },
  { key: 'ai_couple_match', label: 'AI Couple Match', description: 'Fun Compatibility-Score', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true },
  // Image
  { key: 'style_transfer', label: 'Style Transfer', description: 'Foto in Kunststil verwandeln', category: 'image', providerType: 'IMAGE_GEN', creditCost: 5, isWorkflow: true },
  { key: 'face_switch', label: 'Face Switch', description: 'Gesichter in Gruppenfotos tauschen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 5, isWorkflow: true },
  { key: 'bg_removal', label: 'Hintergrund entfernen', description: 'Hintergrund aus Fotos entfernen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 3, isWorkflow: true },
  { key: 'ai_oldify', label: 'Oldify', description: 'Alterungs-Effekt auf Fotos', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'ai_cartoon', label: 'Cartoon', description: 'Foto in Cartoon-Stil', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'ai_style_pop', label: 'Style Pop', description: 'Foto in Pop-Art-Stil', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'time_machine', label: 'Time Machine', description: 'Foto in ein anderes Jahrzehnt versetzen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'pet_me', label: 'Pet Me', description: 'Verwandelt dich in ein Tier', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'yearbook', label: 'Yearbook', description: '90er/2000er Yearbook-Foto', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'emoji_me', label: 'Emoji Me', description: 'Selfie in Emoji-Avatar verwandeln', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true },
  { key: 'miniature', label: 'Miniature', description: 'Tilt-Shift Miniatur-Effekt', category: 'image', providerType: 'IMAGE_GEN', creditCost: 3, isWorkflow: true },
  { key: 'drawbot', label: 'Drawbot', description: 'Line-Art G-Code für Zeichenroboter', category: 'image', providerType: 'IMAGE_GEN', creditCost: 8, isWorkflow: true },
  // Video
  { key: 'highlight_reel', label: 'Highlight Reel', description: 'Automatisches Event-Highlight-Video', category: 'video', providerType: 'VIDEO_GEN', creditCost: 10, isWorkflow: true },
  // Recognition
  { key: 'face_search', label: 'Face Search', description: 'Gesichtserkennung "Finde mein Foto"', category: 'recognition', providerType: 'FACE_RECOGNITION', creditCost: 0, isWorkflow: true },
];

// ─── Derived Lookups (computed once) ─────────────────────────

export const AI_FEATURE_MAP: Record<AiFeature, AiFeatureDefinition> = Object.fromEntries(
  AI_FEATURE_REGISTRY.map(f => [f.key, f])
) as Record<AiFeature, AiFeatureDefinition>;

export const AI_CREDIT_COSTS: Record<AiFeature, number> = Object.fromEntries(
  AI_FEATURE_REGISTRY.map(f => [f.key, f.creditCost])
) as Record<AiFeature, number>;

export const AI_ALL_FEATURES: AiFeature[] = AI_FEATURE_REGISTRY.map(f => f.key);

export function getExpectedProviderType(feature: AiFeature | string): string {
  const def = AI_FEATURE_MAP[feature as AiFeature];
  return def?.providerType || 'LLM';
}
