import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, isPrivilegedRole, AuthRequest } from '../middleware/auth';
import { optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/face-swap/templates — Public: list active templates
router.get('/templates', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { category, limit = '50', offset = '0' } = req.query;
    const where: any = { isActive: true };
    if (category && typeof category === 'string') where.category = category;

    const [templates, total] = await Promise.all([
      prisma.faceSwapTemplate.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { usageCount: 'desc' }],
        take: Math.min(parseInt(String(limit), 10) || 50, 100),
        skip: parseInt(String(offset), 10) || 0,
        select: {
          id: true, title: true, category: true, imageUrl: true,
          thumbnailUrl: true, tags: true, isDefault: true, sortOrder: true,
          usageCount: true, source: true,
        },
      }),
      prisma.faceSwapTemplate.count({ where }),
    ]);

    const categories = await prisma.faceSwapTemplate.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    res.json({ templates, total, categories: categories.map(c => ({ name: c.category, count: c._count.id })) });
  } catch (error: any) {
    logger.error('Face swap templates list error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Templates' });
  }
});

// GET /api/face-swap/templates/:id — Public: single template
router.get('/templates/:id', async (req, res: Response) => {
  try {
    const template = await prisma.faceSwapTemplate.findUnique({ where: { id: req.params.id } });
    if (!template || !template.isActive) return res.status(404).json({ error: 'Template nicht gefunden' });
    res.json({ template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/face-swap/templates — Admin: create template
router.post('/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const { title, category, imageUrl, thumbnailUrl, tags, isActive, sortOrder, source, licenseType } = req.body;
    if (!title || !category || !imageUrl) {
      return res.status(400).json({ error: 'title, category und imageUrl sind erforderlich' });
    }
    const template = await prisma.faceSwapTemplate.create({
      data: {
        title, category, imageUrl,
        thumbnailUrl: thumbnailUrl || null,
        tags: Array.isArray(tags) ? tags : [],
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
        source: source || 'custom',
        licenseType: licenseType || 'royalty_free',
        createdBy: req.userId,
      },
    });
    res.status(201).json({ template });
  } catch (error: any) {
    logger.error('Face swap template create error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/face-swap/templates/:id — Admin: update template
router.patch('/templates/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const { title, category, imageUrl, thumbnailUrl, tags, isActive, sortOrder, source, licenseType } = req.body;
    const template = await prisma.faceSwapTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(Array.isArray(tags) && { tags }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(source !== undefined && { source }),
        ...(licenseType !== undefined && { licenseType }),
      },
    });
    res.json({ template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/face-swap/templates/:id — Admin: delete (only non-default)
router.delete('/templates/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const template = await prisma.faceSwapTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Nicht gefunden' });
    if (template.isDefault) return res.status(400).json({ error: 'Standard-Templates können nicht gelöscht werden' });
    await prisma.faceSwapTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/face-swap/templates/:id/increment-usage — Track usage
router.post('/templates/:id/increment-usage', async (req, res: Response) => {
  try {
    await prisma.faceSwapTemplate.update({
      where: { id: req.params.id },
      data: { usageCount: { increment: 1 } },
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

export default router;
