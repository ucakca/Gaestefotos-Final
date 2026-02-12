import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { mosaicEngine } from '../services/mosaicEngine';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { isFeatureEnabled, assertFeatureEnabled } from '../services/featureGate';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

// ─── Helper: verify event ownership / co-host ────────────────────────────────

async function requireEventAccess(req: AuthRequest, res: Response, eventId: string): Promise<boolean> {
  const hasAccess = await hasEventManageAccess(req, eventId);
  if (!hasAccess) {
    res.status(403).json({ error: 'Kein Zugriff auf dieses Event' });
    return false;
  }
  return true;
}

// ─── Helper: handle feature gate errors ──────────────────────────────────────

function handleRouteError(error: unknown, res: Response, fallbackMsg: string) {
  const err = error as any;
  if (err?.code === 'FEATURE_NOT_AVAILABLE' || err?.code === 'LIMIT_REACHED') {
    return res.status(err.httpStatus || 403).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }
  logger.error(fallbackMsg, { message: getErrorMessage(error) });
  res.status(500).json({ error: fallbackMsg });
}

// ─── CREATE Mosaic Wall ──────────────────────────────────────────────────────

router.post('/:eventId/mosaic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    // Feature Gate: soft — free users get demo (4×4 max)
    const hasMosaicFeature = await isFeatureEnabled(eventId, 'mosaicWall');
    const isDemo = !hasMosaicFeature;
    const DEMO_MAX_GRID = 4;

    // Check if mosaic already exists
    const existing = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (existing) {
      return res.status(409).json({ error: 'Dieses Event hat bereits eine Mosaic Wall', wall: existing });
    }

    let {
      gridWidth = 24,
      gridHeight = 24,
      tileSizeMm = 50,
      boardWidthMm,
      boardHeightMm,
      overlayIntensity = 50,
      fillMode = 'COLOR_MATCH',
      displayAnimation = 'ZOOM_FLY',
      autoFillEnabled = true,
      autoFillThreshold = 85,
      showTicker = true,
      showQrOverlay = true,
    } = req.body;

    // Demo: cap grid size to 4×4
    if (isDemo) {
      gridWidth = Math.min(Number(gridWidth), DEMO_MAX_GRID);
      gridHeight = Math.min(Number(gridHeight), DEMO_MAX_GRID);
    }

    const wall = await prisma.mosaicWall.create({
      data: {
        eventId,
        gridWidth: Number(gridWidth),
        gridHeight: Number(gridHeight),
        tileSizeMm: Number(tileSizeMm),
        boardWidthMm: boardWidthMm ? Number(boardWidthMm) : null,
        boardHeightMm: boardHeightMm ? Number(boardHeightMm) : null,
        overlayIntensity: Number(overlayIntensity),
        fillMode,
        displayAnimation,
        autoFillEnabled: Boolean(autoFillEnabled),
        autoFillThreshold: Number(autoFillThreshold),
        showTicker: Boolean(showTicker),
        showQrOverlay: Boolean(showQrOverlay),
      },
    });

    res.status(201).json({ wall, isDemo });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Erstellen der Mosaic Wall');
  }
});

// ─── GET Mosaic Wall ─────────────────────────────────────────────────────────

router.get('/:eventId/mosaic', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      include: {
        _count: { select: { tiles: true } },
      },
    });

    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const hasMosaicFeature = await isFeatureEnabled(eventId, 'mosaicWall');
    const isDemo = !hasMosaicFeature;

    const totalCells = wall.gridWidth * wall.gridHeight;
    const realTiles = await prisma.mosaicTile.count({
      where: { mosaicWallId: wall.id, isAutoFilled: false },
    });

    res.json({
      wall: {
        ...wall,
        targetImageUrl: wall.targetImagePath ? `/api/events/${eventId}/mosaic/target-image` : null,
      },
      isDemo,
      stats: {
        totalCells,
        filledCells: wall._count.tiles,
        realTiles,
        autoFilledTiles: wall._count.tiles - realTiles,
        progress: totalCells > 0 ? Math.round((wall._count.tiles / totalCells) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error('Get mosaic wall error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden der Mosaic Wall' });
  }
});

// ─── UPDATE Mosaic Wall ──────────────────────────────────────────────────────

router.put('/:eventId/mosaic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const hasMosaicFeature = await isFeatureEnabled(eventId, 'mosaicWall');
    const isDemoWall = !hasMosaicFeature;
    const DEMO_MAX_GRID = 4;

    const allowedFields = [
      'gridWidth', 'gridHeight', 'tileSizeMm', 'boardWidthMm', 'boardHeightMm',
      'overlayIntensity', 'status', 'fillMode', 'displayAnimation',
      'autoFillEnabled', 'autoFillThreshold', 'showTicker', 'showQrOverlay',
      'printEnabled', 'printConfirmation', 'reservationTimeout', 'scatterValue',
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field];
        if (['gridWidth', 'gridHeight', 'tileSizeMm', 'boardWidthMm', 'boardHeightMm', 'overlayIntensity', 'autoFillThreshold', 'reservationTimeout', 'scatterValue'].includes(field)) {
          data[field] = val !== null ? Number(val) : null;
        } else if (['autoFillEnabled', 'showTicker', 'showQrOverlay', 'printEnabled', 'printConfirmation'].includes(field)) {
          data[field] = Boolean(val);
        } else {
          data[field] = val;
        }
      }
    }

    // Demo: cap grid size to 4×4
    if (isDemoWall) {
      if (data.gridWidth) data.gridWidth = Math.min(data.gridWidth, DEMO_MAX_GRID);
      if (data.gridHeight) data.gridHeight = Math.min(data.gridHeight, DEMO_MAX_GRID);
      // Demo walls cannot enable print
      if (data.printEnabled) data.printEnabled = false;
    }

    const updated = await prisma.mosaicWall.update({
      where: { eventId },
      data,
    });

    res.json({ wall: updated, isDemo: isDemoWall });
  } catch (error) {
    logger.error('Update mosaic wall error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Mosaic Wall' });
  }
});

