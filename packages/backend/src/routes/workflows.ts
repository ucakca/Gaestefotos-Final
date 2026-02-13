import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ─── LIST WORKFLOWS ─────────────────────────────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows verwalten' });
    }

    const workflows = await prisma.boothWorkflow.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ workflows });
  } catch (error) {
    logger.error('List workflows error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── GET WORKFLOW ───────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });
    res.json({ workflow });
  } catch (error) {
    logger.error('Get workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── CREATE WORKFLOW (Admin only) ───────────────────────────────────────────

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows erstellen' });
    }

    const { name, description, steps, isPublic, isDefault } = req.body;
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Name und Steps (Array) sind erforderlich' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.boothWorkflow.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const workflow = await prisma.boothWorkflow.create({
      data: {
        name,
        description,
        steps,
        isPublic: isPublic ?? false,
        isDefault: isDefault ?? false,
        createdBy: req.userId,
      },
    });

    res.status(201).json({ workflow });
  } catch (error) {
    logger.error('Create workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

// ─── UPDATE WORKFLOW (Admin only) ───────────────────────────────────────────

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows bearbeiten' });
    }

    const { name, description, steps, isPublic, isDefault } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (steps !== undefined) data.steps = steps;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (isDefault !== undefined) {
      data.isDefault = isDefault;
      if (isDefault) {
        await prisma.boothWorkflow.updateMany({
          where: { isDefault: true, id: { not: req.params.id } },
          data: { isDefault: false },
        });
      }
    }

    const workflow = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ workflow });
  } catch (error) {
    logger.error('Update workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// ─── DELETE WORKFLOW (Admin only) ───────────────────────────────────────────

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows löschen' });
    }

    await prisma.boothWorkflow.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ─── GET DEFAULT WORKFLOW ───────────────────────────────────────────────────

router.get('/meta/default', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.boothWorkflow.findFirst({
      where: { isDefault: true },
    });
    res.json({ workflow: workflow || null });
  } catch (error) {
    logger.error('Get default workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;
