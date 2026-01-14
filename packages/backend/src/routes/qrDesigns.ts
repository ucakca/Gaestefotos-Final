import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const qrDesignSchema = z.object({
  name: z.string().min(1).max(100),
  template: z.enum(['modern', 'boho', 'classic', 'minimal', 'elegant']),
  colors: z.object({
    foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    frame: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  frameStyle: z.enum(['none', 'rounded', 'ornate', 'floral', 'geometric']),
  headerText: z.string().max(100).optional().nullable(),
  footerText: z.string().max(100).optional().nullable(),
  centerLogoUrl: z.string().url().optional().nullable(),
  sizePreset: z.enum(['table', 'poster', 'a4', 'a5', 'square']),
  isDefault: z.boolean().optional(),
});

type QRDesignInput = z.infer<typeof qrDesignSchema>;

// Get all QR designs for an event
router.get('/events/:eventId/qr-designs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, designConfig: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const designConfig = (event.designConfig as any) || {};
    const qrDesigns = designConfig.qrDesigns || [];

    return res.json({ designs: qrDesigns });
  } catch (error) {
    logger.error('Get QR designs error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update QR design
router.put('/events/:eventId/qr-designs/:designId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, designId } = req.params;
    const parsed = qrDesignSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige QR-Design Daten', details: parsed.error });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, designConfig: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const designConfig = (event.designConfig as any) || {};
    const existingDesigns = (designConfig.qrDesigns || []) as any[];
    
    const newDesign = {
      id: designId,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };

    // If isDefault is true, set all others to false
    let updatedDesigns = existingDesigns.filter((d: any) => d.id !== designId);
    if (newDesign.isDefault) {
      updatedDesigns = updatedDesigns.map((d: any) => ({ ...d, isDefault: false }));
    }
    updatedDesigns.push(newDesign);

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          qrDesigns: updatedDesigns,
        },
      },
      select: { id: true, designConfig: true, updatedAt: true },
    });

    return res.json({ ok: true, design: newDesign });
  } catch (error) {
    logger.error('Save QR design error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete QR design
router.delete('/events/:eventId/qr-designs/:designId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, designId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, designConfig: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const designConfig = (event.designConfig as any) || {};
    const existingDesigns = (designConfig.qrDesigns || []) as any[];
    const updatedDesigns = existingDesigns.filter((d: any) => d.id !== designId);

    await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          qrDesigns: updatedDesigns,
        },
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    logger.error('Delete QR design error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
