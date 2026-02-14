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

    const { flowType, isSystem, isLocked } = req.query;
    const where: any = {};

    if (flowType) where.flowType = flowType;
    if (isSystem !== undefined) where.isSystem = isSystem === 'true';
    if (isLocked !== undefined) where.isLocked = isLocked === 'true';

    const workflows = await prisma.boothWorkflow.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { backups: true, events: true } },
      },
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

// ─── GET WORKFLOW BY FLOW TYPE (Public — for guest app runtime) ─────────────

router.get('/by-type/:flowType', async (req: any, res: Response) => {
  try {
    const workflow = await prisma.boothWorkflow.findFirst({
      where: {
        flowType: req.params.flowType,
        isDefault: true,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        flowType: true,
        steps: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Kein Workflow für diesen Typ gefunden' });
    }

    res.json({ workflow });
  } catch (error) {
    logger.error('Get workflow by type error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
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

// ─── GET FLOW TYPES ─────────────────────────────────────────────────────────

router.get('/meta/flow-types', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const flowTypes = [
    { value: 'BOOTH', label: 'Photo Booth', icon: '📷' },
    { value: 'MIRROR_BOOTH', label: 'Mirror Booth', icon: '🪞' },
    { value: 'KI_BOOTH', label: 'KI Booth', icon: '🤖' },
    { value: 'KI_KUNST', label: 'KI-Kunst', icon: '🎨' },
    { value: 'FOTO_SPIEL', label: 'Foto-Spiele', icon: '🎮' },
    { value: 'UPLOAD', label: 'Upload Flow', icon: '📤' },
    { value: 'FACE_SEARCH', label: 'Face Search', icon: '👤' },
    { value: 'MOSAIC', label: 'Mosaic Wall', icon: '🧩' },
    { value: 'GUESTBOOK', label: 'Gästebuch', icon: '📖' },
    { value: 'SPINNER', label: '360° Spinner', icon: '🔄' },
    { value: 'DRAWBOT', label: 'Drawbot', icon: '✏️' },
    { value: 'CUSTOM', label: 'Custom', icon: '⚙️' },
  ];
  res.json({ flowTypes });
});

// ─── LOCK WORKFLOW ──────────────────────────────────────────────────────────

router.post('/:id/lock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows sperren' });
    }

    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });
    if (workflow.isLocked) return res.status(400).json({ error: 'Workflow ist bereits gesperrt' });

    // Create backup before locking
    await prisma.workflowBackup.create({
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        steps: workflow.steps as any,
        version: workflow.version,
        createdBy: req.userId,
        reason: 'Before lock',
      },
    });

    const updated = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.userId,
      },
    });

    res.json({ workflow: updated });
  } catch (error) {
    logger.error('Lock workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Sperren' });
  }
});

// ─── UNLOCK WORKFLOW ────────────────────────────────────────────────────────

router.post('/:id/unlock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows entsperren' });
    }

    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });
    if (!workflow.isLocked) return res.status(400).json({ error: 'Workflow ist nicht gesperrt' });

    // Create backup before unlocking
    await prisma.workflowBackup.create({
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        steps: workflow.steps as any,
        version: workflow.version,
        createdBy: req.userId,
        reason: 'Before unlock',
      },
    });

    const updated = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        version: { increment: 1 },
      },
    });

    res.json({ workflow: updated });
  } catch (error) {
    logger.error('Unlock workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Entsperren' });
  }
});

// ─── GET WORKFLOW BACKUPS ───────────────────────────────────────────────────

router.get('/:id/backups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Backups sehen' });
    }

    const backups = await prisma.workflowBackup.findMany({
      where: { workflowId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ backups });
  } catch (error) {
    logger.error('Get workflow backups error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── CREATE BACKUP ──────────────────────────────────────────────────────────

router.post('/:id/backup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Backups erstellen' });
    }

    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });

    const { reason } = req.body;

    const backup = await prisma.workflowBackup.create({
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        steps: workflow.steps as any,
        version: workflow.version,
        createdBy: req.userId,
        reason: reason || 'Manual backup',
      },
    });

    res.status(201).json({ backup });
  } catch (error) {
    logger.error('Create workflow backup error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

// ─── RESTORE FROM BACKUP ────────────────────────────────────────────────────

router.post('/:id/restore/:backupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Backups wiederherstellen' });
    }

    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });
    if (workflow.isLocked) return res.status(400).json({ error: 'Workflow ist gesperrt' });

    const backup = await prisma.workflowBackup.findFirst({
      where: { id: req.params.backupId, workflowId: req.params.id },
    });
    if (!backup) return res.status(404).json({ error: 'Backup nicht gefunden' });

    // Create backup of current state before restore
    await prisma.workflowBackup.create({
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        steps: workflow.steps as any,
        version: workflow.version,
        createdBy: req.userId,
        reason: `Before restore from backup ${backup.id}`,
      },
    });

    const updated = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data: {
        name: backup.name,
        steps: backup.steps as any,
        version: { increment: 1 },
      },
    });

    res.json({ workflow: updated });
  } catch (error) {
    logger.error('Restore workflow backup error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Wiederherstellen' });
  }
});

// ─── DUPLICATE WORKFLOW ─────────────────────────────────────────────────────

router.post('/:id/duplicate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows duplizieren' });
    }

    const original = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Workflow nicht gefunden' });

    const { name } = req.body;

    const duplicate = await prisma.boothWorkflow.create({
      data: {
        name: name || `${original.name} (Kopie)`,
        description: original.description,
        steps: original.steps as any,
        flowType: original.flowType,
        isPublic: false,
        isDefault: false,
        isSystem: false,
        isLocked: false,
        parentId: original.id,
        createdBy: req.userId,
      },
    });

    res.status(201).json({ workflow: duplicate });
  } catch (error) {
    logger.error('Duplicate workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Duplizieren' });
  }
});

export default router;
