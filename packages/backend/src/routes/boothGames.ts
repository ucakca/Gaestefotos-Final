import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { withEnergyCheck } from '../middleware/energyCheck';
import prisma from '../config/database';
import { enrichSystemPrompt } from '../services/eventPromptContext';
import { logger } from '../utils/logger';
import { createPhotoStrip, STRIP_TEMPLATES } from '../services/photoStrip';
import {
  GAME_CATALOG,
  spinSlotMachine,
  spinAiSlotMachine,
  generateCompliment,
  generateComplimentAI,
  generateFortuneTellerAI,
  generateRoastAI,
  getRandomMimikChallenge,
  scoreMimik,
  getRandomOverlay,
  createGameSession,
  getGameSession,
  updateGameSession,
} from '../services/boothGames';

const router = Router();

/**
 * Resolve system prompt for an LLM game feature.
 * Checks Prompt Studio DB overrides first, falls back to hardcoded prompt.
 */
async function resolveSystemPrompt(featureKey: string, eventId: string | undefined, fallback: string): Promise<string> {
  if (!eventId) return fallback;
  try {
    const { resolvePrompt } = await import('../services/promptTemplates');
    const tpl = await resolvePrompt(featureKey as any, eventId);
    return tpl?.systemPrompt || fallback;
  } catch {
    return fallback;
  }
}

// GET /api/booth-games/catalog — List all available games
router.get('/catalog', (_req, res: Response) => {
  res.json({ games: GAME_CATALOG });
});

// POST /api/booth-games/slot-machine/ai-spin — Spin AI Slot Machine (emojis for image generation)
router.post('/slot-machine/ai-spin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const result = spinAiSlotMachine();
    const session = createGameSession(eventId, 'slot_machine', result);
    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('AI Slot spin error', { message: (error as Error).message });
    res.status(500).json({ error: 'AI Slot Machine Fehler' });
  }
});

// POST /api/booth-games/slot-machine/spin — Spin the virtual slot machine
router.post('/slot-machine/spin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const result = spinSlotMachine();
    const session = createGameSession(eventId, 'slot_machine', result);

    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('Slot machine spin error', { message: (error as Error).message });
    res.status(500).json({ error: 'Slot Machine Fehler' });
  }
});

// POST /api/booth-games/compliment-mirror — Get an AI-generated compliment (with fallback)
router.post('/compliment-mirror', authMiddleware, withEnergyCheck('compliment_mirror'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, useAI } = req.body;

    let result: { compliment: string; verdict: string; source?: string };

    // Use AI if requested (default: true), fall back to random on failure
    if (useAI !== false) {
      result = await generateComplimentAI({
        eventId: eventId || undefined,
        eventType: eventType || undefined,
        eventTitle: eventTitle || undefined,
        guestName: guestName || undefined,
      });
    } else {
      result = { ...generateCompliment(), source: 'random' };
    }

    const session = createGameSession(eventId, 'compliment_mirror', result);

    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('Compliment mirror error', { message: (error as Error).message });
    // Ultimate fallback: random compliment
    const fallback = generateCompliment();
    res.json({ ...fallback, source: 'fallback' });
  }
});

// POST /api/booth-games/fortune-teller — Get an AI-generated fortune prediction
router.post('/fortune-teller', authMiddleware, withEnergyCheck('fortune_teller'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;

    const result = await generateFortuneTellerAI({
      eventId: eventId || undefined,
      eventType: eventType || undefined,
      eventTitle: eventTitle || undefined,
      guestName: guestName || undefined,
    });

    const session = createGameSession(eventId, 'fortune_teller', result);
    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('Fortune teller error', { message: (error as Error).message });
    res.json({ prediction: 'Die Sterne sind heute etwas schüchtern... Versuch es gleich nochmal! 🌟', luckyItem: '🍀', luckyNumber: 7, source: 'fallback' });
  }
});

// POST /api/booth-games/ai-roast — Get a loving AI roast
router.post('/ai-roast', authMiddleware, withEnergyCheck('ai_roast'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;

    const result = await generateRoastAI({
      eventId: eventId || undefined,
      eventType: eventType || undefined,
      eventTitle: eventTitle || undefined,
      guestName: guestName || undefined,
    });

    const session = createGameSession(eventId, 'ai_roast', result);
    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('AI roast error', { message: (error as Error).message });
    res.json({ roast: 'Die KI ist gerade sprachlos — das passiert selten! 😂', rescue: 'Das bedeutet: Du bist einfach zu cool zum Roasten! 🔥', source: 'fallback' });
  }
});

// POST /api/booth-games/mimik-duell/challenge — Get a random mimik challenge
router.post('/mimik-duell/challenge', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const challenge = getRandomMimikChallenge();
    const session = createGameSession(eventId, 'mimik_duell', { challenge });

    res.json({ sessionId: session.id, challenge });
  } catch (error) {
    logger.error('Mimik duell challenge error', { message: (error as Error).message });
    res.status(500).json({ error: 'Mimik-Duell Fehler' });
  }
});

// POST /api/booth-games/mimik-duell/score — Score a mimik attempt
router.post('/mimik-duell/score', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = getGameSession(sessionId);

    const score = scoreMimik();
    if (session) {
      updateGameSession(sessionId, { score });
    }

    let rank = 'Anfänger';
    if (score >= 90) rank = 'Mimik-Meister 🏆';
    else if (score >= 80) rank = 'Grimassen-Genie 🌟';
    else if (score >= 70) rank = 'Ausdrucks-Artist 🎭';
    else if (score >= 60) rank = 'Gesichts-Akrobat 😄';

    res.json({ score, rank, sessionId });
  } catch (error) {
    logger.error('Mimik duell score error', { message: (error as Error).message });
    res.status(500).json({ error: 'Bewertungs-Fehler' });
  }
});

// POST /api/booth-games/mystery-overlay — Get a random mystery overlay
router.post('/mystery-overlay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const overlay = getRandomOverlay();
    const session = createGameSession(eventId, 'mystery_overlay', { overlay });

    res.json({ sessionId: session.id, overlay });
  } catch (error) {
    logger.error('Mystery overlay error', { message: (error as Error).message });
    res.status(500).json({ error: 'Mystery Overlay Fehler' });
  }
});

