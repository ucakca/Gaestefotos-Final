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

// ─── Device & Package Category Types ───────────────────────────────

export type DeviceType = 'guest_app' | 'photo_booth' | 'mirror_booth' | 'ki_booth' | 'admin_dashboard';

export type AiPackageCategory = 'games' | 'imageEffects' | 'gifVideo' | 'advanced' | 'hostTools' | 'styleTransfer' | 'recognition';

export const ALL_DEVICE_TYPES: DeviceType[] = ['guest_app', 'photo_booth', 'mirror_booth', 'ki_booth', 'admin_dashboard'];

// Guest-facing devices (no admin)
const GUEST_DEVICES: DeviceType[] = ['guest_app', 'photo_booth', 'mirror_booth', 'ki_booth'];
const APP_AND_BOOTH: DeviceType[] = ['guest_app', 'photo_booth', 'ki_booth'];
const APP_ONLY: DeviceType[] = ['guest_app'];
const ADMIN_ONLY: DeviceType[] = ['admin_dashboard'];
const APP_AND_KI: DeviceType[] = ['guest_app', 'ki_booth'];
const ALL_GUEST_PLUS_MIRROR: DeviceType[] = ['guest_app', 'photo_booth', 'mirror_booth', 'ki_booth'];

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
  | 'ai_couple_match'
  | 'persona_quiz'
  | 'wedding_speech'
  | 'ai_stories'
  | 'gif_morph'
  | 'gif_aging'
  | 'ai_video'
  | 'trading_card';

// ─── Feature Definition ──────────────────────────────────────

// Guest-facing UI input flow types
export type AiInputFlow = 'name_only' | 'photo_only' | 'name_and_quiz' | 'name_and_wedding' | 'name_and_words' | 'name_and_mood' | 'name_and_partner' | 'photo_and_video_preset' | 'photo_and_decade' | 'none';

// UI group determines which modal shows the feature
export type AiUiGroup = 'game' | 'effect' | 'host_tool' | 'system';

export interface AiFeatureDefinition {
  key: AiFeature;
  label: string;
  description: string;
  category: 'text' | 'game' | 'image' | 'video' | 'recognition';
  providerType: 'LLM' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'FACE_RECOGNITION' | 'STT' | 'TTS';
  creditCost: number;
  isWorkflow: boolean;
  allowedDevices: DeviceType[];
  packageCategory: AiPackageCategory;
  // ─── UI Metadata (used by guest frontend to render dynamically) ───
  emoji?: string;
  gradient?: string;
  guestDescription?: string;
  endpoint?: string;
  uiGroup?: AiUiGroup;
  inputFlow?: AiInputFlow;
  energyCostCategory?: string;
  sortOrder?: number;
}

// ─── Registry ────────────────────────────────────────────────

