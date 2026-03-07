import { Router, Response } from 'express';
import prisma from '../config/database';
import { io } from '../index';
import { bufferedEmit } from '../services/wsBuffer';
import { authMiddleware, AuthRequest, hasEventManageAccess, hasEventAccess, hasEventPermission, isPrivilegedRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { sendPushToEvent, notifyEventHost, pushTemplates } from '../services/pushNotification';
import { logger } from '../utils/logger';
import { auditLog, AuditType } from '../services/auditLogger';
import archiver from 'archiver';

const router = Router();

router.post(
  '/bulk/download',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds } = req.body;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'Keine Fotos ausgewählt' });
      }

      const photos = await prisma.photo.findMany({
        where: {
          id: { in: photoIds },
          deletedAt: null,
        },
        include: {
          event: true,
          category: {
            select: { id: true, name: true },
          },
        },
      });

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Keine Fotos gefunden' });
      }

      const event = photos[0].event;
      const eventId = event.id;

      if (photos.some((p) => p.eventId !== eventId)) {
        return res.status(400).json({ error: 'Fotos müssen aus demselben Event stammen' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (req.userId && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canDownload = await hasEventPermission(req, eventId, 'canDownload');
        if (!canDownload) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }

      // Storage period enforcement - Host/Admin can still bulk-download after lock (for backup)
      // Note: hasEventManageAccess already verified above, so we skip lock for managers

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-photos-${Date.now()}.zip"`);

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.on('error', (err: any) => {
        logger.error('ZIP creation error', { error: err.message, eventId: event.id });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Erstellen der ZIP-Datei' });
        }
      });

      archive.pipe(res);

      // Track photo index per category for sequential naming
      const categoryCounters: Record<string, number> = {};
      
      for (const photo of photos) {
        if (!photo.storagePath) continue;
        try {
          // Use original quality for bulk download (host/admin only endpoint)
          const downloadPath = photo.storagePathOriginal || photo.storagePath;
          const fileBuffer = await storageService.getFile(downloadPath);
          const extension = downloadPath.split('.').pop() || 'jpg';
          
          // Organize files in category folders
          const categoryName = (photo as any).category?.name || 'Allgemein';
          const safeCategoryName = categoryName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').trim() || 'Allgemein';
          
          // Increment counter for this category
          categoryCounters[safeCategoryName] = (categoryCounters[safeCategoryName] || 0) + 1;
          const photoIndex = categoryCounters[safeCategoryName].toString().padStart(3, '0');
          
          archive.append(fileBuffer, { name: `${safeCategoryName}/IMG_${photoIndex}.${extension}` });
        } catch (err: any) {
          logger.warn('Failed to add photo to ZIP', { error: err.message, photoId: photo.id });
        }
      }

      archive.finalize();
    } catch (error: any) {
      logger.error('Bulk download error', { error: error.message, stack: error.stack });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Interner Serverfehler' });
      }
    }
  }
);
// ─── Batch Approve/Reject ───────────────────────────────────────────────────
// POST /bulk/moderate — approve or reject multiple photos at once
router.post(
  '/bulk/moderate',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, action, eventId } = req.body;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds array required' });
      }
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action must be "approve" or "reject"' });
      }
      if (!eventId) {
        return res.status(400).json({ error: 'eventId required' });
      }
      if (photoIds.length > 200) {
        return res.status(400).json({ error: 'Max 200 photos per batch' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

      const result = await prisma.photo.updateMany({
        where: {
          id: { in: photoIds },
          eventId, // Safety: only update photos belonging to this event
        },
        data: { status: newStatus },
      });

      // Emit WebSocket events for approved photos
      if (action === 'approve') {
        io.to(`event:${eventId}`).emit('photos_bulk_approved', {
          photoIds,
          count: result.count,
        });
      }

      // Trigger workflow automations for bulk moderation (non-blocking)
      const triggerType = action === 'approve' ? 'TRIGGER_PHOTO_APPROVED' : 'TRIGGER_PHOTO_REJECTED';
      import('../services/workflowExecutor').then(m =>
        m.onEventTrigger(eventId, triggerType as any, { guestId: undefined })
      ).catch(() => {});

      logger.info('Bulk moderation', { eventId, action, requested: photoIds.length, updated: result.count });

      res.json({
        action,
        requested: photoIds.length,
        updated: result.count,
      });
    } catch (error: any) {
      logger.error('Bulk moderate error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /bulk/move-category — Move multiple photos to a different category
router.post(
  '/bulk/move-category',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, categoryId, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { categoryId: categoryId || null },
      });

      res.json({ updated: result.count, categoryId: categoryId || null });
    } catch (error: any) {
      logger.error('Bulk move-category error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /bulk/favorite — Set isFavorite on multiple photos at once
router.post(
  '/bulk/favorite',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, isFavorite, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { isFavorite: isFavorite !== false },
      });

      res.json({ updated: result.count, isFavorite: isFavorite !== false });
    } catch (error: any) {
      logger.error('Bulk favorite error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /bulk/tag — assign tags to multiple photos at once
router.post(
  '/bulk/tag',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, tags, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags Array erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const cleanTags = tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { tags: cleanTags },
      });

      res.json({ updated: result.count, tags: cleanTags });
    } catch (error: any) {
      logger.error('Bulk tag error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /bulk/reject — Reject pending photos (all or by ID list)
router.post(
  '/bulk/reject',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, photoIds } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const where: any = { eventId, deletedAt: null };
      if (Array.isArray(photoIds) && photoIds.length > 0) where.id = { in: photoIds };
      else where.status = 'PENDING';

      const result = await prisma.photo.updateMany({
        where,
        data: { status: 'REJECTED' as any },
      });

      res.json({ rejected: result.count });
    } catch (error: any) {
      logger.error('Bulk reject error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Ablehnen' });
    }
  }
);

