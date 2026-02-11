/**
 * Re-render all existing mosaic tiles with the target image overlay.
 *
 * Usage:
 *   npx tsx src/scripts/rerender-mosaic-tiles.ts
 *   npx tsx src/scripts/rerender-mosaic-tiles.ts --wall-id=<uuid>   # single wall
 *   npx tsx src/scripts/rerender-mosaic-tiles.ts --dry-run           # preview only
 */

import prisma from '../config/database';
import { storageService } from '../services/storage';
import { mosaicEngine } from '../services/mosaicEngine';
import { logger } from '../utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const wallIdArg = args.find(a => a.startsWith('--wall-id='));
  const wallId = wallIdArg?.split('=')[1];

  console.log('=== Mosaic Tile Re-Renderer ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (wallId) console.log(`Wall: ${wallId}`);
  console.log('');

  // Find walls with target images
  const where: any = {
    targetImagePath: { not: null },
    overlayIntensity: { gt: 0 },
  };
  if (wallId) where.id = wallId;

  const walls = await prisma.mosaicWall.findMany({
    where,
    select: {
      id: true,
      eventId: true,
      targetImagePath: true,
      overlayIntensity: true,
      gridWidth: true,
      gridHeight: true,
    },
  });

  if (walls.length === 0) {
    console.log('Keine Walls mit Target-Image gefunden.');
    process.exit(0);
  }

  console.log(`${walls.length} Wall(s) gefunden.\n`);

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const wall of walls) {
    console.log(`--- Wall ${wall.id} (Event: ${wall.eventId}) ---`);
    console.log(`  Grid: ${wall.gridWidth}×${wall.gridHeight}, Overlay: ${wall.overlayIntensity}%`);

    // Load target image once per wall
    let targetBuffer: Buffer;
    try {
      targetBuffer = await storageService.getFile(wall.targetImagePath!);
    } catch (err) {
      console.log(`  ❌ Target-Image konnte nicht geladen werden: ${(err as Error).message}`);
      continue;
    }

    // Get all non-auto-filled tiles for this wall
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

    console.log(`  ${tiles.length} Tiles zu verarbeiten`);

    if (dryRun) {
      totalProcessed += tiles.length;
      continue;
    }

    for (const tile of tiles) {
      try {
        // Load original photo (not the already-cropped tile, to avoid double overlay)
        let sourceBuffer: Buffer;
        if (tile.photoId) {
          const photo = await prisma.photo.findUnique({
            where: { id: tile.photoId },
            select: { storagePath: true },
          });
          if (photo?.storagePath) {
            sourceBuffer = await storageService.getFile(photo.storagePath);
            // Re-crop from original
            sourceBuffer = await mosaicEngine.cropTile(sourceBuffer);
          } else {
            // Fallback: use existing cropped tile
            sourceBuffer = await storageService.getFile(tile.croppedImagePath!);
          }
        } else {
          sourceBuffer = await storageService.getFile(tile.croppedImagePath!);
        }

        // Blend target overlay
        const blended = await mosaicEngine.blendTargetOverlay(
          sourceBuffer,
          targetBuffer,
          tile.gridX,
          tile.gridY,
          wall.gridWidth,
          wall.gridHeight,
          wall.overlayIntensity,
        );

        // Re-upload and update DB path
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

        totalProcessed++;
        process.stdout.write(`  ✅ ${tile.gridX},${tile.gridY}`);
        if (totalProcessed % 10 === 0) process.stdout.write('\n');
      } catch (err) {
        totalFailed++;
        console.log(`  ❌ Tile ${tile.id} (${tile.gridX},${tile.gridY}): ${(err as Error).message}`);
      }
    }
    console.log('');
  }

  console.log('\n=== Fertig ===');
  console.log(`Verarbeitet: ${totalProcessed}`);
  console.log(`Fehlgeschlagen: ${totalFailed}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