export const AI_FEATURE_REGISTRY: AiFeatureDefinition[] = [
  // ═══ Host Tools (admin_dashboard only, no guest UI) ═══
  { key: 'chat', label: 'KI Chat-Assistent', description: 'FAQ & Event-Hilfe für Hosts', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'album_suggest', label: 'Album-Vorschläge', description: 'KI-generierte Album-Namen', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'description_suggest', label: 'Event-Beschreibung', description: 'Automatische Event-Beschreibungen', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'invitation_suggest', label: 'Einladungstext', description: 'KI-generierte Einladungstexte', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'challenge_suggest', label: 'Challenge-Ideen', description: 'Kreative Foto-Challenge-Vorschläge', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'guestbook_suggest', label: 'Gästebuch-Nachricht', description: 'Willkommensnachrichten für Gästebuch', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'color_scheme', label: 'Farbschema', description: 'Event-Farbschemata generieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },
  { key: 'ai_categorize', label: 'AI Kategorisierung', description: 'Fotos automatisch kategorisieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: ADMIN_ONLY, packageCategory: 'hostTools', uiGroup: 'host_tool' },

  // ═══ Guest Games (LLM-based, shown in AiGamesModal) ═══
  { key: 'compliment_mirror', label: 'Compliment Mirror', description: 'KI-Komplimente für Selfies', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: ALL_GUEST_PLUS_MIRROR, packageCategory: 'games',
    emoji: '\u{1FA9E}', gradient: 'from-pink-500 to-rose-500', guestDescription: 'Die KI gibt dir ein einzigartiges Kompliment!', endpoint: '/booth-games/compliment-mirror', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 1 },
  { key: 'fortune_teller', label: 'Fortune Teller', description: 'Witzige Zukunftsvorhersagen', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F52E}', gradient: 'from-purple-600 to-indigo-600', guestDescription: 'Erfahre deine witzige Zukunftsvorhersage!', endpoint: '/booth-games/fortune-teller', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 2 },
  { key: 'ai_roast', label: 'AI Roast', description: 'Liebevoller Comedy-Roast', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F525}', gradient: 'from-orange-500 to-red-500', guestDescription: 'Liebevoller Comedy-Roast \u2014 traust du dich?', endpoint: '/booth-games/ai-roast', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 3 },
  { key: 'caption_suggest', label: 'Caption Generator', description: 'Social-Media-Captions generieren', category: 'text', providerType: 'LLM', creditCost: 1, isWorkflow: false, allowedDevices: APP_ONLY, packageCategory: 'games',
    emoji: '\u{1F4DD}', gradient: 'from-sky-500 to-blue-600', guestDescription: '3 kreative Instagram-Captions für dein Foto!', endpoint: '/booth-games/caption-generator', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 4 },
  { key: 'celebrity_lookalike', label: 'Promi-Doppelgänger', description: 'Welchem Promi siehst du ähnlich?', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F31F}', gradient: 'from-amber-400 to-orange-600', guestDescription: 'Welchem Promi siehst du ähnlich?', endpoint: '/booth-games/celebrity-lookalike', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 5 },
  { key: 'ai_bingo', label: 'Foto-Bingo', description: 'KI-generierte Foto-Aufgaben-Bingo-Karte', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F3B2}', gradient: 'from-green-500 to-emerald-700', guestDescription: 'KI erstellt deine persönliche Bingo-Karte!', endpoint: '/booth-games/ai-bingo', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 6 },
  { key: 'ai_dj', label: 'AI DJ', description: 'KI-Musikvorschläge für die Party', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F3A7}', gradient: 'from-fuchsia-500 to-pink-700', guestDescription: 'KI schlägt die perfekten Party-Songs vor!', endpoint: '/booth-games/ai-dj', uiGroup: 'game', inputFlow: 'name_and_mood', energyCostCategory: 'llm_game', sortOrder: 7 },
  { key: 'ai_meme', label: 'Meme Generator', description: 'KI-generierte Meme-Captions', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F602}', gradient: 'from-yellow-500 to-red-500', guestDescription: 'KI erstellt lustige Party-Memes!', endpoint: '/booth-games/ai-meme', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 8 },
  { key: 'ai_superlatives', label: 'Party Awards', description: 'Most likely to... Party-Awards', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F3C6}', gradient: 'from-amber-500 to-yellow-600', guestDescription: '"Am ehesten..." \u2014 Deine Party-Awards!', endpoint: '/booth-games/ai-superlatives', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 9 },
  { key: 'ai_photo_critic', label: 'Foto-Kritiker', description: 'Humorvolle Foto-Bewertung', category: 'game', providerType: 'LLM', creditCost: 1, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F3A8}', gradient: 'from-indigo-500 to-purple-700', guestDescription: 'KI bewertet dein Foto wie ein Kunstkritiker!', endpoint: '/booth-games/ai-photo-critic', uiGroup: 'game', inputFlow: 'name_only', energyCostCategory: 'llm_game', sortOrder: 10 },
  { key: 'ai_couple_match', label: 'Couple Match', description: 'Fun Compatibility-Score', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F495}', gradient: 'from-rose-400 to-red-600', guestDescription: 'Wie gut passt ihr zusammen? Fun-Score!', endpoint: '/booth-games/ai-couple-match', uiGroup: 'game', inputFlow: 'name_and_partner', energyCostCategory: 'llm_game', sortOrder: 11 },
  { key: 'persona_quiz', label: 'Persona Quiz', description: 'Welcher Party-Typ bist du?', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F9EC}', gradient: 'from-emerald-500 to-teal-600', guestDescription: 'Welcher Party-Typ bist du? 3 Fragen verraten es!', endpoint: '/booth-games/persona-quiz', uiGroup: 'game', inputFlow: 'name_and_quiz', energyCostCategory: 'llm_game', sortOrder: 12 },
  { key: 'wedding_speech', label: 'Hochzeitsrede', description: 'KI-generierte Mini-Hochzeitsrede', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F399}\uFE0F', gradient: 'from-rose-400 to-pink-600', guestDescription: 'KI schreibt dir eine lustige Mini-Rede!', endpoint: '/booth-games/wedding-speech', uiGroup: 'game', inputFlow: 'name_and_wedding', energyCostCategory: 'llm_game', sortOrder: 13 },
  { key: 'ai_stories', label: 'Story Generator', description: '3-W\u00f6rter-Geschichte', category: 'game', providerType: 'LLM', creditCost: 2, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F4D6}', gradient: 'from-violet-500 to-purple-600', guestDescription: 'Gib 3 W\u00f6rter \u2014 die KI erz\u00e4hlt eine Geschichte!', endpoint: '/booth-games/ai-stories', uiGroup: 'game', inputFlow: 'name_and_words', energyCostCategory: 'llm_game', sortOrder: 14 },

  // ═══ Image Effects (shown in AiEffectsModal) ═══
  { key: 'ai_oldify', label: 'Oldify', description: 'Alterungs-Effekt auf Fotos', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F474}', gradient: 'from-amber-600 to-orange-700', guestDescription: 'So siehst du in 40 Jahren aus!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 1 },
  { key: 'ai_cartoon', label: 'Pixar Cartoon', description: 'Foto in Cartoon-Stil', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F3AC}', gradient: 'from-blue-500 to-cyan-500', guestDescription: 'Werde ein 3D Cartoon-Charakter!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 2 },
  { key: 'ai_style_pop', label: 'Style Pop', description: 'Foto in Pop-Art-Stil', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F3A8}', gradient: 'from-fuchsia-500 to-pink-500', guestDescription: 'Dein Foto im Pop-Art-Stil!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 3 },
  { key: 'time_machine', label: 'Time Machine', description: 'Foto in ein anderes Jahrzehnt versetzen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u23F0', gradient: 'from-indigo-500 to-blue-700', guestDescription: 'Reise in ein anderes Jahrzehnt!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_and_decade', energyCostCategory: 'image_effect', sortOrder: 4 },
  { key: 'pet_me', label: 'Pet Me', description: 'Verwandelt dich in ein Tier', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F43E}', gradient: 'from-orange-400 to-amber-600', guestDescription: 'Verwandle dich in ein süßes Tier!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 5 },
  { key: 'yearbook', label: 'Yearbook', description: '90er/2000er Yearbook-Foto', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: ALL_GUEST_PLUS_MIRROR, packageCategory: 'imageEffects',
    emoji: '\u{1F4F8}', gradient: 'from-sky-400 to-blue-600', guestDescription: 'Dein 90er Yearbook-Foto!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 6 },
  { key: 'emoji_me', label: 'Emoji Me', description: 'Selfie in Emoji-Avatar verwandeln', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F60E}', gradient: 'from-yellow-400 to-orange-500', guestDescription: 'Verwandle dich in ein Emoji!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 7 },
  { key: 'miniature', label: 'Miniature', description: 'Tilt-Shift Miniatur-Effekt', category: 'image', providerType: 'IMAGE_GEN', creditCost: 3, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'imageEffects',
    emoji: '\u{1F3E0}', gradient: 'from-lime-400 to-green-600', guestDescription: 'Tilt-Shift Miniatur-Welt!', endpoint: '/booth-games/style-effect', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 8 },
  { key: 'face_switch', label: 'Face Swap', description: 'Gesichter in Gruppenfotos tauschen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 5, isWorkflow: true, allowedDevices: GUEST_DEVICES, packageCategory: 'advanced',
    emoji: '\u{1F504}', gradient: 'from-emerald-500 to-teal-500', guestDescription: 'Gesichter im Gruppenfoto tauschen!', endpoint: '/booth-games/face-switch', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'face_swap', sortOrder: 9 },
  { key: 'bg_removal', label: 'Hintergrund weg', description: 'Hintergrund aus Fotos entfernen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 3, isWorkflow: true, allowedDevices: GUEST_DEVICES, packageCategory: 'advanced',
    emoji: '\u2702\uFE0F', gradient: 'from-violet-500 to-purple-600', guestDescription: 'Hintergrund entfernen \u2014 nur du!', endpoint: '/booth-games/bg-removal', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 10 },
  { key: 'gif_morph', label: 'GIF Morph', description: 'Animiertes GIF in 2 Kunststilen', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u{1F3AD}', gradient: 'from-rose-500 to-amber-500', guestDescription: 'Animiertes GIF: Dein Foto in 2 Kunststilen!', endpoint: '/booth-games/gif-morph', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 11 },
  { key: 'gif_aging', label: 'Aging GIF', description: 'Alterungs-Animation als GIF', category: 'image', providerType: 'IMAGE_GEN', creditCost: 4, isWorkflow: true, allowedDevices: APP_AND_BOOTH, packageCategory: 'imageEffects',
    emoji: '\u231B', gradient: 'from-yellow-600 to-amber-800', guestDescription: 'Zeitreise: So alterst du von 30 bis 90!', endpoint: '/booth-games/gif-aging', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'image_effect', sortOrder: 12 },
  { key: 'ai_video', label: 'AI Video', description: 'Foto wird zum lebendigen Video', category: 'video', providerType: 'VIDEO_GEN', creditCost: 5, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'gifVideo',
    emoji: '\u{1F3AC}', gradient: 'from-red-500 to-pink-600', guestDescription: 'Dein Foto wird zum lebendigen Video!', endpoint: '/booth-games/ai-video', uiGroup: 'effect', inputFlow: 'photo_and_video_preset', energyCostCategory: 'video', sortOrder: 13 },
  { key: 'trading_card', label: 'Trading Card', description: 'Party-Sammelkarte mit KI-Stats', category: 'image', providerType: 'IMAGE_GEN', creditCost: 3, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'games',
    emoji: '\u{1F0CF}', gradient: 'from-yellow-500 to-amber-700', guestDescription: 'Werde zur Party-Sammelkarte mit KI-Stats!', endpoint: '/booth-games/trading-card', uiGroup: 'effect', inputFlow: 'photo_only', energyCostCategory: 'trading_card', sortOrder: 14 },
  { key: 'style_transfer', label: 'Style Transfer', description: 'Foto in Kunststil verwandeln', category: 'image', providerType: 'IMAGE_GEN', creditCost: 5, isWorkflow: true, allowedDevices: APP_AND_KI, packageCategory: 'styleTransfer', uiGroup: 'effect' },
  { key: 'drawbot', label: 'Drawbot', description: 'Line-Art G-Code für Zeichenroboter', category: 'image', providerType: 'IMAGE_GEN', creditCost: 8, isWorkflow: true, allowedDevices: ['ki_booth' as DeviceType], packageCategory: 'advanced', uiGroup: 'system' },

  // ═══ Video ═══
  { key: 'highlight_reel', label: 'Highlight Reel', description: 'Automatisches Event-Highlight-Video', category: 'video', providerType: 'VIDEO_GEN', creditCost: 10, isWorkflow: true, allowedDevices: ADMIN_ONLY, packageCategory: 'gifVideo', uiGroup: 'system' },

  // ═══ Recognition ═══
  { key: 'face_search', label: 'Face Search', description: 'Gesichtserkennung "Finde mein Foto"', category: 'recognition', providerType: 'FACE_RECOGNITION', creditCost: 0, isWorkflow: true, allowedDevices: GUEST_DEVICES, packageCategory: 'recognition', uiGroup: 'system' },
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

// ─── Device & Category Lookups ─────────────────────────────────

export function isFeatureAllowedOnDevice(feature: AiFeature, device: DeviceType): boolean {
  const def = AI_FEATURE_MAP[feature];
  return def ? def.allowedDevices.includes(device) : false;
}

export function getFeaturesForDevice(device: DeviceType): AiFeatureDefinition[] {
  return AI_FEATURE_REGISTRY.filter(f => f.allowedDevices.includes(device));
}

export function getFeaturesForCategory(category: AiPackageCategory): AiFeatureDefinition[] {
  return AI_FEATURE_REGISTRY.filter(f => f.packageCategory === category);
}

export function getPackageCategory(feature: AiFeature): AiPackageCategory {
  const def = AI_FEATURE_MAP[feature];
  return def?.packageCategory || 'games';
}

// Map packageCategory to the FeatureKey used in PackageDefinition
export const PACKAGE_CATEGORY_TO_FEATURE_KEY: Record<AiPackageCategory, string> = {
  games: 'allowAiGames',
  imageEffects: 'allowAiImageEffects',
  gifVideo: 'allowAiGifVideo',
  advanced: 'allowAiAdvanced',
  hostTools: 'allowAiHostTools',
  styleTransfer: 'allowAiStyleTransfer',
  recognition: 'allowFaceSearch',
};
