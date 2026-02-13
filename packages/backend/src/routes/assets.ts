import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ─── LIST ASSETS ────────────────────────────────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, category, partnerId, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (partnerId) {
      where.partnerId = partnerId;
    } else {
      where.isPublic = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.asset.count({ where }),
    ]);

    res.json({ assets, total });
  } catch (error) {
    logger.error('List assets error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Assets' });
  }
});

// ─── GET ASSET ──────────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).json({ error: 'Asset nicht gefunden' });
    res.json({ asset });
  } catch (error) {
    logger.error('Get asset error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── UPLOAD ASSET (Admin only) ──────────────────────────────────────────────

router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Assets hochladen' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const { name, type, category, tags, partnerId, isPublic, sortOrder } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name und Typ sind erforderlich' });
    }

    // Upload to storage
    const storagePath = await storageService.uploadFile(
      'assets',
      file.originalname,
      file.buffer,
      file.mimetype
    );

    // Get dimensions if image
    let width: number | undefined;
    let height: number | undefined;
    try {
      const sharp = require('sharp');
      const meta = await sharp(file.buffer).metadata();
      width = meta.width;
      height = meta.height;
    } catch { /* sharp not available or not an image */ }

    const asset = await prisma.asset.create({
      data: {
        name,
        type,
        category: category || null,
        storagePath,
        width,
        height,
        fileSize: file.size,
        mimeType: file.mimetype,
        isPublic: isPublic !== 'false',
        partnerId: partnerId || null,
        createdBy: req.userId,
        tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [],
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    res.status(201).json({ asset });
  } catch (error) {
    logger.error('Upload asset error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ─── UPDATE ASSET (Admin only) ──────────────────────────────────────────────

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Assets bearbeiten' });
    }

    const { name, category, tags, isPublic, sortOrder, partnerId } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (partnerId !== undefined) data.partnerId = partnerId;

    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ asset });
  } catch (error) {
    logger.error('Update asset error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// ─── DELETE ASSET (Admin only) ──────────────────────────────────────────────

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Assets löschen' });
    }

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).json({ error: 'Asset nicht gefunden' });

    // Delete from storage
    try {
      await storageService.deleteFile(asset.storagePath);
      if (asset.thumbnailPath) await storageService.deleteFile(asset.thumbnailPath);
    } catch { /* storage deletion is best-effort */ }

    await prisma.asset.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete asset error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ─── GET ASSET FILE ─────────────────────────────────────────────────────────

router.get('/:id/file', async (req, res: Response) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).json({ error: 'Asset nicht gefunden' });

    const fileBuffer = await storageService.getFile(asset.storagePath);
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(fileBuffer);
  } catch (error) {
    logger.error('Get asset file error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Datei' });
  }
});

// ─── CATEGORIES (distinct values) ───────────────────────────────────────────

router.get('/meta/categories', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const results = await prisma.asset.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json({ categories: results.map(r => r.category).filter(Boolean) });
  } catch (error) {
    logger.error('Asset categories error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler' });
  }
});

export default router;
