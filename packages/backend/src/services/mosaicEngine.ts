import sharp from 'sharp';
import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

// ─── Color Math (CIE Lab + Delta-E) ────────────────────────────────────────

interface RGB { r: number; g: number; b: number }
interface Lab { L: number; a: number; b: number }

/** sRGB → CIE XYZ → CIE Lab */
function rgbToLab(rgb: RGB): Lab {
  // Normalize to 0-1
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // sRGB → linear
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Linear RGB → XYZ (D65 illuminant)
  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // XYZ → Lab
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
  x = f(x);
  y = f(y);
  z = f(z);

  return {
    L: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/** CIE2000 Delta-E — perceptually uniform color distance */
function deltaE(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;

  let h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
  if (h2p < 0) h2p += 360;

  let dHp: number;
  if (Math.abs(h1p - h2p) <= 180) {
    dHp = h2p - h1p;
  } else if (h2p <= h1p) {
    dHp = h2p - h1p + 360;
  } else {
    dHp = h2p - h1p - 360;
  }

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHpVal = 2 * Math.sqrt(C1p * C2p) * Math.sin(dHp * Math.PI / 360);

  let avgHp: number;
  if (Math.abs(h1p - h2p) <= 180) {
    avgHp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    avgHp = (h1p + h2p + 360) / 2;
  } else {
    avgHp = (h1p + h2p - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((avgHp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * avgHp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avgHp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * avgHp - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * Math.pow(avgL - 50, 2) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const RT_exp = -2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const RT = RT_exp * Math.sin(2 * dTheta * Math.PI / 180);

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHpVal / SH, 2) +
    RT * (dCp / SC) * (dHpVal / SH)
  );
}

// ─── Grid Label Helpers ─────────────────────────────────────────────────────

/** Convert grid position to human label, e.g. (2, 6) → "C7" */
function gridToLabel(x: number, y: number): string {
  // Rows: A, B, C, ... AA, AB, ...
  let rowLabel = '';
  let row = y;
  do {
    rowLabel = String.fromCharCode(65 + (row % 26)) + rowLabel;
    row = Math.floor(row / 26) - 1;
  } while (row >= 0);
  return `${rowLabel}${x + 1}`;
}

// ─── Mosaic Engine ──────────────────────────────────────────────────────────

export class MosaicEngine {

  /**
   * Analyze target image: resize to grid dimensions, extract average color per cell.
   * Returns gridColors as a flat array of {x, y, r, g, b}.
   */
  async analyzeTargetImage(imageBuffer: Buffer, gridWidth: number, gridHeight: number): Promise<RGB[][]> {
    // Resize image to exact grid dimensions (each pixel = one cell's avg color)
    const { data, info } = await sharp(imageBuffer)
      .resize(gridWidth, gridHeight, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const grid: RGB[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      const row: RGB[] = [];
      for (let x = 0; x < gridWidth; x++) {
        const idx = (y * info.width + x) * 3;
        row.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
      grid.push(row);
    }

    return grid;
  }

  /**
   * Extract dominant color from a photo using k-means-like approach.
   * Resizes to small thumbnail, then computes weighted average color.
   */
  async extractDominantColor(imageBuffer: Buffer): Promise<RGB> {
    // Resize to 32x32 for fast color analysis
    const { data } = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple weighted average with center bias
    let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
    const cx = 16, cy = 16;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 3;
        // Center-weighted: pixels closer to center count more
        const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        const weight = Math.max(0.1, 1 - dist / 22);

        totalR += data[idx] * weight;
        totalG += data[idx + 1] * weight;
        totalB += data[idx + 2] * weight;
        totalWeight += weight;
      }
    }

    return {
      r: Math.round(totalR / totalWeight),
      g: Math.round(totalG / totalWeight),
      b: Math.round(totalB / totalWeight),
    };
  }

  /**
   * Smart-crop a photo to a square tile.
   * Uses Sharp's attention-based crop which detects faces/subjects.
   */
  async cropTile(imageBuffer: Buffer, tileResolution: number = 300): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(tileResolution, tileResolution, {
        fit: 'cover',
        position: sharp.strategy.attention, // Face/subject-aware cropping
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  /**
   * Blend the target-image section for a grid cell onto a cropped tile.
   * Two-pass approach for a mosaically.com-style photo mosaic:
   *   1) soft-light blend — tints the photo colours toward the target while
   *      preserving luminance / detail (faces, textures stay visible).
   *   2) linear over blend — adds a semi-transparent target layer on top for
   *      additional colour accuracy when viewed from a distance.
   *
   * overlayIntensity (0-100) controls the overall strength:
   *   - soft-light pass uses full intensity
   *   - over pass uses half the intensity so photos remain recognisable
   */
  async blendTargetOverlay(
    croppedTile: Buffer,
    targetImageBuffer: Buffer,
    gridX: number,
    gridY: number,
    gridWidth: number,
    gridHeight: number,
    overlayIntensity: number, // 0-100
    tileResolution: number = 300,
  ): Promise<Buffer> {
    if (overlayIntensity <= 0) return croppedTile;

    try {
      // Get target image dimensions
      const targetMeta = await sharp(targetImageBuffer).metadata();
      const tW = targetMeta.width || gridWidth;
      const tH = targetMeta.height || gridHeight;

      // Calculate the pixel region of the target image for this cell
      const cellW = Math.floor(tW / gridWidth);
      const cellH = Math.floor(tH / gridHeight);
      const left = gridX * cellW;
      const top = gridY * cellH;

      // Extract and resize the target section to tile resolution
      // IMPORTANT: Use .png() for all intermediate buffers to preserve
      // the alpha channel. JPEG strips alpha, breaking dest-in blending.
      const targetSection = await sharp(targetImageBuffer)
        .extract({
          left: Math.min(left, tW - cellW),
          top: Math.min(top, tH - cellH),
          width: cellW,
          height: cellH,
        })
        .resize(tileResolution, tileResolution, { fit: 'fill' })
        .ensureAlpha()
        .png()
        .toBuffer();

      // Ensure cropped tile is also RGBA PNG for compositing
      const croppedPng = await sharp(croppedTile)
        .ensureAlpha()
        .png()
        .toBuffer();

      const intensity = overlayIntensity / 100; // 0-1

      // ── Direct alpha composite ──────────────────────────────────────
      // Simple and effective: composite the target section directly over
      // the photo at `intensity` opacity.
      //
      // result = target * intensity + photo * (1 - intensity)
      //
      // At 65%: target dominates from a distance, photo texture/detail
      // remains visible up close. This is the approach used by
      // mosaically.com and similar photo mosaic tools.
      const alpha = Math.round(intensity * 255);
      if (alpha <= 0) {
        return sharp(croppedPng).jpeg({ quality: 90 }).toBuffer();
      }

      const targetWithAlpha = await sharp(targetSection)
        .composite([{
          input: Buffer.from([0, 0, 0, alpha]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        }])
        .png()
        .toBuffer();

      return sharp(croppedPng)
        .composite([{ input: targetWithAlpha, blend: 'over' }])
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (err) {
      logger.warn('MosaicEngine: blendTargetOverlay failed, using unblended tile', {
        error: (err as Error).message,
      });
      return croppedTile;
    }
  }

  /**
   * Find the best empty grid cell for a photo based on color distance.
   */
  findBestPosition(
    dominantColor: RGB,
    gridColors: RGB[][],
    occupiedCells: Set<string>
  ): { x: number; y: number; distance: number } | null {
    const photoLab = rgbToLab(dominantColor);
    let bestX = -1;
    let bestY = -1;
    let bestDistance = Infinity;

    const gridHeight = gridColors.length;
    const gridWidth = gridColors[0]?.length || 0;
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const key = `${x},${y}`;
        if (occupiedCells.has(key)) continue;

        const cellLab = rgbToLab(gridColors[y][x]);
        let distance = deltaE(photoLab, cellLab);

        // Slight center bias for aesthetics (max 2% adjustment)
        const distFromCenter = Math.sqrt(
          Math.pow((x - centerX) / gridWidth, 2) +
          Math.pow((y - centerY) / gridHeight, 2)
        );
        distance += distFromCenter * 0.5;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestX = x;
          bestY = y;
        }
      }
    }

    if (bestX < 0) return null;
    return { x: bestX, y: bestY, distance: bestDistance };
  }

  /**
   * Place a photo in the mosaic. Full pipeline:
   * 1. Crop photo to square tile
   * 2. Extract dominant color
   * 3. Find best position
   * 4. Upload cropped tile
   * 5. Create MosaicTile record
   */
  async placePhoto(
    mosaicWallId: string,
    photoId: string,
    photoBuffer: Buffer,
    source: 'SMARTPHONE' | 'BOOTH' | 'ADMIN' | 'PRINT_TERMINAL' = 'SMARTPHONE'
  ): Promise<{ tileId: string; position: string; printNumber: number } | null> {
    const wall = await prisma.mosaicWall.findUnique({
      where: { id: mosaicWallId },
      include: {
        tiles: { select: { gridX: true, gridY: true } },
      },
    });

    if (!wall || wall.status !== 'ACTIVE') {
      logger.warn('MosaicEngine: Wall not found or not active', { mosaicWallId });
      return null;
    }

    const gridColors = wall.gridColors as unknown as RGB[][] | null;
    if (!gridColors) {
      logger.warn('MosaicEngine: No grid colors analyzed yet', { mosaicWallId });
      return null;
    }

    // Build occupied set
    const occupied = new Set(wall.tiles.map(t => `${t.gridX},${t.gridY}`));
    const totalCells = wall.gridWidth * wall.gridHeight;
    if (occupied.size >= totalCells) {
      logger.info('MosaicEngine: Mosaic is full', { mosaicWallId });
      return null;
    }

    // 1. Crop + extract color in parallel
    const [croppedBuffer, dominantColor] = await Promise.all([
      this.cropTile(photoBuffer),
      this.extractDominantColor(photoBuffer),
    ]);

    // 2. Find best position
    const position = this.findBestPosition(dominantColor, gridColors, occupied);
    if (!position) {
      logger.warn('MosaicEngine: No free position found', { mosaicWallId });
      return null;
    }

    // 2b. Blend target image overlay onto the cropped tile
    let finalTile = croppedBuffer;
    if (wall.targetImagePath && wall.overlayIntensity > 0) {
      try {
        const targetBuffer = await storageService.getFile(wall.targetImagePath);
        finalTile = await this.blendTargetOverlay(
          croppedBuffer,
          targetBuffer,
          position.x,
          position.y,
          wall.gridWidth,
          wall.gridHeight,
          wall.overlayIntensity,
        );
      } catch (err) {
        logger.warn('MosaicEngine: Could not blend target overlay, using plain tile', {
          error: (err as Error).message,
        });
      }
    }

    // 3. Upload cropped tile to storage
    const croppedPath = await storageService.uploadFile(
      wall.eventId,
      `mosaic-tile-${position.x}-${position.y}.jpg`,
      finalTile,
      'image/jpeg'
    );

    // 4. Assign print number atomically
    const updatedWall = await prisma.mosaicWall.update({
      where: { id: mosaicWallId },
      data: { nextPrintNumber: { increment: 1 } },
    });
    const printNumber = updatedWall.nextPrintNumber - 1;

    // 5. Create tile record
    const label = gridToLabel(position.x, position.y);
    const targetColor = gridColors[position.y][position.x];

    const tile = await prisma.mosaicTile.create({
      data: {
        mosaicWallId,
        photoId,
        gridX: position.x,
        gridY: position.y,
        positionLabel: label,
        croppedImagePath: croppedPath,
        dominantColor: dominantColor as any,
        targetColor: targetColor as any,
        colorDistance: position.distance,
        printNumber,
        source,
      },
    });

    // Check if mosaic should be marked as completed
    const newTileCount = occupied.size + 1;
    if (newTileCount >= totalCells) {
      await prisma.mosaicWall.update({
        where: { id: mosaicWallId },
        data: { status: 'COMPLETED' },
      });
    }

    logger.info('MosaicEngine: Tile placed', {
      mosaicWallId,
      tileId: tile.id,
      position: label,
      printNumber,
      colorDistance: position.distance.toFixed(2),
      progress: `${newTileCount}/${totalCells}`,
    });

    return { tileId: tile.id, position: label, printNumber };
  }

  /**
   * Smart auto-fill: fills empty cells with duplicates of existing photos,
   * re-blended with the target-image section for each NEW cell position.
   *
   * Algorithm:
   *  1. Load all original (unblended) source photos into memory once.
   *  2. For each empty cell, score every source photo by:
   *     a) Color distance (deltaE) between photo's dominant color and the
   *        target-image color at that cell — lower is better.
   *     b) Diversity penalty — photos already used many times get penalised
   *        so the grid doesn't become a wall of the same image.
   *  3. Pick the best-scoring photo for each cell.
   *  4. Re-crop and re-blend with blendTargetOverlay for the cell's position.
   *  5. Upload the freshly blended tile and create a DB record.
   */
  async autoFill(mosaicWallId: string): Promise<number> {
    const wall = await prisma.mosaicWall.findUnique({
      where: { id: mosaicWallId },
      include: {
        tiles: {
          where: { isAutoFilled: false },
          select: {
            id: true,
            gridX: true,
            gridY: true,
            dominantColor: true,
            photoId: true,
          },
        },
      },
    });

    if (!wall || !wall.gridColors || !wall.targetImagePath) return 0;

    const gridColors = wall.gridColors as unknown as RGB[][];
    const occupied = new Set(wall.tiles.map(t => `${t.gridX},${t.gridY}`));
    const emptyCells: { x: number; y: number; color: RGB }[] = [];

    for (let y = 0; y < wall.gridHeight; y++) {
      for (let x = 0; x < wall.gridWidth; x++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y, color: gridColors[y][x] });
        }
      }
    }

    if (emptyCells.length === 0) return 0;

    // ── Step 1: Load source photos (original, unblended) ──────────────
    interface SourcePhoto {
      photoId: string;
      dominantColor: RGB;
      croppedBuffer: Buffer;
    }

    const sources: SourcePhoto[] = [];
    const seenPhotoIds = new Set<string>();

    for (const tile of wall.tiles) {
      if (!tile.photoId || seenPhotoIds.has(tile.photoId)) continue;
      seenPhotoIds.add(tile.photoId);

      try {
        const photo = await prisma.photo.findUnique({
          where: { id: tile.photoId },
          select: { storagePath: true },
        });
        if (!photo?.storagePath) continue;

        const rawBuffer = await storageService.getFile(photo.storagePath);
        const croppedBuffer = await this.cropTile(rawBuffer);
        const dominantColor = tile.dominantColor as unknown as RGB;

        if (dominantColor) {
          sources.push({ photoId: tile.photoId, dominantColor, croppedBuffer });
        }
      } catch (err) {
        logger.warn('AutoFill: Could not load source photo', {
          photoId: tile.photoId,
          error: (err as Error).message,
        });
      }
    }

    if (sources.length === 0) {
      logger.warn('AutoFill: No source photos available');
      return 0;
    }

    logger.info(`AutoFill: ${sources.length} unique source photos loaded, ${emptyCells.length} cells to fill`);

    // Pre-compute Lab colors for sources
    const sourceLabs = sources.map(s => ({
      ...s,
      lab: rgbToLab(s.dominantColor),
    }));

    // Load target image once
    let targetBuffer: Buffer;
    try {
      targetBuffer = await storageService.getFile(wall.targetImagePath);
    } catch (err) {
      logger.error('AutoFill: Could not load target image', { error: (err as Error).message });
      return 0;
    }

    // ── Step 2 & 3: Score and pick best photo per cell ────────────────
    // Track usage count for diversity weighting
    const usageCount = new Map<string, number>();
    for (const s of sources) usageCount.set(s.photoId, 0);

    // Shuffle empty cells to avoid spatial bias
    for (let i = emptyCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    let filled = 0;

    for (const cell of emptyCells) {
      const cellLab = rgbToLab(cell.color);

      // Score each source: lower = better
      let bestIdx = 0;
      let bestScore = Infinity;

      for (let i = 0; i < sourceLabs.length; i++) {
        const colorDist = deltaE(sourceLabs[i].lab, cellLab);
        const usage = usageCount.get(sourceLabs[i].photoId) || 0;
        // Diversity penalty: each reuse adds 5 deltaE points
        const diversityPenalty = usage * 5;
        const score = colorDist + diversityPenalty;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      const chosen = sourceLabs[bestIdx];
      usageCount.set(chosen.photoId, (usageCount.get(chosen.photoId) || 0) + 1);

      try {
        // ── Step 4: Re-blend for this cell's target position ──────────
        const blended = await this.blendTargetOverlay(
          chosen.croppedBuffer,
          targetBuffer,
          cell.x,
          cell.y,
          wall.gridWidth,
          wall.gridHeight,
          wall.overlayIntensity,
        );

        // ── Step 5: Upload and create DB record ───────────────────────
        const path = await storageService.uploadFile(
          wall.eventId,
          `mosaic-tile-${cell.x}-${cell.y}.jpg`,
          blended,
          'image/jpeg',
        );

        const label = gridToLabel(cell.x, cell.y);
        await prisma.mosaicTile.create({
          data: {
            mosaicWallId,
            photoId: null,
            gridX: cell.x,
            gridY: cell.y,
            positionLabel: label,
            croppedImagePath: path,
            dominantColor: chosen.dominantColor as any,
            targetColor: cell.color as any,
            colorDistance: bestScore,
            isAutoFilled: true,
            printStatus: 'PLACED',
            source: 'AUTO_FILL',
          },
        });

        filled++;
        if (filled % 10 === 0) {
          logger.info(`AutoFill: ${filled}/${emptyCells.length} cells filled`);
        }
      } catch (err) {
        logger.warn('AutoFill: Failed to fill cell', {
          cell: `${cell.x},${cell.y}`,
          error: (err as Error).message,
        });
      }
    }

    if (filled > 0) {
      await prisma.mosaicWall.update({
        where: { id: mosaicWallId },
        data: { status: 'COMPLETED' },
      });
    }

    logger.info('AutoFill: Completed', { mosaicWallId, filled, totalCells: emptyCells.length });
    return filled;
  }

  /**
   * Get mosaic stats for the ticker display.
   */
  async getStats(mosaicWallId: string) {
    const wall = await prisma.mosaicWall.findUnique({
      where: { id: mosaicWallId },
      select: { gridWidth: true, gridHeight: true, eventId: true },
    });

    if (!wall) return null;

    const totalCells = wall.gridWidth * wall.gridHeight;

    const [tileCount, recentTiles, topUploaders] = await Promise.all([
      prisma.mosaicTile.count({
        where: { mosaicWallId, isAutoFilled: false },
      }),
      prisma.mosaicTile.findMany({
        where: { mosaicWallId, isAutoFilled: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          photo: { select: { uploadedBy: true } },
        },
      }),
      // Top uploaders: count photos per uploader name
      prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT p."uploadedBy" as name, COUNT(*) as count
        FROM mosaic_tiles mt
        JOIN photos p ON p.id = mt."photoId"
        WHERE mt."mosaicWallId" = ${mosaicWallId}
          AND mt."isAutoFilled" = false
          AND p."uploadedBy" IS NOT NULL
        GROUP BY p."uploadedBy"
        ORDER BY count DESC
        LIMIT 5
      `,
    ]);

    const progress = totalCells > 0 ? Math.round((tileCount / totalCells) * 100) : 0;

    return {
      totalCells,
      filledCells: tileCount,
      progress,
      remaining: totalCells - tileCount,
      recentUploaders: recentTiles
        .map(t => t.photo?.uploadedBy)
        .filter(Boolean),
      topUploaders: topUploaders.map(u => ({
        name: u.name,
        count: Number(u.count),
      })),
    };
  }
}

export const mosaicEngine = new MosaicEngine();
