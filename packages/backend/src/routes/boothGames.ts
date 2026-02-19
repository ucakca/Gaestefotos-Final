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

export default router;
