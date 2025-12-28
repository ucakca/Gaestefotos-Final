import { Router, Response } from 'express';
import multer from 'multer';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { extractFaceDescriptorFromImage, searchPhotosByFace } from '../services/faceSearch';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { validateUploadedFile } from '../middleware/uploadSecurity';

const router = Router();

// Multer for reference image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

/**
 * Search for photos containing a specific face
 * POST /api/events/:eventId/face-search
 * Body: multipart/form-data with 'reference' image file
 */
router.post(
  '/:eventId/face-search',
  optionalAuthMiddleware,
  upload.single('reference'),
  validateUploadedFile('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;
      const minSimilarityRaw = parseFloat(req.body.minSimilarity || '0.6');
      const minSimilarity = Number.isFinite(minSimilarityRaw)
        ? Math.min(1, Math.max(0, minSimilarityRaw))
        : 0.6;

      if (!file) {
        return res.status(400).json({ error: 'Kein Referenzbild bereitgestellt' });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          hostId: true,
          featuresConfig: true,
          deletedAt: true,
          isActive: true,
        },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Access control: host/admin OR event access cookie
      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      if (!isHost && !isAdmin && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Check if face search is enabled
      const featuresConfig = event.featuresConfig as any;
      const faceSearchEnabled = featuresConfig?.faceSearch !== false; // Default true if face recognition is enabled

      if (!faceSearchEnabled) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Extract face descriptor from reference image
      const descriptor = await extractFaceDescriptorFromImage(file.buffer);

      if (!descriptor) {
        return res.status(400).json({ 
          error: 'Kein Gesicht im Referenzbild erkannt. Bitte ein Foto mit einem klaren Gesicht verwenden.' 
        });
      }

      // Search for matching photos
      const results = await searchPhotosByFace(eventId, descriptor, minSimilarity);

      logger.info('Face search completed', {
        eventId,
        resultsCount: results.length,
        minSimilarity,
      });

      res.json({
        success: true,
        results,
        count: results.length,
        message: `${results.length} Foto${results.length !== 1 ? 's' : ''} gefunden`,
      });
    } catch (error) {
      logger.error('Error in face search', { message: (error as any)?.message || String(error), eventId: req.params.eventId });
      res.status(500).json({ error: 'Fehler bei der Gesichtssuche' });
    }
  }
);

export default router;

