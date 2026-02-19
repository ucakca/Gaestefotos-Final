import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  GAME_CATALOG,
  spinSlotMachine,
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

// GET /api/booth-games/catalog — List all available games
router.get('/catalog', (_req, res: Response) => {
  res.json({ games: GAME_CATALOG });
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
router.post('/compliment-mirror', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, useAI } = req.body;

    let result: { compliment: string; verdict: string; source?: string };

    // Use AI if requested (default: true), fall back to random on failure
    if (useAI !== false) {
      result = await generateComplimentAI({
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
router.post('/fortune-teller', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;

    const result = await generateFortuneTellerAI({
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
router.post('/ai-roast', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName } = req.body;

    const result = await generateRoastAI({
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

// POST /api/booth-games/face-switch — Swap faces in a group photo
router.post('/face-switch', authMiddleware, async (req: AuthRequest, res: Response) => {
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
    });
  } catch (error) {
    logger.error('Face switch error', { message: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Face Switch Fehler' });
  }
});

// POST /api/booth-games/style-effect — Apply AI style effect (oldify, cartoon, style_pop)
router.post('/style-effect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, effect, intensity, outputFormat } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const validEffects = ['ai_oldify', 'ai_cartoon', 'ai_style_pop'];
    if (!effect || !validEffects.includes(effect)) {
      return res.status(400).json({ error: `Ungültiger Effekt. Erlaubt: ${validEffects.join(', ')}` });
    }

    const { processStyleEffectForPhoto } = await import('../services/aiStyleEffects');
    const result = await processStyleEffectForPhoto(photoId, req.userId!, effect, {
      intensity: intensity ? Number(intensity) : undefined,
      outputFormat: outputFormat || 'jpeg',
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
router.post('/bg-removal', authMiddleware, async (req: AuthRequest, res: Response) => {
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
router.post('/caption-generator', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle } = req.body;

    const { resolvePrompt, renderPrompt } = await import('../services/promptTemplates');
    const { generateCompletion } = await import('../lib/groq');

    const prompt = await resolvePrompt('caption_suggest');
    const systemPrompt = prompt.systemPrompt || 'Du bist ein Social-Media-Experte. Generiere kreative Instagram-Captions auf Deutsch. Antworte NUR mit einem JSON-Array von Strings.';
    const userPromptTpl = prompt.userPromptTpl || 'Generiere 3 Instagram-Captions für ein Foto von "{{eventType}}".';
    const context = eventType || eventTitle || 'Party';
    const userPrompt = renderPrompt(userPromptTpl, { eventType: context });

    const response = await generateCompletion(userPrompt, systemPrompt, {
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

    const session = createGameSession(eventId, 'compliment_mirror', { captions });
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
router.post('/persona-quiz', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length < 3) {
      return res.status(400).json({ error: '3 Antworten erforderlich' });
    }

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = `Du bist ein witziger Persönlichkeits-Analyst auf einer ${eventType || 'Party'}. 
Analysiere die 3 Antworten des Gastes und ordne einen lustigen Persönlichkeitstyp zu.
Antworte NUR mit einem JSON-Objekt: {"persona": "DER TITEL", "description": "2-3 lustige Sätze", "emoji": "passendes Emoji", "superpower": "witzige Superkraft"}`;

    const userPrompt = `Gast "${guestName || 'Anonymer Gast'}" auf "${eventTitle || 'Event'}" hat geantwortet:
1. Lieblingsdrink auf der Party: "${answers[0]}"
2. Dein Party-Move auf der Tanzfläche: "${answers[1]}"  
3. Was machst du um 3 Uhr nachts: "${answers[2]}"

Welcher Party-Persönlichkeitstyp ist das?`;

    const response = await generateCompletion(userPrompt, systemPrompt, {
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

    const session = createGameSession(eventId, 'fortune_teller', result);
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
router.post('/wedding-speech', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, coupleName, role } = req.body;

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = `Du bist ein brillanter Comedy-Redenschreiber auf einer ${eventType || 'Hochzeit'}. 
Schreibe eine kurze, witzige Rede (3-4 Sätze) die das Publikum zum Lachen bringt.
Die Rede soll herzlich, persönlich und ein bisschen frech sein — aber niemals verletzend.
Antworte NUR mit einem JSON-Objekt: {"speech": "Die komplette Rede", "toast": "Ein kurzer Trinkspruch (1 Satz)", "emoji": "passendes Emoji"}`;

    const userPrompt = `Gast "${guestName || 'Ein Gast'}" möchte eine kurze Rede halten auf "${eventTitle || 'der Feier'}".
${coupleName ? `Das Brautpaar: ${coupleName}` : ''}
${role ? `Beziehung zum Brautpaar: ${role}` : ''}
Schreibe eine kurze, lustige Hochzeitsrede!`;

    const response = await generateCompletion(userPrompt, systemPrompt, {
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

    const session = createGameSession(eventId, 'fortune_teller', result);
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
router.post('/ai-stories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventType, eventTitle, guestName, words } = req.body;

    if (!words || !Array.isArray(words) || words.length < 3) {
      return res.status(400).json({ error: '3 Wörter erforderlich' });
    }

    const { generateCompletion } = await import('../lib/groq');

    const systemPrompt = `Du bist ein kreativer Geschichtenerzähler auf einer ${eventType || 'Party'}.
Du bekommst 3 Wörter und schreibst daraus eine kurze, witzige Mini-Geschichte (4-6 Sätze).
Die Geschichte soll zum Event "${eventTitle || 'der Feier'}" passen und lustig sein.
Antworte NUR mit einem JSON-Objekt: {"title": "Kreativer Titel", "story": "Die Geschichte in 4-6 Sätzen", "genre": "z.B. Krimi, Romanze, Sci-Fi, Fantasy", "emoji": "passendes Emoji"}`;

    const userPrompt = `${guestName || 'Ein Gast'} gibt dir 3 Wörter:
1. "${words[0]}"
2. "${words[1]}"
3. "${words[2]}"

Schreibe eine kurze, lustige Geschichte die ALLE 3 Wörter enthält!`;

    const response = await generateCompletion(userPrompt, systemPrompt, {
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

    const session = createGameSession(eventId, 'fortune_teller', result);
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

// POST /api/booth-games/trading-card — Generate AI Trading Card from guest photo
router.post('/trading-card', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, guestName } = req.body;

    if (!photoId || !eventId) {
      return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    }

    // 1. Fetch photo
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || !photo.url) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // 2. Download photo buffer
    const photoResponse = await fetch(photo.url);
    const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

    // 3. Generate stats via LLM
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
router.post('/gif-morph', authMiddleware, async (req: AuthRequest, res: Response) => {
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
router.post('/gif-aging', authMiddleware, async (req: AuthRequest, res: Response) => {
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
router.post('/ai-video', authMiddleware, async (req: AuthRequest, res: Response) => {
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

export default router;
