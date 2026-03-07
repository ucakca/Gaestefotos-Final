/**
 * Seed Script: Migrate hardcoded AI feature configs into ai_pipelines + ai_pipeline_prompts
 * 
 * Sources:
 *   - aiStyleEffects.ts → STYLE_PROMPTS (17 style effects)
 *   - aiFeatureRegistry.ts → Feature metadata (credits, input/output types)
 *   - /workflows/*.json → ComfyUI workflow JSONs
 *   - LLM games → executor=LLM
 *   - Local effects → executor=LOCAL
 * 
 * Run: npx ts-node prisma/seed-pipelines.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const WORKFLOW_DIR = path.join(__dirname, '..', 'src', 'workflows');

function loadWorkflowJson(effect: string): any | null {
  const filePath = path.join(WORKFLOW_DIR, `${effect}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    console.warn(`  ⚠ Could not parse workflow: ${filePath}`);
    return null;
  }
}

interface PipelineSeed {
  featureKey: string;
  name: string;
  description: string;
  executor: 'COMFYUI' | 'LLM' | 'LOCAL' | 'EXTERNAL';
  model?: string;
  inputType: string;
  outputType: string;
  creditCost: number;
  defaultStrength?: number;
  defaultSteps?: number;
  defaultCfg?: number;
  fallbackWorkflow?: string;
  prompt: string;
  negativePrompt?: string;
  systemPrompt?: string;
  editPrompt?: string;
  strength?: number;
}

const PIPELINES: PipelineSeed[] = [
  // ═══ ComfyUI Style Effects (Qwen Image Edit) ═══
  {
    featureKey: 'ai_cartoon', name: 'Pixar Cartoon', description: 'Foto in 3D Pixar Cartoon-Stil verwandeln',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.75, fallbackWorkflow: 'flux_img2img',
    prompt: 'pixar style 3d cartoon character, same person as the original, animated movie character, identical facial features, colorful, expressive, high quality cartoon rendering',
    negativePrompt: 'realistic, photograph, blurry, low quality, dark, different person', strength: 0.75,
  },
  {
    featureKey: 'ai_oldify', name: 'Oldify', description: 'Alterungs-Effekt — so siehst du in 40 Jahren aus',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.65, fallbackWorkflow: 'flux_img2img',
    prompt: 'aged elderly version of the person, wrinkles, grey hair, realistic aging effect, same person but 40 years older, photorealistic',
    negativePrompt: 'young, smooth skin, child, cartoon, unrealistic', strength: 0.65,
  },
  {
    featureKey: 'ai_style_pop', name: 'Style Pop', description: 'Foto im Pop-Art-Stil à la Andy Warhol',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.7, fallbackWorkflow: 'flux_img2img',
    prompt: 'vibrant pop art style, bold colors, andy warhol inspired, high contrast, artistic, modern pop art portrait',
    negativePrompt: 'dull, muted colors, black and white, boring, plain', strength: 0.7,
  },
  {
    featureKey: 'time_machine', name: 'Time Machine', description: 'Foto in ein anderes Jahrzehnt versetzen',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.65, fallbackWorkflow: 'flux_img2img',
    prompt: '1980s retro photo, big hair, neon colors, vintage 80s fashion, synthesizer era, VHS aesthetic, film grain',
    negativePrompt: 'modern, contemporary, high resolution, digital, clean', strength: 0.65,
  },
  {
    featureKey: 'pet_me', name: 'Pet Me', description: 'Verwandelt dich in ein süßes Tier',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.75, fallbackWorkflow: 'flux_img2img',
    prompt: 'adorable anthropomorphic animal version of the person, same facial expression and pose, cute furry animal character, pixar style, high quality, detailed fur texture',
    negativePrompt: 'human, realistic person, scary, horror, ugly', strength: 0.75,
  },
  {
    featureKey: 'yearbook', name: 'Yearbook', description: '90er/2000er Yearbook-Foto',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.6, fallbackWorkflow: 'flux_img2img',
    prompt: 'same person as the original, 1990s yearbook photo, school portrait, blue gradient background, soft lighting, retro 90s hairstyle, vintage school photo, identical face and features, slightly overexposed, warm tones',
    negativePrompt: 'modern, selfie, outdoor, artistic, cartoon, different person, changed face', strength: 0.6,
  },
  {
    featureKey: 'emoji_me', name: 'Emoji Me', description: 'Selfie in Emoji-Avatar verwandeln',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.8, fallbackWorkflow: 'flux_img2img',
    prompt: 'emoji avatar version of the person, round face emoji style, simple cute cartoon, apple emoji aesthetic, big eyes, minimal features, flat design, same hair color and style',
    negativePrompt: 'realistic, photograph, detailed, complex, 3d render, scary', strength: 0.8,
  },
  {
    featureKey: 'miniature', name: 'Miniature', description: 'Tilt-Shift Miniatur-Effekt',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 3, defaultStrength: 0.5, fallbackWorkflow: 'flux_img2img',
    prompt: 'tilt-shift miniature effect, selective focus, toy-like scene, vibrant saturated colors, tiny world effect, diorama photography style',
    negativePrompt: 'normal perspective, flat, dull colors, blurry everywhere', strength: 0.5,
  },
  {
    featureKey: 'anime', name: 'Anime', description: 'Foto im Anime/Manga Stil',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.78, fallbackWorkflow: 'flux_img2img',
    prompt: 'anime manga art style, Studio Ghibli inspired, clean cel-shaded lines, vibrant anime colors, expressive big eyes, detailed anime illustration, high quality digital anime art',
    negativePrompt: 'realistic, photograph, 3d render, western cartoon, dark, horror', strength: 0.78,
  },
  {
    featureKey: 'watercolor', name: 'Aquarell', description: 'Foto als Aquarell-Gemälde',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.72, fallbackWorkflow: 'flux_img2img',
    prompt: 'watercolor painting style, soft wet-on-wet technique, delicate color washes, visible paper texture, loose brushstrokes, impressionistic, fine art watercolor portrait',
    negativePrompt: 'digital, sharp, crisp, photograph, oil paint, acrylic, vector', strength: 0.72,
  },
  {
    featureKey: 'oil_painting', name: 'Ölgemälde', description: 'Foto als klassisches Ölgemälde',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.68, fallbackWorkflow: 'flux_img2img',
    prompt: 'classical oil painting portrait, rich textured brushstrokes, Rembrandt lighting, old masters style, warm golden tones, museum quality fine art, detailed impasto technique',
    negativePrompt: 'photograph, digital, flat, modern, cartoon, anime', strength: 0.68,
  },
  {
    featureKey: 'sketch', name: 'Bleistift-Skizze', description: 'Foto als Bleistift-Zeichnung',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 3, defaultStrength: 0.75, fallbackWorkflow: 'flux_img2img',
    prompt: 'detailed pencil sketch portrait, graphite drawing, fine hatching and cross-hatching, professional illustrator style, high contrast black and white, artistic sketch',
    negativePrompt: 'color, photograph, painting, digital, flat shading', strength: 0.75,
  },
  {
    featureKey: 'neon_noir', name: 'Neon Noir', description: 'Cyberpunk Neon-Noir Stil',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.72, fallbackWorkflow: 'flux_img2img',
    prompt: 'cyberpunk neon noir style, vivid neon lights, rain-slicked streets reflection, dark atmospheric moody lighting, synthwave aesthetic, blade runner inspired, purple and cyan neon glow',
    negativePrompt: 'bright daylight, natural, pastoral, cheerful, clean, white background', strength: 0.72,
  },
  {
    featureKey: 'renaissance', name: 'Renaissance', description: 'Klassisches Renaissance-Gemälde',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.65, fallbackWorkflow: 'flux_img2img',
    prompt: 'Italian Renaissance portrait painting, Leonardo da Vinci style, sfumato technique, warm amber tones, classical composition, detailed fabric and jewelry, museum masterpiece quality',
    negativePrompt: 'modern, digital, cartoon, anime, photograph, contemporary', strength: 0.65,
  },
  {
    featureKey: 'comic_book', name: 'Comic', description: 'Foto im Comic-Buch Stil',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 4, defaultStrength: 0.78, fallbackWorkflow: 'flux_img2img',
    prompt: 'Marvel DC comic book art style, bold ink outlines, halftone dots, dynamic shading, vibrant saturated comic colors, action hero poster style, professional comic illustration',
    negativePrompt: 'photograph, subtle, muted, realistic, anime, soft', strength: 0.78,
  },
  {
    featureKey: 'pixel_art', name: 'Pixel Art', description: '16-Bit Retro Pixel-Art',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 3, defaultStrength: 0.82, fallbackWorkflow: 'flux_img2img',
    prompt: '16-bit pixel art portrait, retro video game sprite style, limited color palette, chunky pixels, SNES era game art, detailed pixel illustration, nostalgic retro gaming aesthetic',
    negativePrompt: 'smooth, anti-aliased, photograph, realistic, 3d render, modern', strength: 0.82,
  },
  {
    featureKey: 'trading_card', name: 'Trading Card', description: 'Party-Sammelkarte mit KI-Stats',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE',
    creditCost: 3, defaultStrength: 0.72, fallbackWorkflow: 'flux_img2img',
    prompt: 'collectible trading card portrait, same person as the original, identical face, holographic foil border, dramatic lighting, epic hero card art, premium card game illustration, detailed character art',
    negativePrompt: 'plain, simple, no border, casual, snapshot, different person, changed face', strength: 0.72,
  },

  // ═══ ComfyUI Face Swap ═══
  {
    featureKey: 'face_switch', name: 'Face Swap', description: 'Gesichter tauschen (Qwen Image Edit / ReActor)',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'MULTI_IMAGE', outputType: 'IMAGE',
    creditCost: 5,
    prompt: 'face swap between detected faces in the group photo',
    negativePrompt: 'distorted face, artifacts, blurry',
  },

  // ═══ ComfyUI GIF/Video ═══
  {
    featureKey: 'gif_morph', name: 'GIF Morph', description: 'Animiertes GIF in 2 Kunststilen',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'GIF',
    creditCost: 4, defaultStrength: 0.6,
    prompt: 'smooth morphing transformation, sequential animation frames, dynamic motion, fluid transition effect',
    negativePrompt: 'static, still, blurry, low quality', strength: 0.6,
  },
  {
    featureKey: 'gif_aging', name: 'Aging GIF', description: 'Alterungs-Animation als GIF',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'GIF',
    creditCost: 4, defaultStrength: 0.65,
    prompt: 'progressive aging transformation, from young to old, realistic aging sequence, wrinkles developing, grey hair',
    negativePrompt: 'static, unchanged, smooth skin only, young only', strength: 0.65,
  },
  {
    featureKey: 'ai_video', name: 'AI Video', description: 'Foto wird zum lebendigen Video (WAN 2.1)',
    executor: 'COMFYUI', model: 'wan_2.1_i2v', inputType: 'SINGLE_IMAGE', outputType: 'VIDEO',
    creditCost: 5,
    prompt: 'subtle natural motion, gentle movement, cinematic, high quality video',
    negativePrompt: 'static, frozen, glitch, artifacts',
  },

  // ═══ LLM Games ═══
  {
    featureKey: 'compliment_mirror', name: 'Compliment Mirror', description: 'KI-Komplimente für Selfies',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 2,
    prompt: 'Give a warm, creative compliment to the person in the photo.',
    systemPrompt: 'Du bist ein charmanter Compliment Mirror auf einer Party. Gib dem Gast ein einzigartiges, kreatives Kompliment basierend auf dem Foto. Sei witzig, warmherzig und persönlich. Maximal 2-3 Sätze auf Deutsch.',
  },
  {
    featureKey: 'fortune_teller', name: 'Fortune Teller', description: 'Witzige Zukunftsvorhersagen',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_ONLY', outputType: 'TEXT', creditCost: 2,
    prompt: 'Create a fun, lighthearted fortune prediction for the guest.',
    systemPrompt: 'Du bist eine mystische Wahrsagerin auf einer Party. Erstelle eine witzige, kreative Zukunftsvorhersage für den Gast. Sei humorvoll und positiv. 2-3 Sätze auf Deutsch.',
  },
  {
    featureKey: 'ai_roast', name: 'AI Roast', description: 'Liebevoller Comedy-Roast',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 2,
    prompt: 'Give a light, fun roast based on the photo — keep it PG and friendly.',
    systemPrompt: 'Du bist ein liebevoller Comedy-Roaster auf einer Party. Gib dem Gast einen harmlosen, witzigen Roast basierend auf dem Foto. Sei kreativ aber niemals verletzend. Maximal 2-3 Sätze auf Deutsch.',
  },
  {
    featureKey: 'caption_suggest', name: 'Caption Generator', description: 'Social-Media-Captions generieren',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 1,
    prompt: 'Generate 3 creative Instagram captions for this party photo.',
    systemPrompt: 'Du bist ein Social-Media-Experte. Erstelle 3 kreative, witzige Instagram-Captions für das Party-Foto. Nutze passende Emojis und Hashtags. Auf Deutsch.',
  },
  {
    featureKey: 'celebrity_lookalike', name: 'Promi-Doppelgänger', description: 'Welchem Promi siehst du ähnlich?',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 2,
    prompt: 'Analyze the photo and determine which celebrity the person looks like.',
    systemPrompt: 'Du bist ein Entertainment-Experte auf einer Party. Analysiere das Foto und sage dem Gast, welchem Promi er/sie ähnlich sieht. Sei kreativ und schmeichelhaft. 2-3 Sätze auf Deutsch.',
  },
  {
    featureKey: 'ai_bingo', name: 'Foto-Bingo', description: 'KI-generierte Foto-Aufgaben-Bingo-Karte',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_ONLY', outputType: 'JSON', creditCost: 1,
    prompt: 'Create a fun 4x4 photo bingo card with creative photo challenges for a party.',
    systemPrompt: 'Du bist ein Party-Spiele-Experte. Erstelle eine 4x4 Foto-Bingo-Karte mit 16 kreativen, lustigen Foto-Aufgaben für eine Party. Antworte als JSON Array mit 16 kurzen Aufgaben auf Deutsch.',
  },
  {
    featureKey: 'ai_dj', name: 'AI DJ', description: 'KI-Musikvorschläge für die Party',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Suggest 5 perfect party songs based on the mood description.',
    systemPrompt: 'Du bist ein Party-DJ. Schlage 5 perfekte Songs vor basierend auf der beschriebenen Stimmung. Gib Titel, Künstler und warum der Song passt. Auf Deutsch.',
  },
  {
    featureKey: 'ai_meme', name: 'Meme Generator', description: 'KI-generierte Meme-Captions',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 1,
    prompt: 'Create a funny meme caption for this party photo.',
    systemPrompt: 'Du bist ein Meme-Experte. Erstelle eine lustige Meme-Caption für das Party-Foto. Denke an virale Internet-Memes. Auf Deutsch.',
  },
  {
    featureKey: 'ai_superlatives', name: 'Party Awards', description: '"Most likely to..." Party-Awards',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Create 3 fun "most likely to..." superlatives for the party guest.',
    systemPrompt: 'Du bist ein Party-Moderator. Erstelle 3 lustige "Am ehesten..." Superlative für den Gast. Sei kreativ und positiv. Auf Deutsch.',
  },
  {
    featureKey: 'ai_photo_critic', name: 'Foto-Kritiker', description: 'Humorvolle Foto-Bewertung',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'NAME_AND_PHOTO', outputType: 'TEXT', creditCost: 1,
    prompt: 'Review this photo as if you were a famous art critic.',
    systemPrompt: 'Du bist ein humorvoller Kunstkritiker. Bewerte das Foto als wäre es ein Kunstwerk in einer Galerie. Sei dramatisch, übertrieben aber liebevoll. 2-3 Sätze auf Deutsch.',
  },
  {
    featureKey: 'ai_couple_match', name: 'Couple Match', description: 'Fun Compatibility-Score',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 2,
    prompt: 'Create a fun compatibility analysis between two party guests.',
    systemPrompt: 'Du bist ein lustiger Kompatibilitäts-Experte auf einer Party. Erstelle eine witzige Kompatibilitäts-Analyse mit Prozent-Score. Auf Deutsch.',
  },
  {
    featureKey: 'persona_quiz', name: 'Persona Quiz', description: 'Welcher Party-Typ bist du?',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 2,
    prompt: 'Based on the quiz answers, determine what party personality type the guest is.',
    systemPrompt: 'Du bist ein Persönlichkeits-Experte. Basierend auf den Quiz-Antworten, bestimme den Party-Typ des Gastes. Gib einen lustigen Titel und Beschreibung. Auf Deutsch.',
  },
  {
    featureKey: 'wedding_speech', name: 'Hochzeitsrede', description: 'KI-generierte Mini-Hochzeitsrede',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 2,
    prompt: 'Write a short, heartfelt and funny wedding speech.',
    systemPrompt: 'Du bist ein charmanter Redenschreiber. Erstelle eine kurze, herzliche und witzige Mini-Hochzeitsrede (max 4-5 Sätze). Auf Deutsch.',
  },
  {
    featureKey: 'ai_stories', name: 'Story Generator', description: '3-Wörter-Geschichte',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 2,
    prompt: 'Create a short, fun story from the 3 given words.',
    systemPrompt: 'Du bist ein kreativer Geschichtenerzähler auf einer Party. Erstelle eine kurze, witzige Geschichte aus den 3 gegebenen Wörtern. Max 4-5 Sätze. Auf Deutsch.',
  },

  // ═══ LLM Host Tools ═══
  {
    featureKey: 'chat', name: 'KI Chat-Assistent', description: 'FAQ & Event-Hilfe für Hosts',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Answer the host question about their event.',
    systemPrompt: 'Du bist ein hilfreicher Event-Assistent für gästefotos.com. Hilf dem Host bei Fragen zu seinem Event, Fotos, Einstellungen und Features. Antworte präzise und freundlich auf Deutsch.',
  },
  {
    featureKey: 'album_suggest', name: 'Album-Vorschläge', description: 'KI-generierte Album-Namen',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Suggest creative album names for the event.',
    systemPrompt: 'Du bist ein kreativer Event-Berater. Schlage 5 kreative Album-Namen für das Event vor. Auf Deutsch.',
  },
  {
    featureKey: 'description_suggest', name: 'Event-Beschreibung', description: 'Automatische Event-Beschreibungen',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Write an engaging event description.',
    systemPrompt: 'Du bist ein Event-Texter. Schreibe eine einladende Event-Beschreibung basierend auf den gegebenen Infos. Max 3 Sätze. Auf Deutsch.',
  },
  {
    featureKey: 'invitation_suggest', name: 'Einladungstext', description: 'KI-generierte Einladungstexte',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Write a creative event invitation text.',
    systemPrompt: 'Du bist ein Event-Einladungs-Experte. Schreibe einen einladenden, kreativen Einladungstext. Auf Deutsch.',
  },
  {
    featureKey: 'challenge_suggest', name: 'Challenge-Ideen', description: 'Kreative Foto-Challenge-Vorschläge',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Suggest fun photo challenges for an event.',
    systemPrompt: 'Du bist ein Foto-Challenge-Experte. Schlage 5 kreative, lustige Foto-Challenges vor, die zur Party passen. Auf Deutsch.',
  },
  {
    featureKey: 'guestbook_suggest', name: 'Gästebuch-Nachricht', description: 'Willkommensnachrichten für Gästebuch',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'TEXT', creditCost: 1,
    prompt: 'Write a warm guestbook welcome message.',
    systemPrompt: 'Du bist ein warmherziger Gastgeber. Schreibe eine einladende Gästebuch-Willkommensnachricht. 2-3 Sätze. Auf Deutsch.',
  },
  {
    featureKey: 'color_scheme', name: 'Farbschema', description: 'Event-Farbschemata generieren',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'TEXT_ONLY', outputType: 'JSON', creditCost: 1,
    prompt: 'Generate a color scheme for the event.',
    systemPrompt: 'Du bist ein Designer. Generiere ein Farbschema (5 Farben als Hex-Codes) für das beschriebene Event. Antworte als JSON mit {colors: [...], name: "..."}.',
  },
  {
    featureKey: 'ai_categorize', name: 'AI Kategorisierung', description: 'Fotos automatisch kategorisieren',
    executor: 'LLM', model: 'gpt-4o-mini', inputType: 'SINGLE_IMAGE', outputType: 'JSON', creditCost: 1,
    prompt: 'Categorize this event photo.',
    systemPrompt: 'Du bist ein Foto-Analyst. Kategorisiere das Event-Foto in passende Kategorien (z.B. Gruppenfotos, Paar, Selfie, Deko, Essen, Tanz). Antworte als JSON.',
  },

  // ═══ Local Processing ═══
  {
    featureKey: 'bg_removal', name: 'Hintergrund weg', description: 'Hintergrund aus Fotos entfernen (lokal)',
    executor: 'LOCAL', model: 'rembg', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE', creditCost: 3,
    prompt: 'Remove background from photo',
  },
  {
    featureKey: 'photo_strip', name: 'Photo Strip', description: 'Klassischer 4-er Foto-Streifen',
    executor: 'LOCAL', model: 'sharp_canvas', inputType: 'MULTI_IMAGE', outputType: 'IMAGE', creditCost: 0,
    prompt: 'Arrange 4 photos as a classic photo strip layout',
  },
  {
    featureKey: 'cover_shot', name: 'Cover-Shooting', description: 'Magazin-Cover Overlay',
    executor: 'LOCAL', model: 'sharp_overlay', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE', creditCost: 0,
    prompt: 'Apply magazine cover overlay template to photo',
  },
  {
    featureKey: 'face_search', name: 'Face Search', description: 'Gesichtserkennung "Finde mein Foto"',
    executor: 'LOCAL', model: 'arcface_512', inputType: 'SINGLE_IMAGE', outputType: 'JSON', creditCost: 0,
    prompt: 'Find photos matching the uploaded face',
  },
  {
    featureKey: 'ai_slot_machine', name: 'AI Slot Machine', description: 'Emoji-Kombination → KI-generiertes Bild',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'NONE', outputType: 'IMAGE', creditCost: 5,
    prompt: 'Generate a creative image from the emoji combination',
  },
  {
    featureKey: 'drawbot', name: 'Drawbot', description: 'Line-Art G-Code für Zeichenroboter',
    executor: 'LOCAL', model: 'potrace_gcode', inputType: 'SINGLE_IMAGE', outputType: 'JSON', creditCost: 8,
    prompt: 'Convert photo to line-art G-Code for drawing robot',
  },
  {
    featureKey: 'highlight_reel', name: 'Highlight Reel', description: 'Automatisches Event-Highlight-Video',
    executor: 'LOCAL', model: 'ffmpeg', inputType: 'MULTI_IMAGE', outputType: 'VIDEO', creditCost: 10,
    prompt: 'Create highlight video from event photos with transitions and music',
  },
  {
    featureKey: 'style_transfer', name: 'Style Transfer', description: 'Foto in Kunststil verwandeln (legacy)',
    executor: 'COMFYUI', model: 'qwen_image_edit', inputType: 'SINGLE_IMAGE', outputType: 'IMAGE', creditCost: 5,
    prompt: 'Transform the photo into the selected art style',
  },
];

// ─── Default Node Layout Builder ────────────────────────────────────────────

function buildDefaultNodes(executor: string, inputType: string, outputType: string) {
  const nodes: any[] = [];

  nodes.push({
    nodeId: 'input_1', nodeType: 'input',
    label: ['TEXT_ONLY', 'NAME_ONLY'].includes(inputType) ? 'Text Input' : 'Foto Upload',
    positionX: 50, positionY: 150,
    config: { inputType },
    connections: [{ targetNodeId: 'processor_1', targetPort: 'input' }],
  });

  nodes.push({
    nodeId: 'prompt_1', nodeType: 'config',
    label: 'Prompt Config',
    positionX: 250, positionY: 50,
    config: { configType: 'prompt' },
    connections: [{ targetNodeId: 'processor_1', targetPort: 'prompt' }],
  });

  const processorLabel = executor === 'COMFYUI' ? 'ComfyUI Processor'
    : executor === 'LLM' ? 'LLM Processor'
    : executor === 'LOCAL' ? 'Local Processor' : 'External API';

  nodes.push({
    nodeId: 'processor_1', nodeType: 'processor',
    label: processorLabel,
    positionX: 450, positionY: 150,
    config: { executor },
    connections: [{ targetNodeId: 'output_1', targetPort: 'input' }],
  });

  const outputLabel = outputType === 'TEXT' ? 'Text Output'
    : outputType === 'VIDEO' ? 'Video Output'
    : outputType === 'GIF' ? 'GIF Output'
    : outputType === 'JSON' ? 'JSON Output' : 'Image Output';

  nodes.push({
    nodeId: 'output_1', nodeType: 'output',
    label: outputLabel,
    positionX: 700, positionY: 150,
    config: { outputType },
    connections: [],
  });

  return nodes;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding AI Pipelines...\n');

  let created = 0;
  let skipped = 0;

  for (const p of PIPELINES) {
    const existing = await prisma.aiPipeline.findUnique({ where: { featureKey: p.featureKey } });
    if (existing) {
      console.log(`  ⏭  ${p.featureKey} — already exists`);
      skipped++;
      continue;
    }

    // Load workflow JSON for ComfyUI pipelines
    let workflowJson = null;
    if (p.executor === 'COMFYUI') {
      workflowJson = loadWorkflowJson(p.featureKey);
      if (workflowJson) console.log(`  📦 ${p.featureKey} — loaded workflow JSON`);
    }

    await prisma.$transaction(async (tx) => {
      const pipeline = await tx.aiPipeline.create({
        data: {
          featureKey: p.featureKey,
          name: p.name,
          description: p.description,
          executor: p.executor as any,
          model: p.model,
          workflowJson,
          fallbackWorkflow: p.fallbackWorkflow,
          inputType: p.inputType as any,
          outputType: p.outputType as any,
          defaultStrength: p.defaultStrength,
          defaultSteps: p.defaultSteps,
          defaultCfg: p.defaultCfg,
          creditCost: p.creditCost,
          isActive: true,
          isDefault: true,
        },
      });

      await tx.aiPipelinePrompt.create({
        data: {
          pipelineId: pipeline.id,
          prompt: p.prompt,
          negativePrompt: p.negativePrompt || null,
          systemPrompt: p.systemPrompt || null,
          editPrompt: p.editPrompt || null,
          strength: p.strength,
          version: 1,
          isActive: true,
          changelog: 'Initial seed from hardcoded config',
        },
      });

      const nodesDef = buildDefaultNodes(p.executor, p.inputType, p.outputType);
      for (const n of nodesDef) {
        await tx.aiPipelineNode.create({
          data: {
            pipelineId: pipeline.id,
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            label: n.label,
            positionX: n.positionX,
            positionY: n.positionY,
            config: n.config,
            connections: n.connections,
          },
        });
      }
    });

    console.log(`  ✅ ${p.featureKey} — created (${p.executor})`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}, Total: ${PIPELINES.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
