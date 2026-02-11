import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  GAME_CATALOG,
  spinSlotMachine,
  generateCompliment,
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

// POST /api/booth-games/compliment-mirror — Get a random compliment
router.post('/compliment-mirror', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const result = generateCompliment();
    const session = createGameSession(eventId, 'compliment_mirror', result);

    res.json({ sessionId: session.id, ...result });
  } catch (error) {
    logger.error('Compliment mirror error', { message: (error as Error).message });
    res.status(500).json({ error: 'Compliment Mirror Fehler' });
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

export default router;
