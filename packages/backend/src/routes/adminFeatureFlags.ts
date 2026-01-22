import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/admin/feature-flags
 * Liste aller Package Definitions mit Feature Flags
 * Admin only
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const packages = await prisma.packageDefinition.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ packages });
  } catch (error) {
    logger.error('Get feature flags error', { error });
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

/**
 * GET /api/admin/feature-flags/:id
 * Einzelne Package Definition mit Feature Flags
 * Admin only
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pkg = await prisma.packageDefinition.findUnique({
      where: { id: req.params.id },
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: pkg });
  } catch (error) {
    logger.error('Get feature flag error', { error });
    res.status(500).json({ error: 'Failed to fetch feature flag' });
  }
});

/**
 * PUT /api/admin/feature-flags/:id
 * Update Package Definition Feature Flags
 * Admin only
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      sku,
      type,
      resultingTier,
      upgradeFromTier,
      storageLimitBytes,
      storageDurationDays,
      isActive,
      allowVideoUpload,
      allowStories,
      allowPasswordProtect,
      allowGuestbook,
      allowZipDownload,
      allowBulkOperations,
      allowLiveWall,
      allowFaceSearch,
      allowGuestlist,
      allowFullInvitation,
      allowCoHosts,
      isAdFree,
      priceEurCents,
      storageLimitPhotos,
      maxCategories,
      maxChallenges,
      maxCoHosts,
      maxZipDownloadPhotos,
      description,
      displayOrder,
    } = req.body;

    const updated = await prisma.packageDefinition.update({
      where: { id: req.params.id },
      data: {
        name,
        sku,
        type,
        resultingTier,
        upgradeFromTier,
        storageLimitBytes,
        storageDurationDays,
        isActive,
        allowVideoUpload,
        allowStories,
        allowPasswordProtect,
        allowGuestbook,
        allowZipDownload,
        allowBulkOperations,
        allowLiveWall,
        allowFaceSearch,
        allowGuestlist,
        allowFullInvitation,
        allowCoHosts,
        isAdFree,
        priceEurCents,
        storageLimitPhotos,
        maxCategories,
        maxChallenges,
        maxCoHosts,
        maxZipDownloadPhotos,
        description,
        displayOrder,
      },
    });

    logger.info('Feature flags updated', { packageId: updated.id, adminId: req.userId });
    res.json({ package: updated });
  } catch (error) {
    logger.error('Update feature flags error', { error });
    res.status(500).json({ error: 'Failed to update feature flags' });
  }
});

/**
 * POST /api/admin/feature-flags
 * Create new Package Definition
 * Admin only
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      sku,
      type,
      resultingTier,
      upgradeFromTier,
      storageLimitBytes,
      storageDurationDays,
      isActive,
      allowVideoUpload,
      allowStories,
      allowPasswordProtect,
      allowGuestbook,
      allowZipDownload,
      allowBulkOperations,
      allowLiveWall,
      allowFaceSearch,
      allowGuestlist,
      allowFullInvitation,
      allowCoHosts,
      isAdFree,
      priceEurCents,
      storageLimitPhotos,
      maxCategories,
      maxChallenges,
      maxCoHosts,
      maxZipDownloadPhotos,
      description,
      displayOrder,
    } = req.body;

    if (!name || !sku || !resultingTier) {
      return res.status(400).json({ error: 'Name, SKU and resultingTier are required' });
    }

    const created = await prisma.packageDefinition.create({
      data: {
        name,
        sku,
        type: type || 'BASE',
        resultingTier,
        upgradeFromTier,
        storageLimitBytes,
        storageDurationDays,
        isActive: isActive !== undefined ? isActive : true,
        allowVideoUpload: allowVideoUpload || false,
        allowStories: allowStories || false,
        allowPasswordProtect: allowPasswordProtect || false,
        allowGuestbook: allowGuestbook || false,
        allowZipDownload: allowZipDownload || false,
        allowBulkOperations: allowBulkOperations || false,
        allowLiveWall: allowLiveWall || false,
        allowFaceSearch: allowFaceSearch || false,
        allowGuestlist: allowGuestlist || false,
        allowFullInvitation: allowFullInvitation || false,
        allowCoHosts: allowCoHosts || false,
        isAdFree: isAdFree || false,
        priceEurCents,
        storageLimitPhotos,
        maxCategories,
        maxChallenges,
        maxCoHosts,
        maxZipDownloadPhotos,
        description,
        displayOrder: displayOrder || 0,
      },
    });

    logger.info('Feature flags package created', { packageId: created.id, adminId: req.userId });
    
    // Convert BigInt fields to Number for JSON serialization
    const createdFormatted = {
      ...created,
      storageLimitBytes: created.storageLimitBytes ? Number(created.storageLimitBytes) : null,
      priceEurCents: created.priceEurCents ? Number(created.priceEurCents) : null,
    };
    
    res.status(201).json({ package: createdFormatted });
  } catch (error) {
    logger.error('Create feature flags error', { error });
    res.status(500).json({ error: 'Failed to create package' });
  }
});

/**
 * DELETE /api/admin/feature-flags/:id
 * Delete Package Definition
 * Admin only
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await prisma.packageDefinition.delete({
      where: { id: req.params.id },
    });

    logger.info('Feature flags package deleted', { packageId: req.params.id, adminId: req.userId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete feature flags error', { error });
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