// POST /api/booth-games/vows-and-views — Save a Vows & Views entry
router.post('/vows-and-views', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, message, guestName } = req.body;

    if (!eventId || !message) {
      return res.status(400).json({ error: 'eventId und message sind erforderlich' });
    }

    // Save as guestbook entry
    const entry = await (await import('../config/database')).default.guestbookEntry.create({
      data: {
        eventId,
        authorName: guestName || 'Anonym',
        message,
      },
    });

    res.status(201).json({ entry });
  } catch (error) {
    logger.error('Vows and views error', { message: (error as Error).message });
    res.status(500).json({ error: 'Vows & Views Fehler' });
  }
});

// POST /api/booth-games/face-swap-template — Swap guest face onto a template image (Iron Man, wedding etc.)
router.post('/face-swap-template', authMiddleware, withEnergyCheck('face_switch'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, templateUrl, templateId } = req.body;
    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }
    if (!templateUrl && !templateId) {
      return res.status(400).json({ error: 'templateUrl oder templateId ist erforderlich' });
    }

    // 1. Get source photo (guest face)
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { storagePath: true, eventId: true },
    });
    if (!photo?.storagePath) return res.status(404).json({ error: 'Foto nicht gefunden' });

    // 2. Resolve template URL
    let resolvedTemplateUrl = templateUrl;
    if (templateId) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "imageUrl" FROM face_swap_templates WHERE id = $1 AND "isActive" = true LIMIT 1`,
        templateId
      );
      if (!rows[0]) return res.status(404).json({ error: 'Template nicht gefunden' });
      resolvedTemplateUrl = rows[0].imageUrl;
    }

    // 3. Prepare AI execution
    const { prepareAiExecution, logAiUsage } = await import('../services/aiExecution');
    const execution = await prepareAiExecution(req.userId!, 'face_switch', eventId);
    if (!execution.success) throw new Error(execution.error || 'AI-Feature nicht verfügbar');

    // 4. Get guest photo buffer
    const { storageService } = await import('../services/storage');
    const guestBuffer = await storageService.getFile(photo.storagePath);
    const guestB64 = guestBuffer.toString('base64');

    // 5. Download template image
    const templateRes = await fetch(resolvedTemplateUrl);
    if (!templateRes.ok) throw new Error(`Template konnte nicht geladen werden: ${templateRes.status}`);
    const templateBuffer = Buffer.from(await templateRes.arrayBuffer());
    const templateB64 = templateBuffer.toString('base64');

    const provider = execution.provider!;
    const startTime = Date.now();
    let outputUrl = '';

    // 6. Call AI provider
    if (provider.slug?.includes('fal') || provider.baseUrl?.includes('fal.run')) {
      const model = provider.model || 'fal-ai/inswapper';
      const apiUrl = `https://fal.run/${model}`;
      let apiKey = provider.apiKey || '';
      if (!apiKey && provider.apiKeyEncrypted) {
        const { decryptValue } = await import('../utils/encryption');
        apiKey = decryptValue({ encrypted: provider.apiKeyEncrypted, iv: provider.apiKeyIv, tag: provider.apiKeyTag });
      }
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_url: `data:image/jpeg;base64,${templateB64}`,
          swap_image_url: `data:image/jpeg;base64,${guestB64}`,
        }),
      });
      if (!r.ok) throw new Error(`FAL.ai error ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const data: any = await r.json();
      outputUrl = data?.image?.url ?? data?.images?.[0]?.url ?? '';
    } else {
      // Replicate
      const baseUrl = provider.baseUrl || 'https://api.replicate.com';
      const model = provider.model || 'deepinsight/insightface:35cfef47cf6a671d9a3b4e3ddd3bbd254e4956b35ecdca1d27578d987ae6feae';
      const version = model.includes(':') ? model.split(':')[1] : model;
      let apiKey = provider.apiKey || '';
      if (!apiKey && provider.apiKeyEncrypted) {
        const { decryptValue } = await import('../utils/encryption');
        apiKey = decryptValue({ encrypted: provider.apiKeyEncrypted, iv: provider.apiKeyIv, tag: provider.apiKeyTag });
      }
      const createRes = await fetch(`${baseUrl}/v1/predictions`, {
        method: 'POST',
        headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          input: {
            target_image: `data:image/jpeg;base64,${templateB64}`,
            source_image: `data:image/jpeg;base64,${guestB64}`,
          },
        }),
      });
      if (!createRes.ok) throw new Error(`Replicate error ${createRes.status}`);
      let result: any = await createRes.json();
      for (let i = 0; i < 60; i++) {
        if (result.status === 'succeeded') break;
        if (result.status === 'failed' || result.status === 'canceled') throw new Error(`Replicate: ${result.error}`);
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(result.urls.get, { headers: { Authorization: `Token ${apiKey}` } });
        result = await poll.json();
      }
      outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    }

    if (!outputUrl) throw new Error('Kein Output von AI-Provider');

    // 7. Download result + save to storage
    const resultBuf = outputUrl.startsWith('data:')
      ? Buffer.from(outputUrl.split(',')[1], 'base64')
      : Buffer.from(await (await fetch(outputUrl)).arrayBuffer());

    const savedPath = await storageService.uploadFile(eventId, `face-swap-template-${photoId}-${Date.now()}.jpg`, resultBuf, 'image/jpeg');
    const savedUrl = await storageService.getFileUrl(savedPath);

    await logAiUsage(provider.id, 'face_switch', {
      providerType: provider.type,
      durationMs: Date.now() - startTime,
      success: true,
    });

    res.json({ success: true, outputUrl: savedUrl, storagePath: savedPath });
  } catch (error) {
    logger.error('Face swap template error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Face Swap Template Fehler' });
  }
});

// POST /api/booth-games/face-switch — Swap faces in a group photo
router.post('/face-switch', authMiddleware, withEnergyCheck('face_switch'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const { processFaceSwitchForPhoto } = await import('../services/faceSwitch');
    const result = await processFaceSwitchForPhoto(photoId, req.userId!);

    res.json({
      success: true,
      newPhotoPath: result.newPhotoPath,
      facesSwapped: result.facesSwapped,
      usedAi: result.usedAi,
    });
  } catch (error) {
    logger.error('Face switch error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Face Switch Fehler' });
  }
});

// POST /api/booth-games/style-effect — Apply AI style effect (dynamic energy check per effect)
router.post('/style-effect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, effect, intensity, outputFormat, eventId } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const validEffects = ['ai_oldify', 'ai_cartoon', 'ai_style_pop', 'time_machine', 'pet_me', 'yearbook', 'emoji_me', 'miniature', 'gif_morph', 'gif_aging', 'trading_card', 'anime', 'watercolor', 'oil_painting', 'sketch', 'neon_noir', 'renaissance', 'comic_book', 'pixel_art'];
    if (!effect || !validEffects.includes(effect)) {
      return res.status(400).json({ error: `Ungültiger Effekt. Erlaubt: ${validEffects.join(', ')}` });
    }

    // Dynamic energy check: use the actual effect key so each effect's cost is charged correctly
    if (eventId) {
      const { checkAndSpendEnergy } = await import('../middleware/energyCheck');
      const energyResult = await checkAndSpendEnergy(req, eventId, effect as any);
      if (!energyResult.success) {
        return res.status(429).json({
          error: 'Nicht genug AI-Energie',
          code: 'INSUFFICIENT_ENERGY',
          energy: { cost: energyResult.cost, currentBalance: energyResult.newBalance },
        });
      }
    }

    const { processStyleEffectForPhoto } = await import('../services/aiStyleEffects');
    const result = await processStyleEffectForPhoto(photoId, req.userId!, effect, {
      intensity: intensity ? Number(intensity) : undefined,
      outputFormat: outputFormat || 'jpeg',
      variant: req.body.variant || undefined,
    });

    res.json({
      success: true,
      newPhotoPath: result.newPhotoPath,
      effect,
    });
  } catch (error) {
    logger.error('Style effect error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Style-Effekt Fehler' });
  }
});

// POST /api/booth-games/bg-removal — Remove background from a photo
router.post('/bg-removal', authMiddleware, withEnergyCheck('bg_removal'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, replacementColor, outputFormat } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const { processBgRemovalForPhoto } = await import('../services/bgRemoval');
    const result = await processBgRemovalForPhoto(photoId, req.userId!, {
      replacementColor,
      outputFormat: outputFormat || 'png',
    });

    res.json({
      success: true,
      newPhotoPath: result.newPhotoPath,
    });
  } catch (error) {
    logger.error('BG removal error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Hintergrund-Entfernung Fehler' });
  }
});

// POST /api/booth-games/caption-generator — Generate social media captions
router.post('/caption-generator', authMiddleware, withEnergyCheck('caption_suggest'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle } = req.body;

    const { resolvePrompt, renderPrompt } = await import('../services/promptTemplates');
    const { generateCompletion } = await import('../lib/groq');

    const prompt = await resolvePrompt('caption_suggest', eventId);
    const systemPrompt = prompt.systemPrompt || 'Du bist ein Social-Media-Experte. Generiere kreative Instagram-Captions auf Deutsch. Antworte NUR mit einem JSON-Array von Strings.';
    const userPromptTpl = prompt.userPromptTpl || 'Generiere 3 Instagram-Captions für ein Foto von "{{eventType}}".';
    const context = eventType || eventTitle || 'Party';
    const userPrompt = renderPrompt(userPromptTpl, { eventType: context });

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), {
      maxTokens: prompt.maxTokens || 200,
      temperature: prompt.temperature || 0.85,
    });

    let captions: string[] = [];
    try {
      const jsonMatch = response.content.trim().match(/\[[\s\S]*\]/);
      if (jsonMatch) captions = JSON.parse(jsonMatch[0]);
    } catch {
      captions = [response.content.trim()];
    }

    const session = createGameSession(eventId, 'caption_suggest', { captions });
    res.json({ sessionId: session.id, captions, source: 'ai' });
  } catch (error) {
    logger.error('Caption generator error', { message: (error as Error).message });
    res.json({
      captions: [
        'Beste Nacht ever! 🎉 #party #memories',
        'Making memories, one photo at a time 📸 #gästefotos',
        'Die besten Geschichten beginnen auf der Tanzfläche 💃 #nightout',
      ],
      source: 'fallback',
    });
  }
});

// POST /api/booth-games/persona-quiz — AI analyzes 3 answers → Persona type
router.post('/persona-quiz', authMiddleware, withEnergyCheck('persona_quiz'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length < 3) {
      return res.status(400).json({ error: '3 Antworten erforderlich' });
    }

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('persona_quiz', eventId, `Du bist ein witziger Persönlichkeits-Analyst auf einer ${eventType || 'Party'}. 
Analysiere die 3 Antworten des Gastes und ordne einen lustigen Persönlichkeitstyp zu.
Antworte NUR mit einem JSON-Objekt: {"persona": "DER TITEL", "description": "2-3 lustige Sätze", "emoji": "passendes Emoji", "superpower": "witzige Superkraft"}`);

    const userPrompt = `Gast "${guestName || 'Anonymer Gast'}" auf "${eventTitle || 'Event'}" hat geantwortet:
1. Lieblingsdrink auf der Party: "${answers[0]}"
2. Dein Party-Move auf der Tanzfläche: "${answers[1]}"  
3. Was machst du um 3 Uhr nachts: "${answers[2]}"

Welcher Party-Persönlichkeitstyp ist das?`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), {
      maxTokens: 300,
      temperature: 0.9,
    });

    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.persona) {
      result = {
        persona: 'DER MYSTERIUM',
        description: response.content.trim().substring(0, 200),
        emoji: '🎭',
        superpower: 'Unberechenbarkeit',
      };
    }

    const session = createGameSession(eventId, 'persona_quiz', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('Persona quiz error', { message: (error as Error).message });
    res.json({
      persona: 'DER PARTY-TIER',
      description: 'Du bist das Herz jeder Party! Wenn du den Raum betrittst, dreht sich die Musik lauter.',
      emoji: '🦁',
      superpower: 'Stimmung auf 100% bringen',
      source: 'fallback',
    });
  }
});

// POST /api/booth-games/wedding-speech — AI generates a funny short wedding speech
router.post('/wedding-speech', authMiddleware, withEnergyCheck('wedding_speech'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, coupleName, role } = req.body;

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('wedding_speech', eventId, `Du bist ein brillanter Comedy-Redenschreiber auf einer ${eventType || 'Hochzeit'}. 
Schreibe eine kurze, witzige Rede (3-4 Sätze) die das Publikum zum Lachen bringt.
Die Rede soll herzlich, persönlich und ein bisschen frech sein — aber niemals verletzend.
Antworte NUR mit einem JSON-Objekt: {"speech": "Die komplette Rede", "toast": "Ein kurzer Trinkspruch (1 Satz)", "emoji": "passendes Emoji"}`);

    const userPrompt = `Gast "${guestName || 'Ein Gast'}" möchte eine kurze Rede halten auf "${eventTitle || 'der Feier'}".
${coupleName ? `Das Brautpaar: ${coupleName}` : ''}
${role ? `Beziehung zum Brautpaar: ${role}` : ''}
Schreibe eine kurze, lustige Hochzeitsrede!`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), {
      maxTokens: 400,
      temperature: 0.9,
    });

    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.speech) {
      result = {
        speech: response.content.trim().substring(0, 400),
        toast: 'Auf die Liebe! 🥂',
        emoji: '🎤',
      };
    }

    const session = createGameSession(eventId, 'wedding_speech', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('Wedding speech error', { message: (error as Error).message });
    res.json({
      speech: 'Liebe Gäste, ich kenne das Brautpaar schon seit Jahren — und ich muss sagen: Endlich hat jemand Ja gesagt, der nicht bei Verstand ist. Aber genau das macht echte Liebe aus! Ihr seid das chaotischste, lustigste und schönste Paar das ich kenne.',
      toast: 'Auf die Liebe und den Wahnsinn, der dazugehört! 🥂',
      emoji: '🎤',
      source: 'fallback',
    });
  }
});

// POST /api/booth-games/ai-stories — Guest gives 3 words → AI generates a mini story
router.post('/ai-stories', authMiddleware, withEnergyCheck('ai_stories'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, words } = req.body;

    if (!words || !Array.isArray(words) || words.length < 3) {
      return res.status(400).json({ error: '3 Wörter erforderlich' });
    }

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_stories', eventId, `Du bist ein kreativer Geschichtenerzähler auf einer ${eventType || 'Party'}.
Du bekommst 3 Wörter und schreibst daraus eine kurze, witzige Mini-Geschichte (4-6 Sätze).
Die Geschichte soll zum Event "${eventTitle || 'der Feier'}" passen und lustig sein.
Antworte NUR mit einem JSON-Objekt: {"title": "Kreativer Titel", "story": "Die Geschichte in 4-6 Sätzen", "genre": "z.B. Krimi, Romanze, Sci-Fi, Fantasy", "emoji": "passendes Emoji"}`);

    const userPrompt = `${guestName || 'Ein Gast'} gibt dir 3 Wörter:
1. "${words[0]}"
2. "${words[1]}"
3. "${words[2]}"

Schreibe eine kurze, lustige Geschichte die ALLE 3 Wörter enthält!`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), {
      maxTokens: 400,
      temperature: 0.95,
    });

    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.story) {
      result = {
        title: 'Die unglaubliche Geschichte',
        story: response.content.trim().substring(0, 500),
        genre: 'Abenteuer',
        emoji: '📖',
      };
    }

    const session = createGameSession(eventId, 'ai_stories', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('AI stories error', { message: (error as Error).message });
    res.json({
      title: 'Die Party-Legende',
      story: `Es war einmal auf der wildesten Party des Jahres. ${req.body?.guestName || 'Ein mutiger Gast'} betrat die Tanzfläche und alles wurde still. Dann passierte das Unmögliche — die Diskokugel fing an zu sprechen. "Endlich jemand, der es verdient hat, im Rampenlicht zu stehen!" Seitdem nennt man diese Nacht nur noch "Die Legende".`,
      genre: 'Fantasy',
      emoji: '📖',
      source: 'fallback',
    });
  }
});

// POST /api/booth-games/celebrity-lookalike — LLM guesses which celebrity you look like
router.post('/celebrity-lookalike', authMiddleware, withEnergyCheck('celebrity_lookalike'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('celebrity_lookalike', eventId, `Du bist ein witziger Promi-Experte auf einer ${eventType || 'Party'}.
Jemand zeigt dir ein Foto und du sagst, welchem Promi die Person ähnlich sieht.
Sei kreativ, lustig und schmeichelhaft. Wähle Promis aus verschiedenen Bereichen (Film, Musik, Sport, etc).
Antworte NUR mit JSON: {"celebrity": "Name des Promis", "similarity": 70-99, "reason": "Witziger Grund in 1-2 Sätzen", "funFact": "Fun Fact über den Promi", "emoji": "passendes Emoji"}`);

    const userPrompt = `Der Gast "${guestName || 'Ein geheimnisvoller Gast'}" auf "${eventTitle || 'der Party'}" möchte wissen: Welchem Promi sehe ich ähnlich? Sei kreativ und witzig!`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 300, temperature: 0.95 });
    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.celebrity) {
      result = { celebrity: 'George Clooney', similarity: 87, reason: 'Dieses Charisma ist unverkennbar!', funFact: 'George Clooney wurde 2-mal zum Sexiest Man Alive gewählt.', emoji: '🌟' };
    }

    const session = createGameSession(eventId, 'celebrity_lookalike', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('Celebrity lookalike error', { message: (error as Error).message });
    res.json({
      celebrity: 'Brad Pitt', similarity: 85, reason: 'Die Ausstrahlung! Das Lächeln! Einfach unwiderstehlich.',
      funFact: 'Brad Pitt hat seinen ersten Oscar erst 2020 gewonnen.', emoji: '🌟', source: 'fallback',
    });
  }
});

// POST /api/booth-games/ai-bingo — Generate a photo challenge bingo card
router.post('/ai-bingo', authMiddleware, withEnergyCheck('ai_bingo'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_bingo', eventId, `Du bist ein Party-Spiele-Meister auf einer ${eventType || 'Feier'}.
Erstelle eine 3x3 Bingo-Karte mit lustigen Foto-Aufgaben für Gäste.
Jede Aufgabe soll mit einem Selfie oder Foto erfüllbar sein.
Mindestens 2 Aufgaben sollen eine Personenanzahl enthalten (z.B. "Foto mit 3 Personen", "Selfie mit 5+ Leuten").
Antworte NUR mit JSON: {"title": "Lustiger Bingo-Titel", "tasks": ["Aufgabe 1", "Aufgabe 2", ... "Aufgabe 9"], "bonusTask": "Eine extra schwere Bonus-Aufgabe mit 7+ Personen", "emoji": "passendes Emoji"}
Die 9 Aufgaben sollen kurz (max 6 Wörter) und lustig sein!`);

    const userPrompt = `Erstelle eine Foto-Bingo-Karte für "${eventTitle || 'die Party'}". Die Aufgaben sollen lustig, machbar und party-tauglich sein! Gast: ${guestName || 'Ein Partygast'}`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 400, temperature: 0.9 });
    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.tasks || !Array.isArray(result.tasks) || result.tasks.length < 9) {
      result = {
        title: 'Party Bingo!',
        tasks: ['Selfie mit DJ', 'Foto mit Brautpaar', 'Grimasse schneiden', 'Gruppenfoto 5+ Leute', 'Tanzfoto', 'Foto mit Deko', 'Funny Face Duo', 'Essen-Foto', 'Luftgitarre spielen'],
        bonusTask: 'Selfie mit allen Kellnern!',
        emoji: '🎲',
      };
    }

    const session = createGameSession(eventId, 'ai_bingo', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('AI bingo error', { message: (error as Error).message });
    res.json({
      title: 'Party Bingo!',
      tasks: ['Selfie mit DJ', 'Foto mit dem Brautpaar', 'Grimasse schneiden', 'Gruppenfoto 5+ Leute', 'Tanzfoto', 'Foto mit Deko', 'Funny Face Duo', 'Essen-Foto', 'Luftgitarre spielen'],
      bonusTask: 'Selfie mit allen Kellnern!', emoji: '🎲', source: 'fallback',
    });
  }
});

// POST /api/booth-games/ai-dj — AI suggests party songs
router.post('/ai-dj', authMiddleware, withEnergyCheck('ai_dj'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, mood } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_dj', eventId, `Du bist ein legendärer Party-DJ auf einer ${eventType || 'Feier'}.
Basierend auf der Stimmung schlägst du 5 perfekte Songs vor.
Antworte NUR mit JSON: {"djName": "Dein lustiger DJ-Name", "songs": [{"title": "Song", "artist": "Künstler", "reason": "Warum dieser Song"}], "vibe": "Beschreibung der Stimmung in 1 Satz", "emoji": "passendes Emoji"}
Wähle echte, bekannte Songs! Mix aus Deutsch und International.`);

    const userPrompt = `${guestName || 'Ein Gast'} auf "${eventTitle || 'der Party'}" wünscht sich Musik.
${mood ? `Gewünschte Stimmung: ${mood}` : 'Die Party ist in vollem Gange!'}
Schlage 5 perfekte Songs vor!`;

    const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 400, temperature: 0.9 });
    let result: any = null;
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch { /* parse error */ }

    if (!result?.songs || !Array.isArray(result.songs) || result.songs.length < 3) {
      result = {
        djName: 'DJ Algorithmus',
        songs: [
          { title: 'Blinding Lights', artist: 'The Weeknd', reason: 'Der ultimative Party-Starter!' },
          { title: 'Atemlos durch die Nacht', artist: 'Helene Fischer', reason: 'Muss sein. Einfach Muss.' },
          { title: 'Uptown Funk', artist: 'Bruno Mars', reason: 'Bringt JEDEN auf die Tanzfläche!' },
          { title: 'Waka Waka', artist: 'Shakira', reason: 'Die Hüften lügen nicht!' },
          { title: 'Mr. Brightside', artist: 'The Killers', reason: 'Für die Indie-Fraktion!' },
        ],
        vibe: 'Pure Party-Energie!',
        emoji: '🎧',
      };
    }

    const session = createGameSession(eventId, 'ai_dj', result);
    res.json({ sessionId: session.id, ...result, source: 'ai' });
  } catch (error) {
    logger.error('AI DJ error', { message: (error as Error).message });
    res.json({
      djName: 'DJ Backup', songs: [
        { title: 'Blinding Lights', artist: 'The Weeknd', reason: 'Immer ein Hit!' },
        { title: 'Atemlos', artist: 'Helene Fischer', reason: 'Der Klassiker!' },
        { title: 'Uptown Funk', artist: 'Bruno Mars', reason: 'Garantiert gute Laune!' },
        { title: 'Dancing Queen', artist: 'ABBA', reason: 'Zeitlos!' },
        { title: 'Levels', artist: 'Avicii', reason: 'RIP Legend!' },
      ], vibe: 'Party-Stimmung!', emoji: '🎧', source: 'fallback',
    });
  }
});

// POST /api/booth-games/trading-card — Generate AI Trading Card from guest photo
router.post('/trading-card', authMiddleware, withEnergyCheck('trading_card'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, guestName } = req.body;

    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }

    // 1. Fetch photo
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || !photo.storagePath) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // 2. Read photo buffer from storage (avoid relative /cdn/ URL in fetch)
    const { storageService } = await import('../services/storage');
    const photoBuffer = await storageService.getFile(photo.storagePath);

    // 3. Generate stats via LLM (uses Grok → Groq → Ollama fallback chain)
    const { generateCompletion } = await import('../lib/groq');
    const nameStr = guestName || 'Mystery Guest';

    const statsPrompt = `Generiere lustige RPG-Stats für "${nameStr}" auf einer Party. 
Antworte NUR mit JSON: {"title": "Lustiger 2-Wort-Titel", "emoji": "1 Emoji", "charisma": 50-99, "humor": 50-99, "dance": 50-99, "style": 50-99, "energy": 50-99, "specialMove": "Lustiger Spezial-Move in 3-5 Wörtern"}
Mach es witzig und kreativ!`;

    let stats = {
      title: 'Party Legend',
      emoji: '⚡',
      charisma: 75,
      humor: 82,
      dance: 68,
      style: 91,
      energy: 77,
      specialMove: 'Der unaufhaltsame Hüftschwung',
    };

    try {
      const llmResponse = await generateCompletion(statsPrompt, 'Du bist ein lustiger RPG-Meister.', {
        maxTokens: 200,
        temperature: 0.95,
      });
      const jsonMatch = llmResponse.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) stats = { ...stats, ...parsed };
      }
    } catch { /* use default stats */ }

    // 4. Create trading card
    const { createTradingCard } = await import('../services/tradingCard');
    const result = await createTradingCard({
      photoBuffer,
      eventId,
      guestName: nameStr,
      stats,
    });

    res.json({
      success: true,
      cardUrl: result.cardUrl,
      stats,
    });
  } catch (error) {
    logger.error('Trading card error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Trading Card Fehler' });
  }
});

// POST /api/booth-games/gif-morph — Create animated GIF morph (Original → Style1 → Style2)
router.post('/gif-morph', authMiddleware, withEnergyCheck('gif_morph'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, styles, frameDelay, width } = req.body;

    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }

    const { createGifMorph } = await import('../services/gifMorph');
    const result = await createGifMorph({
      photoId,
      eventId,
      styles,
      frameDelay: frameDelay ? Number(frameDelay) : undefined,
      width: width ? Number(width) : undefined,
    });

    res.json({
      success: true,
      gifUrl: result.gifUrl,
      styles: result.styles,
      frames: result.frames,
      durationMs: result.durationMs,
    });
  } catch (error) {
    logger.error('GIF morph error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'GIF-Morph Fehler' });
  }
});

// POST /api/booth-games/gif-aging — Generate aging progression GIF (4 frames: 30→50→70→90)
router.post('/gif-aging', authMiddleware, withEnergyCheck('gif_aging'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId } = req.body;

    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }

    const { createGifAging } = await import('../services/gifAging');
    const result = await createGifAging({ photoId, eventId });

    res.json({
      success: true,
      gifUrl: result.gifUrl,
      frames: result.frames,
      durationMs: result.durationMs,
    });
  } catch (error) {
    logger.error('GIF aging error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Aging-GIF Fehler' });
  }
});

// POST /api/booth-games/ai-video — Generate AI video from a photo (Runway/LumaAI)
router.post('/ai-video', authMiddleware, withEnergyCheck('ai_video'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, prompt, duration } = req.body;

    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }

    const { generateImageToVideo } = await import('../services/aiVideoGen');
    const jobId = await generateImageToVideo({
      photoId,
      eventId,
      prompt,
      duration: duration ? Number(duration) : undefined,
    });

    res.json({
      success: true,
      jobId,
      message: 'Video-Generierung gestartet (kann 1-3 Minuten dauern)',
    });
  } catch (error) {
    logger.error('AI video error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Video-Generierung fehlgeschlagen' });
  }
});

// GET /api/booth-games/ai-video/status/:jobId — Poll video generation status
router.get('/ai-video/status/:jobId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getVideoJobStatus } = await import('../services/aiVideoGen');
    const job = getVideoJobStatus(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job nicht gefunden' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Status-Abfrage fehlgeschlagen' });
  }
});

// POST /api/booth-games/ai-meme — Generate funny meme captions
router.post('/ai-meme', authMiddleware, withEnergyCheck('ai_meme'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_meme', eventId, `Du bist ein Meme-Generator für Party-Events. Erstelle 3 lustige Meme-Captions im Internet-Meme-Stil. 
Die Captions sollen zur Event-Stimmung passen und Party-Humor haben.
Antworte NUR als JSON: {"captions": [{"top": "oberer Text", "bottom": "unterer Text", "template": "Meme-Template-Name"}], "bestCaption": "der lustigste als Einzeiler", "emoji": "passendes Emoji", "source": "ai"}`);

    const userPrompt = `Event: ${eventTitle || 'Party'} (${eventType || 'party'})${guestName ? `, Gast: ${guestName}` : ''}. Erstelle 3 lustige Meme-Captions!`;

    try {
      const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 500, temperature: 0.9 });

      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.captions) {
          return res.json({ ...parsed, source: 'ai' });
        }
      }
    } catch (aiErr) {
      logger.warn('AI Meme generation failed, using fallback', { error: (aiErr as Error).message });
    }

    // Fallback
    res.json({
      captions: [
        { top: 'Wenn der DJ', bottom: 'endlich deinen Song spielt', template: 'Drake Approving' },
        { top: 'Niemand:', bottom: 'Ich um 3 Uhr nachts auf der Tanzfläche', template: 'Distracted Boyfriend' },
        { top: 'Mein Gesicht wenn', bottom: 'das Buffet eröffnet wird', template: 'Surprised Pikachu' },
      ],
      bestCaption: 'Wenn der DJ endlich deinen Song spielt 🕺',
      emoji: '😂',
      source: 'fallback',
    });
  } catch (error) {
    logger.error('AI Meme error', { message: (error as Error).message });
    res.status(500).json({ error: 'Meme-Generierung fehlgeschlagen' });
  }
});

// POST /api/booth-games/ai-superlatives — Generate "Most likely to..." party awards
router.post('/ai-superlatives', authMiddleware, withEnergyCheck('ai_superlatives'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_superlatives', eventId, `Du bist ein lustiger Party-Award-Generator. Erstelle 5 kreative "Am ehesten..." / "Most likely to..." Awards für einen Party-Gast.
Die Awards sollen lustig, positiv und party-bezogen sein. Mische deutsch und englisch.
Antworte NUR als JSON: {"awards": [{"title": "Award-Titel", "reason": "kurze lustige Begründung", "emoji": "passendes Emoji"}], "topAward": "der beste Award als Titel", "source": "ai"}`);

    const userPrompt = `Event: ${eventTitle || 'Party'} (${eventType || 'party'})${guestName ? `, Gast: ${guestName}` : ''}. Erstelle 5 lustige Party-Awards!`;

    try {
      const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 600, temperature: 0.9 });

      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.awards) {
          return res.json({ ...parsed, source: 'ai' });
        }
      }
    } catch (aiErr) {
      logger.warn('AI Superlatives generation failed, using fallback', { error: (aiErr as Error).message });
    }

    // Fallback
    res.json({
      awards: [
        { title: 'Last One Standing', reason: 'Tanzt noch wenn alle anderen schon im Taxi sitzen', emoji: '🕺' },
        { title: 'Selfie-Champion', reason: 'Hat mehr Selfies als das Event Gäste hat', emoji: '🤳' },
        { title: 'DJ-Flüsterer', reason: 'Nervt den DJ so lange bis der richtige Song läuft', emoji: '🎧' },
        { title: 'Buffet-Architekt', reason: 'Baut den perfekten Teller — jedes Mal', emoji: '🍽️' },
        { title: 'Stimmungskanone', reason: 'Sorgt dafür dass JEDER auf die Tanzfläche kommt', emoji: '🎉' },
      ],
      topAward: 'Last One Standing 🕺',
      source: 'fallback',
    });
  } catch (error) {
    logger.error('AI Superlatives error', { message: (error as Error).message });
    res.status(500).json({ error: 'Award-Generierung fehlgeschlagen' });
  }
});

// POST /api/booth-games/ai-photo-critic — Humorous photo review with star rating
router.post('/ai-photo-critic', authMiddleware, withEnergyCheck('ai_photo_critic'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;
    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_photo_critic', eventId, `Du bist ein humorvoller Foto-Kritiker auf einer Party. Gib eine witzige, übertriebene Foto-Bewertung ab — wie ein Kunstkritiker der ein Selfie bewertet.
Sei dramatisch, lustig und positiv. Verwende Fachbegriffe aus der Kunst/Fotografie auf lustige Weise.
Antworte NUR als JSON: {"review": "die lustige Bewertung (2-3 Sätze)", "stars": 4.5, "category": "Bewertungs-Kategorie z.B. Meisterwerk", "technique": "erfundene Technik-Bewertung", "emoji": "passendes Emoji", "verdict": "kurzes Urteil (3-5 Wörter)", "source": "ai"}`);

    const userPrompt = `Event: ${eventTitle || 'Party'} (${eventType || 'party'})${guestName ? `, Fotograf/in: ${guestName}` : ''}. Bewerte dieses Party-Foto!`;

    try {
      const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 400, temperature: 0.95 });

      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.review) {
          return res.json({ ...parsed, stars: Math.min(5, Math.max(1, parsed.stars || 4)), source: 'ai' });
        }
      }
    } catch (aiErr) {
      logger.warn('AI Photo Critic failed, using fallback', { error: (aiErr as Error).message });
    }

    // Fallback
    const reviews = [
      { review: 'Die Komposition dieses Selfies erinnert an die frühen Werke von Da Vinci — nur mit besserer Beleuchtung und mehr Glitzer. Ein Meisterwerk der modernen Party-Fotografie!', stars: 4.7, category: 'Meisterwerk', technique: 'Neo-impressionistischer Selfie-Realismus', emoji: '🎨', verdict: 'Absolut galerie-würdig!' },
      { review: 'Der kühne Einsatz des Blitzlichts in Kombination mit dem leicht verschwommenen Hintergrund erzeugt eine Atmosphäre von "Ich hab getanzt und schnell ein Foto gemacht". Brillant!', stars: 4.3, category: 'Avantgarde', technique: 'Dynamischer Party-Expressionismus', emoji: '✨', verdict: 'Tanzflächen-Kunstwerk!' },
    ];
    res.json({ ...reviews[Math.floor(Math.random() * reviews.length)], source: 'fallback' });
  } catch (error) {
    logger.error('AI Photo Critic error', { message: (error as Error).message });
    res.status(500).json({ error: 'Foto-Kritik fehlgeschlagen' });
  }
});

// POST /api/booth-games/slot-machine/generate-image — Generate AI image from slot combination
router.post('/slot-machine/generate-image', authMiddleware, withEnergyCheck('ai_slot_machine'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, prompt, emojis, sessionId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId ist erforderlich' });
    }

    // Build prompt from emojis if no explicit prompt given
    const imagePrompt = prompt || (emojis && Array.isArray(emojis)
      ? `An artistic, detailed illustration of: ${emojis.join(' ')}. Vibrant colors, party atmosphere, photorealistic, high quality digital art`
      : 'A colorful party scene, vibrant confetti, celebration, digital art');

    const { resolveProvider } = await import('../services/aiExecution');
    const { storageService } = await import('../services/storage');

    const provider = await resolveProvider('ai_slot_machine');
    if (!provider) {
      return res.status(503).json({ error: 'Kein AI Provider für AI Slot Machine konfiguriert' });
    }

    // Call FAL.ai or Replicate for image generation
    let imageBuffer: Buffer | null = null;
    let imageUrl = '';

    if (provider.slug.includes('fal')) {
      const model = provider.model || 'fal-ai/flux/dev';
      const resp = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${provider.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          num_images: 1,
          image_size: 'square',
          num_inference_steps: 28,
          guidance_scale: 3.5,
        }),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        const outputUrl = data?.images?.[0]?.url || data?.image?.url;
        if (outputUrl) {
          if (outputUrl.startsWith('data:')) {
            imageBuffer = Buffer.from(outputUrl.split(',')[1], 'base64');
          } else {
            const imgResp = await fetch(outputUrl);
            imageBuffer = Buffer.from(await imgResp.arrayBuffer());
          }
        }
      }
    } else if (provider.slug.includes('replicate')) {
      const version = provider.model || 'black-forest-labs/flux-schnell';
      const createResp = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${provider.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, input: { prompt: imagePrompt, num_outputs: 1, aspect_ratio: '1:1' } }),
      });
      if (createResp.ok) {
        let pred: any = await createResp.json();
        for (let i = 0; i < 30 && pred.status !== 'succeeded' && pred.status !== 'failed'; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollResp = await fetch(pred.urls?.get, { headers: { 'Authorization': `Token ${provider.apiKey}` } });
          pred = await pollResp.json();
        }
        const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
        if (outputUrl) {
          const imgResp = await fetch(outputUrl);
          imageBuffer = Buffer.from(await imgResp.arrayBuffer());
        }
      }
    }

    if (!imageBuffer) {
      return res.status(503).json({ error: 'Bild-Generierung fehlgeschlagen' });
    }

    // Save generated image to storage
    const filePath = await storageService.uploadFile(eventId, `slot-${Date.now()}.jpg`, imageBuffer, 'image/jpeg');

    res.json({
      success: true,
      imageUrl: filePath,
      prompt: imagePrompt,
      sessionId,
    });
  } catch (error) {
    logger.error('Slot machine image error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'AI Slot Machine Fehler' });
  }
});

// GET /api/booth-games/cover-shot/templates — List available magazine cover templates
router.get('/cover-shot/templates', (_req, res: Response) => {
  import('../services/coverShot').then(({ COVER_TEMPLATES }) => {
    res.json({ templates: COVER_TEMPLATES.map(t => ({
      id: t.id, label: t.label, emoji: t.emoji,
      defaultCoverLine1: t.defaultCoverLine1, defaultCoverLine2: t.defaultCoverLine2,
    })) });
  }).catch(() => res.status(500).json({ error: 'Templates nicht verfügbar' }));
});

// POST /api/booth-games/cover-shot — Apply magazine cover overlay to a photo
router.post('/cover-shot', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, template, coverLine1, coverLine2, guestName, eventTitle } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const { processCoverShotForPhoto } = await import('../services/coverShot');
    const result = await processCoverShotForPhoto(photoId, req.userId!, {
      template: template || 'vogue',
      coverLine1,
      coverLine2,
      guestName,
      eventTitle,
    });

    res.json({
      success: true,
      newPhotoPath: result.newPhotoPath,
      template: result.template,
    });
  } catch (error) {
    logger.error('Cover shot error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Cover-Shooting Fehler' });
  }
});

// POST /api/booth-games/ai-couple-match — Fun compatibility score between two names
router.post('/ai-couple-match', authMiddleware, withEnergyCheck('ai_couple_match'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, partnerName } = req.body;

    if (!guestName || !partnerName) {
      return res.status(400).json({ error: 'Beide Namen sind erforderlich (guestName + partnerName)' });
    }

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = await resolveSystemPrompt('ai_couple_match', eventId, `Du bist ein lustiger Liebes-Kompatibilitäts-Rechner auf einer Party. Berechne einen humorvollen Compatibility-Score zwischen zwei Personen.
Sei lustig, positiv und kreativ. Der Score sollte zwischen 60-99% liegen (immer optimistisch!).
Antworte NUR als JSON: {"compatibility": 87, "shipName": "kreativer Paar-Name", "strengths": ["Stärke 1", "Stärke 2", "Stärke 3"], "challenge": "eine lustige Herausforderung", "loveLanguage": "gemeinsame Liebessprache", "songForYou": "ein passender Song-Titel", "emoji": "passendes Emoji", "verdict": "kurzes lustiges Urteil", "source": "ai"}`);

    const userPrompt = `Event: ${eventTitle || 'Party'} (${eventType || 'party'}). Berechne die Kompatibilität zwischen "${guestName}" und "${partnerName}"!`;

    try {
      const response = await generateCompletion(userPrompt, await enrichSystemPrompt(eventId, systemPrompt), { maxTokens: 500, temperature: 0.9 });

      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.compatibility) {
          return res.json({ ...parsed, compatibility: Math.min(99, Math.max(60, parsed.compatibility)), source: 'ai' });
        }
      }
    } catch (aiErr) {
      logger.warn('AI Couple Match failed, using fallback', { error: (aiErr as Error).message });
    }

    // Fallback
    const score = 70 + Math.floor(Math.random() * 25);
    res.json({
      compatibility: score,
      shipName: `${guestName.substring(0, 3)}${partnerName.substring(Math.max(0, partnerName.length - 3))}`,
      strengths: ['Gleicher Musikgeschmack', 'Perfektes Tanzflächen-Duo', 'Gemeinsame Buffet-Liebe'],
      challenge: 'Wer bezahlt das nächste Getränk?',
      loveLanguage: 'Gemeinsames Tanzen',
      songForYou: 'Perfect — Ed Sheeran',
      emoji: '💕',
      verdict: `${score}% — da geht was!`,
      source: 'fallback',
    });
  } catch (error) {
    logger.error('AI Couple Match error', { message: (error as Error).message });
    res.status(500).json({ error: 'Couple Match fehlgeschlagen' });
  }
});

// GET /api/booth-games/photo-strip/templates
router.get('/photo-strip/templates', (_req, res: Response) => {
  res.json({ templates: STRIP_TEMPLATES.map(t => ({
    id: t.id, label: t.label, emoji: t.emoji,
  })) });
});

// POST /api/booth-games/photo-strip
router.post('/photo-strip', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, template, eventTitle, brandColor } = req.body;
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length < 1 || photoIds.length > 4) {
      return res.status(400).json({ error: '1-4 photoIds erforderlich' });
    }
    // determine eventId from first photo
    const photo = await prisma.photo.findUnique({ where: { id: photoIds[0] }, select: { eventId: true } });
    if (!photo) return res.status(404).json({ error: 'Foto nicht gefunden' });
    const result = await createPhotoStrip(photo.eventId, photoIds, req.userId, { template, eventTitle, brandColor });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Photo Strip error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Photo Strip Fehler' });
  }
});

// GET /api/booth-games/ai-result/download — Always downloadable, applies branding overlay
// AI-generated results are ALWAYS downloadable regardless of allowDownloads event setting.
// Standard: gästefotos.com overlay | adFree + customHashtag: host overlay | adFree clean: no overlay
router.get('/ai-result/download', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { storagePath, eventId } = req.query as { storagePath?: string; eventId?: string };
    if (!storagePath || !eventId) {
      return res.status(400).json({ error: 'storagePath und eventId erforderlich' });
    }

    // Validate event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true, featuresConfig: true },
    });
    if (!event || event.deletedAt || !event.isActive) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Get the file from storage
    const { storageService } = await import('../services/storage');
    let fileBuffer: Buffer;
    try {
      fileBuffer = await storageService.getFile(storagePath);
    } catch {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Branding overlay logic (same as regular photo download)
    const ext = storagePath.split('.').pop()?.toLowerCase() || 'jpg';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') {
      try {
        const { isFeatureEnabled } = await import('../services/featureGate');
        const adFree = await isFeatureEnabled(eventId, 'adFree');
        const fc = (event.featuresConfig || {}) as any;
        const { addBrandingOverlay, addCustomBrandingOverlay } = await import('../services/logoOverlay');

        if (!adFree) {
          // Standard: gästefotos.com watermark — free advertising
          fileBuffer = await addBrandingOverlay(fileBuffer, { hashtag: '#gästefotos' });
        } else if (fc.customHashtag) {
          // Premium with custom hashtag: host's branding
          const logoUrl = fc.brandLogoUrl || undefined;
          fileBuffer = await addCustomBrandingOverlay(fileBuffer, { hashtag: fc.customHashtag, logoUrl });
        }
        // adFree without customHashtag: clean download (premium, no overlay)
      } catch (brandErr: any) {
        logger.warn('[AIResult] Branding overlay failed, serving original', { error: brandErr.message });
      }
    }

    const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const filename = `ki-ergebnis-${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('AI Result download error', { message: error.message });
    res.status(500).json({ error: error.message || 'Download-Fehler' });
  }
});