// ─── DELETE Mosaic Wall ──────────────────────────────────────────────────────

router.delete('/:eventId/mosaic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    await prisma.mosaicWall.deleteMany({ where: { eventId } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete mosaic wall error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Löschen der Mosaic Wall' });
  }
});

// ─── ANALYZE Target Image ────────────────────────────────────────────────────

router.post('/:eventId/mosaic/analyze', authMiddleware, upload.single('targetImage'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    // 1. Upload target image to storage
    const targetPath = await storageService.uploadFile(
      eventId,
      'mosaic-target.jpg',
      req.file.buffer,
      req.file.mimetype
    );

    // 2. Build proxy URL
    const targetImageUrl = `/api/events/${eventId}/mosaic/target-image`;

    // 3. Analyze grid colors
    const gridColors = await mosaicEngine.analyzeTargetImage(
      req.file.buffer,
      wall.gridWidth,
      wall.gridHeight
    );

    // 4. Update wall with target image path, URL, and grid colors
    const updated = await prisma.mosaicWall.update({
      where: { eventId },
      data: {
        targetImagePath: targetPath,
        targetImageUrl,
        gridColors: gridColors as any,
      },
    });

    res.json({
      wall: { ...updated, targetImageUrl },
      targetImageUrl,
      message: `Zielbild analysiert: ${wall.gridWidth}×${wall.gridHeight} Grid erstellt`,
    });
  } catch (error) {
    logger.error('Analyze target image error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler bei der Zielbild-Analyse' });
  }
});

// ─── ANALYZE Overlay Intensity (KI-Empfehlung) ──────────────────────────────

router.post('/:eventId/mosaic/analyze-overlay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall || !wall.targetImagePath) {
      return res.status(400).json({ error: 'Kein Zielbild vorhanden' });
    }

    const targetBuffer = await storageService.getFile(wall.targetImagePath);
    const sharp = (await import('sharp')).default;

    // Analyze image statistics
    const stats = await sharp(targetBuffer).stats();
    const meta = await sharp(targetBuffer).metadata();

    // Calculate metrics
    const channels = stats.channels;
    const avgBrightness = channels.reduce((sum, ch) => sum + ch.mean, 0) / channels.length / 255;
    const avgStdDev = channels.reduce((sum, ch) => sum + ch.stdev, 0) / channels.length;
    const contrast = avgStdDev / 128; // 0-1 normalized

    // Edge detection as proxy for detail complexity
    const edgeBuffer = await sharp(targetBuffer)
      .greyscale()
      .resize(200, 200, { fit: 'fill' })
      .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
      .raw()
      .toBuffer();
    const edgePixels = new Uint8Array(edgeBuffer);
    const edgeMean = edgePixels.reduce((s, v) => s + v, 0) / edgePixels.length / 255;

    // Recommendation logic:
    // - High contrast / lots of detail → lower overlay (photos need to show through)
    // - Low contrast / simple image → higher overlay (target needs more help)
    // - Dark images → slightly less overlay
    // - Bright/washed out → slightly more overlay
    let recommended = 45; // baseline

    if (contrast > 0.35) recommended -= 8;  // high contrast target
    else if (contrast < 0.15) recommended += 8;  // low contrast

    if (edgeMean > 0.15) recommended -= 5;  // lots of detail/edges
    else if (edgeMean < 0.05) recommended += 5;  // simple/smooth image

    if (avgBrightness < 0.3) recommended -= 5;  // dark image
    else if (avgBrightness > 0.7) recommended += 5;  // bright image

    recommended = Math.max(25, Math.min(65, Math.round(recommended)));

    // Build reasoning text
    const traits: string[] = [];
    if (contrast > 0.3) traits.push('hoher Kontrast');
    else if (contrast < 0.15) traits.push('niedriger Kontrast');
    if (avgBrightness < 0.35) traits.push('dunkles Bild');
    else if (avgBrightness > 0.65) traits.push('helles Bild');
    if (edgeMean > 0.12) traits.push('viele Details');
    else if (edgeMean < 0.06) traits.push('wenig Textur');

    const traitStr = traits.length > 0 ? traits.join(', ') : 'ausgewogene Bildwerte';
    const reasoning = `Bildanalyse: ${meta.width}×${meta.height}px, ${traitStr}. ` +
      `Bei ${recommended}% bleibt das Zielbild aus der Entfernung erkennbar, während die einzelnen Fotos im Detail sichtbar bleiben.`;

    // Artificial delay for "AI" feel (1-2s)
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    res.json({
      recommendation: { intensity: recommended, reasoning },
      analysis: {
        brightness: Math.round(avgBrightness * 100),
        contrast: Math.round(contrast * 100),
        detail: Math.round(edgeMean * 100),
        dimensions: { width: meta.width, height: meta.height },
      },
    });
  } catch (error) {
    logger.error('Analyze overlay error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler bei der Overlay-Analyse' });
  }
});