// POST /bulk/approve — Approve all pending photos for an event
router.post(
  '/bulk/approve',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const result = await prisma.photo.updateMany({
        where: { eventId, status: 'PENDING', deletedAt: null },
        data: { status: 'APPROVED' as any },
      });

      logger.info('Bulk approve photos', { eventId, count: result.count, userId: req.userId });
      res.json({ approved: result.count });
    } catch (error: any) {
      logger.error('Bulk approve error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Freigeben' });
    }
  }
);

// POST /bulk/restore — Restore bulk-deleted photos back to APPROVED
router.post(
  '/bulk/restore',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { status: 'APPROVED' as any, deletedAt: null },
      });

      res.json({ restored: result.count });
    } catch (error: any) {
      logger.error('Bulk restore error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Wiederherstellen' });
    }
  }
);

// POST /bulk/delete — Bulk soft-delete photos
router.post(
  '/bulk/delete',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds erforderlich' });
      }
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { status: 'DELETED' as any, deletedAt: new Date() },
      });

      logger.info('Bulk delete photos', { eventId, count: result.count, userId: req.userId });
      res.json({ deleted: result.count });
    } catch (error: any) {
      logger.error('Bulk delete error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }
);

// POST /bulk/ai-caption — Generate context captions for multiple photos
router.post(
  '/bulk/ai-caption',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, overwrite = false } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

      const where: any = { eventId, deletedAt: null };
      if (!overwrite) where.description = null;

      const photos = await prisma.photo.findMany({
        where,
        select: { id: true, uploadedBy: true, faceCount: true, tags: true },
        take: 100,
      });

      let updated = 0;
      for (const photo of photos) {
        const parts: string[] = [];
        if (photo.uploadedBy) parts.push(`Hochgeladen von ${photo.uploadedBy}`);
        if (photo.faceCount && photo.faceCount > 0) parts.push(`${photo.faceCount} Person${photo.faceCount !== 1 ? 'en' : ''}`);
        if (photo.tags && photo.tags.length > 0) parts.push(photo.tags.join(', '));
        const caption = parts.length > 0 ? parts.join(' · ') : 'Foto vom Event';
        await prisma.photo.update({ where: { id: photo.id }, data: { description: caption } });
        updated++;
      }

      res.json({ updated, total: photos.length });
    } catch (error: any) {
      logger.error('Bulk AI caption error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /bulk/approve-all — approve all pending photos for an event
router.post(
  '/bulk/approve-all',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({ error: 'eventId required' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      const result = await prisma.photo.updateMany({
        where: { eventId, status: 'PENDING' },
        data: { status: 'APPROVED' },
      });

      if (result.count > 0) {
        io.to(`event:${eventId}`).emit('photos_bulk_approved', {
          count: result.count,
          all: true,
        });
      }

      logger.info('Bulk approve all', { eventId, approved: result.count });

      res.json({ approved: result.count });
    } catch (error: any) {
      logger.error('Bulk approve-all error', { error: error.message });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Delete photo
router.delete(
  '/:photoId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }
      if (req.userId && photo.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, photo.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(403).json({ error: 'Zugriff verweigert' });
        }
      }
      
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'DELETED' },
      });

      auditLog({ type: AuditType.PHOTO_DELETED, message: `Foto gelöscht`, eventId: photo.eventId, data: { photoId: req.params.photoId }, req });

      res.json({ message: 'Photo deleted' });
    } catch (error: any) {
      logger.error('Delete photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Restore photo from trash
router.post(
  '/:photoId/restore',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'APPROVED' },
      });

      res.json({ message: 'Photo restored' });
    } catch (error: any) {
      logger.error('Restore photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Permanently delete photo (purge)
router.delete(
  '/:photoId/purge',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: {
          id: true,
          eventId: true,
          storagePath: true,
          storagePathOriginal: true,
          storagePathThumb: true,
          event: {
            select: {
              id: true,
              hostId: true,
            },
          },
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      // Delete from storage
      if (photo.storagePath) {
        await storageService.deleteFile(photo.storagePath);
      }
      if (photo.storagePathOriginal) {
        await storageService.deleteFile(photo.storagePathOriginal);
      }
      if (photo.storagePathThumb) {
        await storageService.deleteFile(photo.storagePathThumb);
      }

      // Delete from database
      await prisma.photo.delete({
        where: { id: photoId },
      });

      res.json({ message: 'Photo permanently deleted' });
    } catch (error: any) {
      logger.error('Purge photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);
router.post('/bulk/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body as { photoIds: string[] };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, deletedAt: { not: null } },
      select: { id: true, eventId: true },
    });

    let restored = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { deletedAt: null } });
      restored++;
    }

    res.json({ restored, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk restore error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// DELETE /photos/bulk/delete — Bulk soft-delete photos
router.delete('/bulk/delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body as { photoIds: string[] };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, deletedAt: null },
      select: { id: true, eventId: true },
    });

    let deleted = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { deletedAt: new Date() } });
      deleted++;
    }

    res.json({ deleted, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk delete error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/set-favorite — Mark multiple photos as favorite
router.patch('/bulk/set-favorite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, isFavorite } = req.body as { photoIds: string[]; isFavorite: boolean };
    if (!Array.isArray(photoIds) || !photoIds.length || typeof isFavorite !== 'boolean') {
      return res.status(400).json({ error: 'photoIds (Array) und isFavorite (boolean) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { isFavorite } });
      updated++;
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk set-favorite error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/set-category — Set category for multiple photos
router.patch('/bulk/set-category', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, categoryId } = req.body as { photoIds: string[]; categoryId: string | null };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({
        where: { id: photo.id },
        data: { categoryId: categoryId || null },
      });
      updated++;
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk set-category error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/remove-tag — Remove tag from multiple photos
router.patch('/bulk/remove-tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, tag } = req.body as { photoIds: string[]; tag: string };
    if (!Array.isArray(photoIds) || !photoIds.length || !tag?.trim()) {
      return res.status(400).json({ error: 'photoIds (Array) und tag erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, tags: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      if (photo.tags.includes(tag)) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { tags: photo.tags.filter((t: string) => t !== tag) },
        });
        updated++;
      }
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk remove-tag error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/add-tag — Add tag to multiple photos
router.patch('/bulk/add-tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, tag } = req.body as { photoIds: string[]; tag: string };
    if (!Array.isArray(photoIds) || !photoIds.length || !tag?.trim()) {
      return res.status(400).json({ error: 'photoIds (Array) und tag erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, tags: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      if (!photo.tags.includes(tag)) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { tags: { push: tag } },
        });
        updated++;
      }
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk add-tag error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /bulk/reorder — Set display order for multiple photos
router.patch(
  '/bulk/reorder',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items Array mit {id, displayOrder} erforderlich' });
      }
      if (items.length > 500) {
        return res.status(400).json({ error: 'Max. 500 Fotos pro Aufruf' });
      }

      // Validate access: all photos must belong to same event and user must have access
      const photoIds = items.map((i: any) => i.id).filter(Boolean);
      const photos = await prisma.photo.findMany({
        where: { id: { in: photoIds }, deletedAt: null },
        select: { id: true, eventId: true },
      });

      if (photos.length !== photoIds.length) {
        return res.status(400).json({ error: 'Eines oder mehrere Fotos nicht gefunden' });
      }

      const eventIds = [...new Set(photos.map(p => p.eventId))];
      if (eventIds.length > 1) {
        return res.status(400).json({ error: 'Alle Fotos müssen zum selben Event gehören' });
      }

      const eventId = eventIds[0];
      const { hasEventManageAccess } = await import('../middleware/auth');
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Kein Zugriff' });
      }

      // Batch update displayOrder
      await prisma.$transaction(
        items.map((item: { id: string; displayOrder: number }) =>
          prisma.photo.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
          })
        )
      );

      res.json({ success: true, updated: items.length });
    } catch (error: any) {
      logger.error('Bulk reorder error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Reorder' });
    }
  }
);

// GET /:eventId/photos/tag-suggestions — Autocomplete: most-used tags in event
router.get(
  '/:eventId/photos/tag-suggestions',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
      const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Kein Zugriff' });
      }

      // Get all tags used in this event
      const photos = await prisma.photo.findMany({
        where: { eventId, deletedAt: null, tags: { isEmpty: false } },
        select: { tags: true },
      });

      // Count tag frequency
      const tagMap = new Map<string, number>();
      photos.forEach(({ tags }) => {
        tags.forEach(tag => {
          const t = tag.toLowerCase().trim();
          if (t) tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
      });

      // Filter by query and sort by frequency
      const suggestions = Array.from(tagMap.entries())
        .filter(([tag]) => !q || tag.includes(q))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));

      res.json({ suggestions, totalUniqueTags: tagMap.size });
    } catch (error: any) {
      logger.error('Tag suggestions error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }
);

// PATCH /bulk/caption — Set or clear AI captions for multiple photos
router.patch(
  '/bulk/caption',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, caption, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds Array erforderlich' });
      }
      if (photoIds.length > 200) {
        return res.status(400).json({ error: 'Max. 200 Fotos pro Aufruf' });
      }
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Kein Zugriff' });
      }

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId, deletedAt: null },
        data: { title: caption ?? null },
      });

      res.json({ updated: result.count, caption: caption ?? null });
    } catch (error: any) {
      logger.error('Bulk caption error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Aktualisieren' });
    }
  }
);

export default router;