// GET /api/booth-games/ai-result/share — Returns branded image as data URL for Web Share API / Instagram
router.get('/ai-result/share', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { storagePath, eventId } = req.query as { storagePath?: string; eventId?: string };
    if (!storagePath || !eventId) {
      return res.status(400).json({ error: 'storagePath und eventId erforderlich' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true, slug: true, title: true, featuresConfig: true },
    });
    if (!event || event.deletedAt || !event.isActive) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const { storageService } = await import('../services/storage');
    let fileBuffer: Buffer;
    try {
      fileBuffer = await storageService.getFile(storagePath);
    } catch {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    // Always apply branding for shared images
    const ext = storagePath.split('.').pop()?.toLowerCase() || 'jpg';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') {
      try {
        const { isFeatureEnabled } = await import('../services/featureGate');
        const adFree = await isFeatureEnabled(eventId, 'adFree');
        const fc = (event.featuresConfig || {}) as any;
        const { addBrandingOverlay, addCustomBrandingOverlay } = await import('../services/logoOverlay');

        if (!adFree) {
          fileBuffer = await addBrandingOverlay(fileBuffer, { hashtag: '#gästefotos' });
        } else if (fc.customHashtag) {
          fileBuffer = await addCustomBrandingOverlay(fileBuffer, { hashtag: fc.customHashtag });
        }
      } catch { /* ignore */ }
    }

    // Return as inline image for direct preview/share
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Disposition', 'inline');
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('AI Result share error', { message: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