// ─── RE-RENDER Tiles (nach Overlay-Änderung) ─────────────────────────────────

router.post('/:eventId/mosaic/rerender-tiles', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    // Get all non-auto-filled tiles
    const tiles = await prisma.mosaicTile.findMany({
      where: {
        mosaicWallId: wall.id,
        isAutoFilled: false,
        croppedImagePath: { not: null },
      },
      select: {
        id: true,
        gridX: true,
        gridY: true,
        croppedImagePath: true,
        photoId: true,
      },
    });

    if (tiles.length === 0) {
      return res.json({ success: true, rerendered: 0, message: 'Keine Tiles zum Re-Rendern' });
    }

    // Return immediately, process in background
    res.json({ success: true, queued: tiles.length, message: `${tiles.length} Tiles werden neu gerendert...` });

    // Background processing
    (async () => {
      try {
        if (!wall.targetImagePath || wall.overlayIntensity <= 0) {
          logger.info(`Rerender skipped: no target image or intensity=0 for wall ${wall.id}`);
          return;
        }

        const targetBuffer = await storageService.getFile(wall.targetImagePath);
        let processed = 0;
        let failed = 0;

        for (const tile of tiles) {
          try {
            // Load original photo to avoid double overlay
            let sourceBuffer: Buffer;
            if (tile.photoId) {
              const photo = await prisma.photo.findUnique({
                where: { id: tile.photoId },
                select: { storagePath: true },
              });
              if (photo?.storagePath) {
                sourceBuffer = await storageService.getFile(photo.storagePath);
                sourceBuffer = await mosaicEngine.cropTile(sourceBuffer);
              } else {
                sourceBuffer = await storageService.getFile(tile.croppedImagePath!);
              }
            } else {
              sourceBuffer = await storageService.getFile(tile.croppedImagePath!);
            }

            const blended = await mosaicEngine.blendTargetOverlay(
              sourceBuffer,
              targetBuffer,
              tile.gridX,
              tile.gridY,
              wall.gridWidth,
              wall.gridHeight,
              wall.overlayIntensity,
            );

            const newPath = await storageService.uploadFile(
              wall.eventId,
              `mosaic-tile-${tile.gridX}-${tile.gridY}.jpg`,
              blended,
              'image/jpeg',
            );

            await prisma.mosaicTile.update({
              where: { id: tile.id },
              data: { croppedImagePath: newPath },
            });

            processed++;
          } catch (err) {
            failed++;
            logger.error(`Rerender tile ${tile.id} failed`, { message: (err as Error).message });
          }
        }

        logger.info(`Rerender complete for wall ${wall.id}: ${processed} OK, ${failed} failed`);
      } catch (err) {
        logger.error(`Rerender background error for wall ${wall.id}`, { message: (err as Error).message });
      }
    })();
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Re-Render der Tiles');
  }
});

// ─── GET All Tiles ───────────────────────────────────────────────────────────

router.get('/:eventId/mosaic/tiles', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { since } = req.query;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const where: any = { mosaicWallId: wall.id };

    // When printConfirmation is enabled, hide PRINT_TERMINAL tiles until print is confirmed
    if (wall.printConfirmation) {
      where.OR = [
        { source: { not: 'PRINT_TERMINAL' } },
        { source: 'PRINT_TERMINAL', printStatus: 'PRINTED' },
      ];
    }

    // Incremental loading: only tiles created after a timestamp
    if (since) {
      where.createdAt = { gt: new Date(since as string) };
    }

    const tiles = await prisma.mosaicTile.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        gridX: true,
        gridY: true,
        positionLabel: true,
        croppedImagePath: true,
        dominantColor: true,
        colorDistance: true,
        isAutoFilled: true,
        isHero: true,
        printNumber: true,
        printStatus: true,
        source: true,
        createdAt: true,
        photo: {
          select: { uploadedBy: true },
        },
      },
    });

    // Build proxy URLs for cropped images
    const tilesWithUrls = tiles.map((tile) => ({
      ...tile,
      croppedImageUrl: tile.croppedImagePath
        ? `/api/events/${eventId}/mosaic/tile-image/${tile.id}`
        : null,
    }));

    res.json({ tiles: tilesWithUrls });
  } catch (error) {
    logger.error('Get mosaic tiles error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden der Tiles' });
  }
});

// ─── PLACE Photo (manual trigger) ───────────────────────────────────────────

