import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ─── LIST TEMPLATES ─────────────────────────────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, category, partnerId } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (partnerId) {
      where.OR = [{ isPublic: true }, { partnerId }];
    } else {
      where.isPublic = true;
    }

    const templates = await prisma.boothTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ templates });
  } catch (error) {
    logger.error('List templates error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Templates' });
  }
});

// ─── GET TEMPLATE ───────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.boothTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Template nicht gefunden' });
    res.json({ template });
  } catch (error) {
    logger.error('Get template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── CREATE TEMPLATE (Admin only) ───────────────────────────────────────────

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Templates erstellen' });
    }

    const { name, description, type, category, config, thumbnailPath, isPublic, partnerId, sortOrder } = req.body;
    if (!name || !type || !config) {
      return res.status(400).json({ error: 'Name, Typ und Config sind erforderlich' });
    }

    const template = await prisma.boothTemplate.create({
      data: {
        name,
        description,
        type,
        category,
        config,
        thumbnailPath,
        isPublic: isPublic ?? true,
        partnerId,
        createdBy: req.userId,
        sortOrder: sortOrder ?? 0,
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    logger.error('Create template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

// ─── UPDATE TEMPLATE (Admin only) ───────────────────────────────────────────

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Templates bearbeiten' });
    }

    const { name, description, type, category, config, thumbnailPath, isPublic, partnerId, sortOrder } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (category !== undefined) data.category = category;
    if (config !== undefined) data.config = config;
    if (thumbnailPath !== undefined) data.thumbnailPath = thumbnailPath;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (partnerId !== undefined) data.partnerId = partnerId;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const template = await prisma.boothTemplate.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ template });
  } catch (error) {
    logger.error('Update template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// ─── DELETE TEMPLATE (Admin only) ───────────────────────────────────────────

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Templates löschen' });
    }

    await prisma.boothTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

export default router;
