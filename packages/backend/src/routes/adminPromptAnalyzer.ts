/**
 * Admin Prompt Analyzer Routes
 * 
 * POST /api/admin/prompt-analyzer/img2prompt     — Upload image → get reconstructed prompt
 * POST /api/admin/prompt-analyzer/metadata        — Upload image → get all metadata (EXIF, PNG, AI params)
 * POST /api/admin/prompt-analyzer/quality-check   — Submit prompt text → get quality analysis + optimization
 * GET  /api/admin/prompt-analyzer/resources        — Get curated prompt community links
 * GET  /api/admin/prompt-analyzer/patterns         — Get prompt optimization patterns/cheat-sheet
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { extractImageMetadata } from '../services/imageMetadataReader';
import { analyzeImageToPrompt } from '../services/imageToPrompt';
import { generateCompletion } from '../lib/groq';

const router = Router();

// Multer for image upload (max 20MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien erlaubt'));
    }
  },
});

// ─── POST /img2prompt ───────────────────────────────────────────────────────

router.post('/img2prompt', authMiddleware, requireRole('ADMIN'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    logger.info('[PromptAnalyzer] img2prompt request', {
      userId: req.userId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    const result = await analyzeImageToPrompt(req.file.buffer);

    res.json({
      success: true,
      clipTags: result.clipTags,
      synthesizedPrompt: result.synthesizedPrompt,
      negativePrompt: result.negativePrompt,
      suggestedStyle: result.suggestedStyle,
      suggestedStrength: result.suggestedStrength,
      metadata: result.metadata,
    });
  } catch (error: any) {
    logger.error('[PromptAnalyzer] img2prompt error', { error: error.message });
    res.status(500).json({ error: error.message || 'Analyse fehlgeschlagen' });
  }
});

// ─── POST /metadata ─────────────────────────────────────────────────────────

router.post('/metadata', authMiddleware, requireRole('ADMIN'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    logger.info('[PromptAnalyzer] metadata request', {
      userId: req.userId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filename: req.file.originalname,
    });

    const metadata = await extractImageMetadata(req.file.buffer);

    res.json({
      success: true,
      filename: req.file.originalname,
      ...metadata,
    });
  } catch (error: any) {
    logger.error('[PromptAnalyzer] metadata error', { error: error.message });
    res.status(500).json({ error: error.message || 'Metadaten-Extraktion fehlgeschlagen' });
  }
});

// ─── POST /quality-check ────────────────────────────────────────────────────

router.post('/quality-check', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, negativePrompt, strength, targetEffect } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt ist erforderlich' });
    }

    const systemPrompt = `Du bist ein Experte für AI-Bild-Generierung und Prompt Engineering (Stable Diffusion, SDXL, Flux).

Analysiere den folgenden Prompt und gib eine strukturierte Bewertung ab.

Antworte NUR mit einem JSON-Objekt:
{
  "score": 7,
  "analysis": {
    "structure": { "score": 8, "comment": "Gut strukturiert, Subject→Style→Quality" },
    "keywords": { "score": 6, "comment": "Quality-Booster fehlen teilweise", "missing": ["8k uhd", "sharp focus"] },
    "negativePrompt": { "score": 5, "comment": "Zu kurz, wichtige Anti-Patterns fehlen", "missing": ["deformed", "bad anatomy"] },
    "strengthFit": { "score": 7, "comment": "Strength passt zum Effekt-Typ" },
    "facePreservation": { "score": 4, "comment": "Keine Face-Preservation Keywords", "missing": ["same person", "preserve facial features"] }
  },
  "optimizedPrompt": "der verbesserte Prompt mit allen Optimierungen",
  "optimizedNegativePrompt": "der verbesserte Negative Prompt",
  "suggestions": [
    "Quality-Booster hinzufügen: masterpiece, best quality",
    "Face-Preservation Keywords ergänzen für Portrait-Effekte"
  ]
}

Scoring (1-10):
- 1-3: Schlecht (grundlegende Probleme)
- 4-5: Verbesserungswürdig (funktioniert, aber suboptimal)
- 6-7: Gut (solide, kleine Optimierungen möglich)
- 8-9: Sehr gut (professionell)
- 10: Perfekt (nichts zu verbessern)`;

    const userPrompt = [
      `Prompt: ${prompt}`,
      negativePrompt ? `Negative Prompt: ${negativePrompt}` : 'Negative Prompt: (keiner)',
      strength !== undefined ? `Strength: ${strength}` : '',
      targetEffect ? `Ziel-Effekt: ${targetEffect}` : '',
    ].filter(Boolean).join('\n');

    const response = await generateCompletion(userPrompt, systemPrompt, {
      maxTokens: 800,
      temperature: 0.2,
    });

    // Parse JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');

      const result = JSON.parse(jsonMatch[0]);
      res.json({ success: true, ...result });
    } catch {
      // Fallback: return raw text
      res.json({
        success: true,
        score: null,
        rawAnalysis: response.content,
        suggestions: ['LLM-Antwort konnte nicht geparst werden — siehe rawAnalysis'],
      });
    }
  } catch (error: any) {
    logger.error('[PromptAnalyzer] quality-check error', { error: error.message });
    res.status(500).json({ error: error.message || 'Qualitäts-Check fehlgeschlagen' });
  }
});

// ─── GET /resources ─────────────────────────────────────────────────────────

router.get('/resources', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  res.json({
    resources: [
      { name: 'Lexica.art', url: 'https://lexica.art', type: 'Prompt-Suchmaschine', description: 'SD-Prompts nach Bild suchen' },
      { name: 'PromptHero', url: 'https://prompthero.com', type: 'Kuratierte Prompts', description: 'Sortiert nach Modell (SDXL, Flux, MJ)' },
      { name: 'CivitAI', url: 'https://civitai.com', type: 'Community', description: 'Community-Prompts mit Ergebnisbildern' },
      { name: 'OpenArt', url: 'https://openart.ai', type: 'Prompt-Browser', description: 'Visueller Prompt-Browser' },
      { name: 'Replicate Explore', url: 'https://replicate.com/explore', type: 'Modell-Seiten', description: 'Offizielle Beispiel-Prompts pro Modell' },
      { name: 'Stability AI Docs', url: 'https://platform.stability.ai/docs', type: 'API-Docs', description: 'Referenz-Prompts für SDXL' },
      { name: 'Midjourney Guide', url: 'https://docs.midjourney.com', type: 'Doku', description: 'Prompt-Syntax und Stilbegriffe' },
      { name: 'Hugging Face', url: 'https://huggingface.co/models', type: 'Modelle', description: 'Model Cards mit Prompts' },
      { name: 'DALL-E Prompt Book', url: 'https://dallery.gallery', type: 'Guide', description: 'Prompt-Engineering-Techniken' },
      { name: 'ComfyUI Examples', url: 'https://github.com/comfyanonymous/ComfyUI', type: 'Workflows', description: 'Komplette Generation-Workflows' },
    ],
  });
});

// ─── GET /patterns ──────────────────────────────────────────────────────────

router.get('/patterns', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  res.json({
    patterns: {
      qualityBoosters: {
        title: 'Universelle Qualitäts-Booster',
        keywords: ['masterpiece', 'best quality', 'highly detailed', 'sharp focus', '8k uhd', 'professional', 'intricate details'],
      },
      negativePrompts: {
        title: 'Universelle Negative Prompts',
        keywords: ['deformed', 'blurry', 'bad anatomy', 'disfigured', 'poorly drawn face', 'mutation', 'mutated', 'extra limb', 'ugly', 'disgusting', 'poorly drawn hands', 'missing limb', 'floating limbs', 'disconnected limbs', 'malformed hands', 'blur', 'out of focus', 'long neck', 'long body', 'watermark', 'text', 'error'],
      },
      facePreservation: {
        title: 'Face-Preservation (Portraits)',
        keywords: ['same person', 'preserve facial features', 'maintain likeness', 'identity preservation', 'consistent face', 'facial details intact'],
      },
      styles: {
        title: 'Style-Spezifische Patterns',
        items: [
          { name: 'Fotorealismus', keywords: ['DSLR photo', '35mm', 'bokeh', 'natural lighting', 'raw photo', 'photorealistic'] },
          { name: 'Anime', keywords: ['anime style', 'cel shading', 'clean lines', 'studio ghibli', 'vibrant colors'] },
          { name: 'Ölgemälde', keywords: ['oil on canvas', 'thick impasto', 'visible brushstrokes', 'gallery quality', 'classical painting'] },
          { name: 'Aquarell', keywords: ['watercolor painting', 'soft washes', 'flowing colors', 'wet on wet', 'delicate'] },
          { name: 'Cyberpunk', keywords: ['neon lights', 'rain reflections', 'holographic', 'dark cityscape', 'futuristic'] },
          { name: 'Film Noir', keywords: ['black and white', 'dramatic shadows', '1940s', 'high contrast', 'venetian blinds'] },
          { name: 'Pixel Art', keywords: ['16-bit pixel art', 'retro video game', 'limited color palette', 'blocky pixels'] },
          { name: 'Comic', keywords: ['comic book style', 'bold outlines', 'halftone dots', 'pop art colors', 'speech bubbles'] },
        ],
      },
      strengthGuide: {
        title: 'Strength-Kalibrierung',
        items: [
          { range: '0.3-0.4', useCase: 'Leichte Anpassung (Farben, Beleuchtung)' },
          { range: '0.5-0.6', useCase: 'Mittlere Transformation (Stil-Wechsel mit Face-Preservation)' },
          { range: '0.65-0.75', useCase: 'Starke Transformation (Kunst-Stil, Cartoon)' },
          { range: '0.8-0.9', useCase: 'Fast komplett neu generiert (nur Komposition bleibt)' },
        ],
      },
    },
  });
});

export default router;