router.post('/:eventId/mosaic/place', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'photoId ist erforderlich' });
    }

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    // Check if photo is already placed
    const existingTile = await prisma.mosaicTile.findFirst({
      where: { mosaicWallId: wall.id, photoId },
    });
    if (existingTile) {
      return res.status(409).json({ error: 'Foto ist bereits im Mosaik platziert', tile: existingTile });
    }

    // Get photo from storage
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const photoBuffer = await storageService.getFile(photo.storagePath);

    const result = await mosaicEngine.placePhoto(wall.id, photoId, photoBuffer, 'SMARTPHONE');
    if (!result) {
      return res.status(422).json({ error: 'Foto konnte nicht platziert werden (Mosaik voll oder nicht aktiv)' });
    }

    res.json({
      success: true,
      tileId: result.tileId,
      position: result.position,
      printNumber: result.printNumber,
    });
  } catch (error) {
    logger.error('Place photo in mosaic error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Platzieren des Fotos' });
  }
});

// ─── HERO Toggle ─────────────────────────────────────────────────────────────

router.put('/:eventId/mosaic/tiles/:tileId/hero', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, tileId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const tile = await prisma.mosaicTile.update({
      where: { id: tileId },
      data: { isHero: req.body.isHero ?? true },
    });

    res.json({ tile });
  } catch (error) {
    logger.error('Toggle hero tile error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Markieren des Hero-Tiles' });
  }
});

// ─── PRINT STATUS Update ────────────────────────────────────────────────────

router.put('/:eventId/mosaic/tiles/:tileId/print-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, tileId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    // Feature Gate: mosaicPrint
    await assertFeatureEnabled(eventId, 'mosaicPrint');

    const { printStatus } = req.body;
    if (!['PENDING', 'PRINTING', 'PRINTED', 'PLACED'].includes(printStatus)) {
      return res.status(400).json({ error: 'Ungültiger Print-Status' });
    }

    const tile = await prisma.mosaicTile.update({
      where: { id: tileId },
      data: { printStatus },
    });

    res.json({ tile });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Aktualisieren des Print-Status');
  }
});

// ─── PRINT QUEUE ─────────────────────────────────────────────────────────────

router.get('/:eventId/mosaic/print-queue', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    // Feature Gate: mosaicPrint
    await assertFeatureEnabled(eventId, 'mosaicPrint');

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const tiles = await prisma.mosaicTile.findMany({
      where: {
        mosaicWallId: wall.id,
        isAutoFilled: false,
        printStatus: { in: ['PENDING', 'PRINTING'] },
      },
      orderBy: { printNumber: 'asc' },
      select: {
        id: true,
        gridX: true,
        gridY: true,
        positionLabel: true,
        croppedImagePath: true,
        printNumber: true,
        printStatus: true,
        createdAt: true,
        photo: { select: { uploadedBy: true } },
      },
    });

    const tilesWithUrls = await Promise.all(
      tiles.map(async (tile) => {
        let croppedImageUrl: string | null = null;
        if (tile.croppedImagePath) {
          try {
            croppedImageUrl = await storageService.getFileUrl(tile.croppedImagePath, 3600);
          } catch { /* ignore */ }
        }
        return { ...tile, croppedImageUrl };
      })
    );

    res.json({ tiles: tilesWithUrls });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Laden der Druckqueue');
  }
});

// ─── BATCH PRINT STATUS Update ───────────────────────────────────────────────

router.put('/:eventId/mosaic/print-batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    // Feature Gate: mosaicPrint
    await assertFeatureEnabled(eventId, 'mosaicPrint');

    const { tileIds, printStatus } = req.body;
    if (!Array.isArray(tileIds) || tileIds.length === 0) {
      return res.status(400).json({ error: 'tileIds Array erforderlich' });
    }
    if (!['PENDING', 'PRINTING', 'PRINTED', 'PLACED'].includes(printStatus)) {
      return res.status(400).json({ error: 'Ungültiger Print-Status' });
    }

    const result = await prisma.mosaicTile.updateMany({
      where: { id: { in: tileIds } },
      data: { printStatus },
    });

    res.json({ success: true, updated: result.count });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Batch-Update');
  }
});

// ─── PRINT HISTORY (recently printed) ───────────────────────────────────────

router.get('/:eventId/mosaic/print-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    // Feature Gate: mosaicPrint
    await assertFeatureEnabled(eventId, 'mosaicPrint');

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const tiles = await prisma.mosaicTile.findMany({
      where: {
        mosaicWallId: wall.id,
        isAutoFilled: false,
        printStatus: { in: ['PRINTED', 'PLACED'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        gridX: true,
        gridY: true,
        positionLabel: true,
        printNumber: true,
        printStatus: true,
        updatedAt: true,
        photo: { select: { uploadedBy: true } },
      },
    });

    res.json({ tiles });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Laden der Druckhistorie');
  }
});

// ─── AUTO-FILL ───────────────────────────────────────────────────────────────

router.post('/:eventId/mosaic/auto-fill', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!await requireEventAccess(req, res, eventId)) return;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const filled = await mosaicEngine.autoFill(wall.id);
    res.json({ success: true, filled });
  } catch (error) {
    logger.error('Auto-fill mosaic error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Auto-Fill' });
  }
});

// ─── STATS (for ticker) ─────────────────────────────────────────────────────

