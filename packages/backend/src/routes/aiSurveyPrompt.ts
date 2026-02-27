/**
 * AI Survey → Prompt Pipeline API Routes
 * 
 * Routes:
 *   GET    /api/events/:eventId/survey-prompts          — List questions for event
 *   POST   /api/events/:eventId/survey-prompts          — Create/update question (host)
 *   DELETE /api/events/:eventId/survey-prompts/:id      — Delete question (host)
 *   POST   /api/events/:eventId/survey-prompts/copy-defaults — Copy defaults to event
 *   POST   /api/ai-jobs/survey                          — Submit survey answer → async AI job
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getSurveyQuestions,
  getSurveyQuestion,
  upsertSurveyQuestion,
  deleteSurveyQuestion,
  copyDefaultsToEvent,
  buildSurveyPrompt,
} from '../services/aiSurveyPrompt';
import { executeAsync } from '../services/aiAsyncDelivery';

const router = Router();

// GET /api/events/:eventId/survey-prompts — list questions (public for guests)
router.get('/:eventId/survey-prompts', async (req, res: Response) => {
  try {
    const questions = await getSurveyQuestions(req.params.eventId);
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events/:eventId/survey-prompts — create/update question (host)
router.post('/:eventId/survey-prompts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { id, question, promptTemplate, negativePrompt, aiFeature, style, sortOrder } = req.body;

    if (!question || !promptTemplate) {
      return res.status(400).json({ error: 'question und promptTemplate sind erforderlich' });
    }

    if (!promptTemplate.includes('{answer}')) {
      return res.status(400).json({ error: 'promptTemplate muss {answer} Platzhalter enthalten' });
    }

    const result = await upsertSurveyQuestion(eventId, {
      id, question, promptTemplate, negativePrompt, aiFeature, style, sortOrder,
    });

    res.json({ success: true, question: result });
  } catch (error: any) {
    logger.error('Upsert survey question error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:eventId/survey-prompts/:id
router.delete('/:eventId/survey-prompts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await deleteSurveyQuestion(req.params.id, req.params.eventId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events/:eventId/survey-prompts/copy-defaults
router.post('/:eventId/survey-prompts/copy-defaults', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const questions = await copyDefaultsToEvent(req.params.eventId);
    res.json({ success: true, questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
