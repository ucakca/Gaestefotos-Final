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

    const { name, description, steps, flowType, isPublic, isDefault, isActive } = req.body;
    if (!name || !steps) {
      return res.status(400).json({ error: 'Name und Steps sind erforderlich' });
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
        flowType: flowType || undefined,
        isPublic: isPublic ?? false,
        isDefault: isDefault ?? false,
        isActive: isActive ?? true,
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

    const { name, description, steps, flowType, isPublic, isDefault, isActive, expectedVersion } = req.body;

    // Block editing locked workflows
    const existing = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Workflow nicht gefunden' });
    }
    if (existing.isLocked) {
      return res.status(400).json({ error: 'Workflow ist gesperrt. Bitte zuerst entsperren.' });
    }

    // Optimistic Concurrency Control: reject if version mismatch
    if (expectedVersion !== undefined && expectedVersion !== existing.version) {
      return res.status(409).json({
        error: 'Konflikt: Der Workflow wurde zwischenzeitlich von einem anderen Benutzer geändert.',
        code: 'VERSION_CONFLICT',
        currentVersion: existing.version,
        expectedVersion,
      });
    }

    const data: any = { version: { increment: 1 } };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (steps !== undefined) data.steps = steps;
    if (flowType !== undefined) data.flowType = flowType;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (isActive !== undefined) data.isActive = isActive;
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
  } catch (error: any) {
    // Invalid enum value → treat as 404
    if (error?.code === 'P2023' || error?.message?.includes('Invalid value')) {
      return res.status(404).json({ error: 'Ungültiger Workflow-Typ' });
    }
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

// ─── TEMPLATE MARKETPLACE ──────────────────────────────────────────────────

router.get('/meta/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { flowType, tag, search } = req.query;
    const where: any = { isTemplate: true };

    if (flowType) where.flowType = flowType;
    if (tag) where.tags = { has: String(tag) };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.boothWorkflow.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        flowType: true,
        isSystem: true,
        tags: true,
        ownerType: true,
        version: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });

    res.json({ templates });
  } catch (error) {
    logger.error('List templates error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

router.post('/:id/publish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const { tags } = req.body;
    const workflow = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data: {
        isTemplate: true,
        isPublic: true,
        tags: Array.isArray(tags) ? tags : [],
      },
    });

    res.json({ workflow });
  } catch (error) {
    logger.error('Publish template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
  }
});

router.post('/:id/unpublish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const workflow = await prisma.boothWorkflow.update({
      where: { id: req.params.id },
      data: { isTemplate: false },
    });

    res.json({ workflow });
  } catch (error) {
    logger.error('Unpublish template error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Zurückziehen' });
  }
});

// ─── EXPORT WORKFLOW (JSON) ─────────────────────────────────────────────────