router.get('/:eventId/mosaic/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const stats = await mosaicEngine.getStats(wall.id);
    res.json({ stats });
  } catch (error) {
    logger.error('Get mosaic stats error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// ─── DISPLAY Payload (optimized for live display) ────────────────────────────

router.get('/:eventId/mosaic/display', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: {
        id: true,
        gridWidth: true,
        gridHeight: true,
        targetImagePath: true,
        overlayIntensity: true,
        status: true,
        displayAnimation: true,
        showTicker: true,
        showQrOverlay: true,
        fillMode: true,
        printEnabled: true,
        printConfirmation: true,
        sourceModes: true,
      },
    });

    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    // Build proxy URL for target image
    const targetImageUrl = wall.targetImagePath
      ? `/api/events/${eventId}/mosaic/target-image`
      : null;

    // Get all tiles with proxy URLs
    // When printConfirmation is enabled, hide PRINT_TERMINAL tiles until print is confirmed
    const tileWhere: any = { mosaicWallId: wall.id };
    if (wall.printConfirmation) {
      tileWhere.OR = [
        { source: { not: 'PRINT_TERMINAL' } },
        { source: 'PRINT_TERMINAL', printStatus: 'PRINTED' },
      ];
    }

    const tiles = await prisma.mosaicTile.findMany({
      where: tileWhere,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        gridX: true,
        gridY: true,
        croppedImagePath: true,
        isAutoFilled: true,
        isHero: true,
        createdAt: true,
      },
    });

    const tilesWithUrls = tiles.map((tile) => ({
      id: tile.id,
      x: tile.gridX,
      y: tile.gridY,
      url: tile.croppedImagePath ? `/api/events/${eventId}/mosaic/tile-image/${tile.id}` : null,
      hero: tile.isHero,
      auto: tile.isAutoFilled,
      t: tile.createdAt.getTime(),
    }));

    const totalCells = wall.gridWidth * wall.gridHeight;
    const progress = totalCells > 0 ? Math.round((tiles.length / totalCells) * 100) : 0;

    // Get event for slug/title + check demo status
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, slug: true },
    });

    const hasMosaicFeature = await isFeatureEnabled(eventId, 'mosaicWall');
    const isDemo = !hasMosaicFeature;

    res.json({
      wall: {
        ...wall,
        targetImageUrl,
        isDemo,
      },
      tiles: tilesWithUrls,
      progress,
      totalCells,
      event: event || {},
    });
  } catch (error) {
    logger.error('Get mosaic display error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden des Displays' });
  }
});

// ─── HD EXPORT (Poster-Bild generieren) ─────────────────────────────────────

router.get('/:eventId/mosaic/export', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Feature Gate: mosaicExport
    await assertFeatureEnabled(eventId, 'mosaicExport');
    const format = (req.query.format as string) || 'jpg';
    const quality = req.query.quality === 'print' ? 'print' : 'web';
    // Print quality: 400px/tile (~300 DPI at 34mm tiles); Web: 200px/tile
    const defaultTileSize = quality === 'print' ? 400 : 200;
    const tilePixels = parseInt(req.query.tileSize as string) || defaultTileSize;

    const wall = await prisma.mosaicWall.findUnique({ where: { eventId } });
    if (!wall) {
      return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    }

    const tiles = await prisma.mosaicTile.findMany({
      where: { mosaicWallId: wall.id },
      select: {
        gridX: true,
        gridY: true,
        croppedImagePath: true,
      },
    });

    let sharp: any;
    try {
      sharp = require('sharp');
    } catch {
      return res.status(500).json({ error: 'sharp nicht verfügbar' });
    }

    const canvasWidth = wall.gridWidth * tilePixels;
    const canvasHeight = wall.gridHeight * tilePixels;

    // Start with target image as background (if available), otherwise black
    let canvas: any;
    if (wall.targetImagePath) {
      try {
        const targetBuffer = await storageService.getFile(wall.targetImagePath);
        canvas = sharp(targetBuffer)
          .resize(canvasWidth, canvasHeight, { fit: 'fill' })
          .ensureAlpha();
      } catch {
        canvas = sharp({
          create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
        });
      }
    } else {
      canvas = sharp({
        create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
      });
    }

    // Composite all tiles on top
    const compositeOps: any[] = [];
    for (const tile of tiles) {
      if (!tile.croppedImagePath) continue;
      try {
        const tileBuffer = await storageService.getFile(tile.croppedImagePath);
        const resizedTile = await sharp(tileBuffer)
          .resize(tilePixels, tilePixels, { fit: 'cover' })
          .toBuffer();

        compositeOps.push({
          input: resizedTile,
          left: tile.gridX * tilePixels,
          top: tile.gridY * tilePixels,
        });
      } catch {
        // Skip tiles that can't be loaded
      }
    }

    // Batch composite (sharp supports arrays)
    const baseBuffer = await canvas.png().toBuffer();
    let result = sharp(baseBuffer).composite(compositeOps);

    // Output format
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    const filename = `mosaic-${(event?.title || 'poster').replace(/[^a-zA-Z0-9]/g, '_')}`;

    const qualitySuffix = quality === 'print' ? '-print' : '';
    const exportFilename = `${filename}${qualitySuffix}`;

    if (format === 'png') {
      const buffer = await result.png({ quality: 90 }).toBuffer();
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${exportFilename}.png"`,
        'Content-Length': buffer.length.toString(),
        'X-Resolution': `${canvasWidth}x${canvasHeight}`,
        'X-Tile-Pixels': tilePixels.toString(),
        'X-Quality': quality,
      });
      res.send(buffer);
    } else {
      const jpgQuality = quality === 'print' ? 95 : 92;
      const buffer = await result.jpeg({ quality: jpgQuality }).toBuffer();
      res.set({
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${exportFilename}.jpg"`,
        'Content-Length': buffer.length.toString(),
        'X-Resolution': `${canvasWidth}x${canvasHeight}`,
        'X-Tile-Pixels': tilePixels.toString(),
        'X-Quality': quality,
      });
      res.send(buffer);
    }
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Generieren des Poster-Bilds');
  }
});

