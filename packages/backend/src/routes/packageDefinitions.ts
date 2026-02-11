import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['BASE', 'ADDON', 'UPGRADE']).optional(),
  resultingTier: z.string().min(1),
  upgradeFromTier: z.string().min(1).optional().nullable(),
  
  // Storage & Duration
  storageLimitBytes: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  storageLimitPhotos: z.number().int().nonnegative().optional().nullable(),
  storageDurationDays: z.number().int().positive().optional().nullable(),
  
  // Feature Flags
  allowVideoUpload: z.boolean().optional(),
  allowStories: z.boolean().optional(),
  allowPasswordProtect: z.boolean().optional(),
  allowGuestbook: z.boolean().optional(),
  allowZipDownload: z.boolean().optional(),
  allowBulkOperations: z.boolean().optional(),
  allowLiveWall: z.boolean().optional(),
  allowFaceSearch: z.boolean().optional(),
  allowGuestlist: z.boolean().optional(),
  allowFullInvitation: z.boolean().optional(),
  allowCoHosts: z.boolean().optional(),
  isAdFree: z.boolean().optional(),
  allowMosaicWall: z.boolean().optional(),
  allowMosaicPrint: z.boolean().optional(),
  allowMosaicExport: z.boolean().optional(),
  
  // Limits
  maxCategories: z.number().int().nonnegative().optional().nullable(),
  maxChallenges: z.number().int().nonnegative().optional().nullable(),
  maxZipDownloadPhotos: z.number().int().nonnegative().optional().nullable(),
  maxCoHosts: z.number().int().nonnegative().optional().nullable(),
  
  // Display & Pricing
  displayOrder: z.number().int().optional(),
  priceEurCents: z.number().int().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
  
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

function toBigIntOrNull(value: unknown): bigint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  return null;
}

function serializePackage(pkg: any) {
  return {
    ...pkg,
    storageLimitBytes: pkg?.storageLimitBytes === null || pkg?.storageLimitBytes === undefined ? pkg?.storageLimitBytes : pkg.storageLimitBytes.toString(),
  };
}

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const packages = await prisma.packageDefinition.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ packages: packages.map(serializePackage) });
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = createSchema.parse(req.body);
  const created = await prisma.packageDefinition.create({
    data: {
      sku: data.sku,
      name: data.name,
      type: data.type || 'BASE',
      resultingTier: data.resultingTier,
      upgradeFromTier: data.upgradeFromTier ?? null,
      
      // Storage & Duration
      storageLimitBytes: toBigIntOrNull(data.storageLimitBytes),
      storageLimitPhotos: data.storageLimitPhotos ?? null,
      storageDurationDays: data.storageDurationDays ?? null,
      
      // Feature Flags
      allowVideoUpload: data.allowVideoUpload ?? false,
      allowStories: data.allowStories ?? false,
      allowPasswordProtect: data.allowPasswordProtect ?? false,
      allowGuestbook: data.allowGuestbook ?? false,
      allowZipDownload: data.allowZipDownload ?? false,
      allowBulkOperations: data.allowBulkOperations ?? false,
      allowLiveWall: data.allowLiveWall ?? false,
      allowFaceSearch: data.allowFaceSearch ?? false,
      allowGuestlist: data.allowGuestlist ?? false,
      allowFullInvitation: data.allowFullInvitation ?? false,
      allowCoHosts: data.allowCoHosts ?? false,
      isAdFree: data.isAdFree ?? false,
      allowMosaicWall: data.allowMosaicWall ?? false,
      allowMosaicPrint: data.allowMosaicPrint ?? false,
      allowMosaicExport: data.allowMosaicExport ?? false,
      
      // Limits
      maxCategories: data.maxCategories ?? null,
      maxChallenges: data.maxChallenges ?? null,
      maxZipDownloadPhotos: data.maxZipDownloadPhotos ?? null,
      maxCoHosts: data.maxCoHosts ?? null,
      
      // Display & Pricing
      displayOrder: data.displayOrder ?? 0,
      priceEurCents: data.priceEurCents ?? null,
      description: data.description ?? null,
      
      isActive: data.isActive ?? true,
    },
  });
  res.status(201).json({ package: serializePackage(created) });
});

router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const patch = updateSchema.parse(req.body);

  const updateData: any = {};
  if (patch.sku !== undefined) updateData.sku = patch.sku;
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.type !== undefined) updateData.type = patch.type;
  if (patch.resultingTier !== undefined) updateData.resultingTier = patch.resultingTier;
  if (patch.upgradeFromTier !== undefined) updateData.upgradeFromTier = patch.upgradeFromTier;
  
  // Storage & Duration
  if (patch.storageLimitBytes !== undefined) updateData.storageLimitBytes = toBigIntOrNull(patch.storageLimitBytes);
  if (patch.storageLimitPhotos !== undefined) updateData.storageLimitPhotos = patch.storageLimitPhotos;
  if (patch.storageDurationDays !== undefined) updateData.storageDurationDays = patch.storageDurationDays;
  
  // Feature Flags
  if (patch.allowVideoUpload !== undefined) updateData.allowVideoUpload = patch.allowVideoUpload;
  if (patch.allowStories !== undefined) updateData.allowStories = patch.allowStories;
  if (patch.allowPasswordProtect !== undefined) updateData.allowPasswordProtect = patch.allowPasswordProtect;
  if (patch.allowGuestbook !== undefined) updateData.allowGuestbook = patch.allowGuestbook;
  if (patch.allowZipDownload !== undefined) updateData.allowZipDownload = patch.allowZipDownload;
  if (patch.allowBulkOperations !== undefined) updateData.allowBulkOperations = patch.allowBulkOperations;
  if (patch.allowLiveWall !== undefined) updateData.allowLiveWall = patch.allowLiveWall;
  if (patch.allowFaceSearch !== undefined) updateData.allowFaceSearch = patch.allowFaceSearch;
  if (patch.allowGuestlist !== undefined) updateData.allowGuestlist = patch.allowGuestlist;
  if (patch.allowFullInvitation !== undefined) updateData.allowFullInvitation = patch.allowFullInvitation;
  if (patch.allowCoHosts !== undefined) updateData.allowCoHosts = patch.allowCoHosts;
  if (patch.isAdFree !== undefined) updateData.isAdFree = patch.isAdFree;
  
  // Limits
  if (patch.maxCategories !== undefined) updateData.maxCategories = patch.maxCategories;
  if (patch.maxChallenges !== undefined) updateData.maxChallenges = patch.maxChallenges;
  if (patch.maxZipDownloadPhotos !== undefined) updateData.maxZipDownloadPhotos = patch.maxZipDownloadPhotos;
  if (patch.maxCoHosts !== undefined) updateData.maxCoHosts = patch.maxCoHosts;
  
  // Display & Pricing
  if (patch.displayOrder !== undefined) updateData.displayOrder = patch.displayOrder;
  if (patch.priceEurCents !== undefined) updateData.priceEurCents = patch.priceEurCents;
  if (patch.description !== undefined) updateData.description = patch.description;
  
  if (patch.isActive !== undefined) updateData.isActive = patch.isActive;

  const updated = await prisma.packageDefinition.update({
    where: { id },
    data: updateData,
  });

  res.json({ package: serializePackage(updated) });
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updated = await prisma.packageDefinition.update({
    where: { id },
    data: { isActive: false },
  });
  res.json({ success: true, package: serializePackage(updated) });
});

export default router;