router.get('/:id/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows exportieren' });
    }

    const workflow = await prisma.boothWorkflow.findUnique({ where: { id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow nicht gefunden' });

    const exportData = {
      _format: 'gaestefotos-workflow-v1',
      _exportedAt: new Date().toISOString(),
      name: workflow.name,
      description: workflow.description,
      flowType: workflow.flowType,
      steps: workflow.steps,
      version: workflow.version,
    };

    res.setHeader('Content-Disposition', `attachment; filename="${workflow.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.workflow.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    logger.error('Export workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Exportieren' });
  }
});

// ─── IMPORT WORKFLOW (JSON) ─────────────────────────────────────────────────

router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Workflows importieren' });
    }

    const data = req.body;
    if (!data?._format || !data._format.startsWith('gaestefotos-workflow')) {
      return res.status(400).json({ error: 'Ungültiges Workflow-Format. Bitte eine .workflow.json Datei verwenden.' });
    }

    if (!data.name || !data.steps) {
      return res.status(400).json({ error: 'Name und Steps sind erforderlich' });
    }

    const workflow = await prisma.boothWorkflow.create({
      data: {
        name: `${data.name} (Import)`,
        description: data.description || null,
        steps: data.steps,
        flowType: data.flowType || 'BOOTH',
        isPublic: false,
        isDefault: false,
        isSystem: false,
        createdBy: req.userId,
      },
    });

    res.status(201).json({ workflow });
  } catch (error) {
    logger.error('Import workflow error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Importieren' });
  }
});

// ─── EDITING SESSION (Soft Lock for Multi-User) ──────────────────────────

// In-memory editing sessions (lightweight, no DB needed)
const editingSessions = new Map<string, { userId: string; userName: string; startedAt: number }>();

// Heartbeat: claim editing session (call every 30s from frontend)
router.post('/:id/editing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const workflowId = req.params.id;
    const { userName } = req.body;
    const existing = editingSessions.get(workflowId);

    // If someone else is editing, check if their session is stale (>60s)
    if (existing && existing.userId !== req.userId) {
      const staleThreshold = 60_000; // 60 seconds
      if (Date.now() - existing.startedAt < staleThreshold) {
        return res.status(423).json({
          error: `Wird gerade von ${existing.userName} bearbeitet`,
          code: 'EDITING_LOCKED',
          editingBy: existing.userName,
          editingSince: existing.startedAt,
        });
      }
    }

    // Claim or refresh session
    editingSessions.set(workflowId, {
      userId: req.userId!,
      userName: userName || 'Unbekannt',
      startedAt: Date.now(),
    });

    res.json({ editing: true, sessionOwner: req.userId });
  } catch (error) {
    logger.error('Editing session error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// Release editing session
router.delete('/:id/editing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const workflowId = req.params.id;
    const existing = editingSessions.get(workflowId);

    if (existing?.userId === req.userId) {
      editingSessions.delete(workflowId);
    }

    res.json({ editing: false });
  } catch (error) {
    logger.error('Release editing session error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// Check who is editing
router.get('/:id/editing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const workflowId = req.params.id;
    const session = editingSessions.get(workflowId);

    if (!session || Date.now() - session.startedAt > 60_000) {
      editingSessions.delete(workflowId);
      return res.json({ editing: false, editingBy: null });
    }

    res.json({
      editing: true,
      editingBy: session.userName,
      editingUserId: session.userId,
      isMe: session.userId === req.userId,
      editingSince: session.startedAt,
    });
  } catch (error) {
    logger.error('Check editing session error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// ─── WORKFLOW ANALYTICS ────────────────────────────────────────────────────

router.get('/meta/analytics', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const workflows = await prisma.boothWorkflow.findMany({
      select: {
        id: true,
        name: true,
        flowType: true,
        isSystem: true,
        isDefault: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { events: true, backups: true } },
        events: {
          select: {
            id: true,
            isActive: true,
            _count: { select: { photos: true, guests: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const analytics = workflows.map((wf) => {
      const totalPhotos = wf.events.reduce((sum, ev) => sum + ev._count.photos, 0);
      const totalGuests = wf.events.reduce((sum, ev) => sum + ev._count.guests, 0);
      const activeEvents = wf.events.filter((ev) => ev.isActive).length;
      const nodeCount = (wf as any).steps?.nodes?.length || 0;

      return {
        id: wf.id,
        name: wf.name,
        flowType: wf.flowType,
        isSystem: wf.isSystem,
        isDefault: wf.isDefault,
        version: wf.version,
        createdAt: wf.createdAt,
        updatedAt: wf.updatedAt,
        eventsTotal: wf._count.events,
        eventsActive: activeEvents,
        backupsCount: wf._count.backups,
        totalPhotos,
        totalGuests,
      };
    });

    const summary = {
      totalWorkflows: workflows.length,
      totalEventsUsing: workflows.reduce((s, w) => s + w._count.events, 0),
      totalPhotosViaWorkflows: analytics.reduce((s, a) => s + a.totalPhotos, 0),
      mostUsed: analytics.sort((a, b) => b.eventsTotal - a.eventsTotal)[0] || null,
    };

    res.json({ analytics, summary });
  } catch (error) {
    logger.error('Workflow analytics error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Analytics' });
  }
});

export default router;