// ─── PRINT TERMINAL: Sticker Image (300 DPI with Position Overlay) ──────────

router.get('/:eventId/mosaic/print-job/:pinCode/sticker', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, pinCode } = req.params;
    const dpi = parseInt(req.query.dpi as string) || 300;
    const sizeMm = parseInt(req.query.sizeMm as string) || 50;

    // Calculate pixel size: mm * dpi / 25.4
    const stickerPx = Math.round((sizeMm * dpi) / 25.4);

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true, tileSizeMm: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    const job = await prisma.mosaicPrintJob.findUnique({
      where: { wallId_pinCode: { wallId: wall.id, pinCode: pinCode.toUpperCase() } },
      include: { photo: true },
    });
    if (!job) return res.status(404).json({ error: 'Print-Job nicht gefunden' });

    // Get the photo buffer
    const photoBuffer = await storageService.getFile(job.photo.storagePath);

    let sharp: any;
    try {
      sharp = require('sharp');
    } catch {
      return res.status(500).json({ error: 'sharp nicht verfügbar' });
    }

    // Use wall's tileSizeMm if available, otherwise param
    const actualSizeMm = wall.tileSizeMm || sizeMm;
    const actualPx = Math.round((actualSizeMm * dpi) / 25.4);

    // Crop to square and resize to print resolution
    let sticker = sharp(photoBuffer)
      .resize(actualPx, actualPx, { fit: 'cover', position: 'centre' });

    // Build position label overlay if position is assigned
    if (job.gridX !== null && job.gridY !== null) {
      const label = `${String.fromCharCode(65 + job.gridY)}${job.gridX + 1}`;
      const labelHeight = Math.round(actualPx * 0.08);
      const fontSize = Math.round(labelHeight * 0.7);
      const padding = Math.round(labelHeight * 0.3);

      // SVG overlay with position label in bottom-right corner
      const svgOverlay = Buffer.from(`
        <svg width="${actualPx}" height="${actualPx}" xmlns="http://www.w3.org/2000/svg">
          <rect x="${actualPx - fontSize * label.length - padding * 3}" y="${actualPx - labelHeight - padding}" 
                width="${fontSize * label.length + padding * 2}" height="${labelHeight + padding}" 
                rx="4" fill="rgba(0,0,0,0.7)"/>
          <text x="${actualPx - padding - padding/2}" y="${actualPx - padding/2 - 2}" 
                font-family="monospace" font-size="${fontSize}" font-weight="bold" 
                fill="white" text-anchor="end">${label}</text>
        </svg>
      `);

      const baseBuffer = await sticker.png().toBuffer();
      sticker = sharp(baseBuffer).composite([{ input: svgOverlay, gravity: 'southeast' }]);
    }

    // Add thin border
    const borderWidth = Math.max(1, Math.round(actualPx * 0.003));
    const borderSvg = Buffer.from(`
      <svg width="${actualPx}" height="${actualPx}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${borderWidth/2}" y="${borderWidth/2}" 
              width="${actualPx - borderWidth}" height="${actualPx - borderWidth}" 
              fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="${borderWidth}"/>
      </svg>
    `);

    const withLabel = await sticker.png().toBuffer();
    const finalBuffer = await sharp(withLabel)
      .composite([{ input: borderSvg }])
      .jpeg({ quality: 95 })
      .toBuffer();

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="sticker-${pinCode}.jpg"`,
      'Content-Length': finalBuffer.length.toString(),
      'X-Sticker-DPI': dpi.toString(),
      'X-Sticker-Size-MM': actualSizeMm.toString(),
      'X-Sticker-Pixels': actualPx.toString(),
    });
    res.send(finalBuffer);
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Generieren des Sticker-Bilds');
  }
});

// ─── PRINT TERMINAL: Helpers ─────────────────────────────────────────────────

const PIN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion

async function generateUniquePin(wallId: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    let pin = '';
    for (let i = 0; i < 4; i++) {
      pin += PIN_CHARS[Math.floor(Math.random() * PIN_CHARS.length)];
    }
    const existing = await prisma.mosaicPrintJob.findUnique({
      where: { wallId_pinCode: { wallId, pinCode: pin } },
    });
    if (!existing) return pin;
  }
  throw new Error('Konnte keinen eindeutigen PIN generieren');
}

// ─── PRINT TERMINAL: Create Print Job (Guest uploads for print) ─────────────

router.post('/:eventId/mosaic/print-upload', authMiddleware, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Kein Foto hochgeladen' });

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true, status: true, printEnabled: true, printConfirmation: true, reservationTimeout: true, sourceModes: true },
    });
    if (!wall) return res.status(404).json({ error: 'Keine Mosaic Wall für dieses Event' });
    if (wall.status !== 'ACTIVE') return res.status(400).json({ error: 'Mosaic Wall ist nicht aktiv' });
    if (!wall.printEnabled) return res.status(400).json({ error: 'Print ist für diese Wall nicht aktiviert' });

    // Store photo
    const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
    const photo = await prisma.photo.create({
      data: {
        eventId,
        storagePath,
        status: 'APPROVED',
        uploadedBy: req.userId || null,
      },
    });

    // Generate PIN + QR payload
    const pinCode = await generateUniquePin(wall.id);
    const qrPayload = `print://${eventId}/${pinCode}`;
    const expiresAt = new Date(Date.now() + wall.reservationTimeout * 60 * 1000);

    const printJob = await prisma.mosaicPrintJob.create({
      data: {
        wallId: wall.id,
        photoId: photo.id,
        pinCode,
        qrPayload,
        status: 'PENDING',
        reservedAt: new Date(),
        expiresAt,
      },
    });

    return res.json({
      ok: true,
      pinCode,
      qrPayload,
      printJobId: printJob.id,
      expiresAt: expiresAt.toISOString(),
      message: `Dein Mosaic-Code: ${pinCode}. Gehe zum Print-Terminal und gib diesen Code ein.`,
    });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Erstellen des Print-Jobs');
  }
});

// ─── PRINT TERMINAL: Lookup Print Job by PIN ────────────────────────────────

router.get('/:eventId/mosaic/print-job/:pinCode', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, pinCode } = req.params;
    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    const job = await prisma.mosaicPrintJob.findUnique({
      where: { wallId_pinCode: { wallId: wall.id, pinCode: pinCode.toUpperCase() } },
      include: { photo: { select: { id: true, storagePath: true } } },
    });
    if (!job) return res.status(404).json({ error: 'Ungültiger Code' });

    // Check expiry
    if (job.status === 'PENDING' && job.expiresAt && new Date() > job.expiresAt) {
      await prisma.mosaicPrintJob.update({
        where: { id: job.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(410).json({ error: 'Code ist abgelaufen. Bitte lade dein Foto erneut hoch.' });
    }

    if (job.status === 'EXPIRED') {
      return res.status(410).json({ error: 'Code ist abgelaufen.' });
    }

    return res.json({
      ok: true,
      printJob: {
        id: job.id,
        pinCode: job.pinCode,
        status: job.status,
        photoUrl: `/api/photos/${job.photoId}/file`,
        gridX: job.gridX,
        gridY: job.gridY,
        printedAt: job.printedAt,
        expiresAt: job.expiresAt,
      },
    });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Abrufen des Print-Jobs');
  }
});

// ─── PRINT TERMINAL: Trigger Print (assign position + generate sticker) ─────

router.post('/:eventId/mosaic/print-job/:pinCode/print', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, pinCode } = req.params;
    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true, gridWidth: true, gridHeight: true, printConfirmation: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    const job = await prisma.mosaicPrintJob.findUnique({
      where: { wallId_pinCode: { wallId: wall.id, pinCode: pinCode.toUpperCase() } },
      include: { photo: true },
    });
    if (!job) return res.status(404).json({ error: 'Ungültiger Code' });
    if (job.status === 'EXPIRED') return res.status(410).json({ error: 'Code abgelaufen' });
    if (job.status === 'PRINTED') return res.status(400).json({ error: 'Bereits gedruckt' });
    if (job.status === 'PRINTING') return res.status(400).json({ error: 'Druckvorgang läuft bereits' });

    // Find next free position
    const occupiedPositions = await prisma.mosaicTile.findMany({
      where: { mosaicWallId: wall.id },
      select: { gridX: true, gridY: true },
    });
    const occupiedSet = new Set(occupiedPositions.map(p => `${p.gridX},${p.gridY}`));

    // Also exclude positions reserved by other pending print jobs
    const reservedPositions = await prisma.mosaicPrintJob.findMany({
      where: { wallId: wall.id, status: { in: ['PRINTING'] }, gridX: { not: null } },
      select: { gridX: true, gridY: true },
    });
    reservedPositions.forEach(p => { if (p.gridX !== null && p.gridY !== null) occupiedSet.add(`${p.gridX},${p.gridY}`); });

    let assignedX: number | null = null;
    let assignedY: number | null = null;

    for (let y = 0; y < wall.gridHeight; y++) {
      for (let x = 0; x < wall.gridWidth; x++) {
        if (!occupiedSet.has(`${x},${y}`)) {
          assignedX = x;
          assignedY = y;
          break;
        }
      }
      if (assignedX !== null) break;
    }

    if (assignedX === null || assignedY === null) {
      return res.status(409).json({ error: 'Mosaic Wall ist voll. Keine freie Position mehr.' });
    }

    const positionLabel = `${String.fromCharCode(65 + assignedY)}${assignedX + 1}`;

    // Update print job with position
    await prisma.mosaicPrintJob.update({
      where: { id: job.id },
      data: {
        status: 'PRINTING',
        gridX: assignedX,
        gridY: assignedY,
      },
    });

    // Process the photo for the tile
    const photoBuffer = await storageService.getFile(job.photo.storagePath);
    const result = await mosaicEngine.placePhoto(wall.id, job.photo.id, photoBuffer, 'PRINT_TERMINAL');

    // Link tile to print job if created
    if (result?.tileId) {
      await prisma.mosaicPrintJob.update({
        where: { id: job.id },
        data: { tileId: result.tileId },
      });
    }

    return res.json({
      ok: true,
      position: { x: assignedX, y: assignedY, label: positionLabel },
      printJobId: job.id,
      tileId: result?.tileId || null,
      message: `Sticker für Position ${positionLabel} wird gedruckt!`,
    });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Drucken');
  }
});

// ─── PRINT TERMINAL: Confirm Print Complete ─────────────────────────────────

router.post('/:eventId/mosaic/print-job/:pinCode/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, pinCode } = req.params;
    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true, printConfirmation: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    const job = await prisma.mosaicPrintJob.findUnique({
      where: { wallId_pinCode: { wallId: wall.id, pinCode: pinCode.toUpperCase() } },
    });
    if (!job) return res.status(404).json({ error: 'Ungültiger Code' });
    if (job.status === 'PRINTED') return res.status(400).json({ error: 'Bereits bestätigt' });
    if (job.status !== 'PRINTING') return res.status(400).json({ error: 'Druckauftrag nicht im richtigen Status' });

    await prisma.mosaicPrintJob.update({
      where: { id: job.id },
      data: { status: 'PRINTED', printedAt: new Date() },
    });

    // If printConfirmation is enabled, now make the tile visible on digital wall
    if (job.tileId) {
      await prisma.mosaicTile.update({
        where: { id: job.tileId },
        data: { printStatus: 'PRINTED' },
      });

      // Emit WebSocket event so live wall updates
      try {
        const { io } = require('../index');
        io.to(`event:${eventId}`).emit('mosaic_tile_placed', {
          tileId: job.tileId,
          position: { x: job.gridX, y: job.gridY },
          source: 'PRINT_TERMINAL',
        });
      } catch { /* io not available */ }
    }

    return res.json({
      ok: true,
      message: 'Sticker gedruckt! Klebe ihn jetzt auf die Wall.',
    });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Bestätigen');
  }
});

// ─── PRINT TERMINAL: Expire old pending jobs (called by cron or admin) ──────

router.post('/:eventId/mosaic/print-jobs/expire', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await requireEventAccess(req, res, eventId))) return;

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    const result = await prisma.mosaicPrintJob.updateMany({
      where: {
        wallId: wall.id,
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return res.json({ ok: true, expired: result.count });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Ablaufen der Print-Jobs');
  }
});

// ─── PRINT TERMINAL: Guest retrieves their code ─────────────────────────────

router.get('/:eventId/mosaic/my-print-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (!wall) return res.status(404).json({ error: 'Wall nicht gefunden' });

    // Find latest print job for this user's photos
    const jobs = await prisma.mosaicPrintJob.findMany({
      where: {
        wallId: wall.id,
        photo: { uploadedBy: userId },
        status: { in: ['PENDING', 'PRINTING'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { pinCode: true, qrPayload: true, status: true, expiresAt: true, createdAt: true },
    });

    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Kein aktiver Print-Code gefunden' });
    }

    return res.json({
      ok: true,
      codes: jobs.map(j => ({
        pinCode: j.pinCode,
        qrPayload: j.qrPayload,
        status: j.status,
        expiresAt: j.expiresAt,
      })),
    });
  } catch (error) {
    handleRouteError(error, res, 'Fehler beim Abrufen des Codes');
  }
});

// ─── PROXY: Target Image ─────────────────────────────────────────────────────

router.get('/:eventId/mosaic/target-image', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const wall = await prisma.mosaicWall.findUnique({
      where: { eventId },
      select: { targetImagePath: true },
    });
    if (!wall?.targetImagePath) {
      return res.status(404).json({ error: 'Kein Zielbild vorhanden' });
    }
    const buffer = await storageService.getFile(wall.targetImagePath);
    const ext = wall.targetImagePath.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    res.set({
      'Content-Type': mime,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(buffer);
  } catch (error) {
    logger.error('Proxy target image error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden des Zielbilds' });
  }
});

// ─── PROXY: Tile Image ───────────────────────────────────────────────────────

router.get('/:eventId/mosaic/tile-image/:tileId', async (req: AuthRequest, res: Response) => {
  try {
    const { tileId } = req.params;
    const tile = await prisma.mosaicTile.findUnique({
      where: { id: tileId },
      select: { croppedImagePath: true },
    });
    if (!tile?.croppedImagePath) {
      return res.status(404).json({ error: 'Tile-Bild nicht gefunden' });
    }
    const buffer = await storageService.getFile(tile.croppedImagePath);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=300',
    });
    res.send(buffer);
  } catch (error) {
    logger.error('Proxy tile image error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Laden des Tile-Bilds' });
  }
});

export default router;
