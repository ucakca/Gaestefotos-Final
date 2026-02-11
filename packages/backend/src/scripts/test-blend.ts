import prisma from '../config/database';
import { storageService } from '../services/storage';
import { mosaicEngine } from '../services/mosaicEngine';
import fs from 'fs';
import path from 'path';

async function main() {
  const wallId = '9c2463ee-46c8-406d-ac7a-1229da2c8a25';
  const wall = await prisma.mosaicWall.findUnique({ where: { id: wallId } });
  if (!wall?.targetImagePath) { console.log('No wall/target'); process.exit(1); }

  console.log(`Wall overlay: ${wall.overlayIntensity}%`);

  const targetBuffer = await storageService.getFile(wall.targetImagePath);
  console.log(`Target image: ${targetBuffer.length} bytes`);

  // Get one tile
  const tile = await prisma.mosaicTile.findFirst({
    where: { mosaicWallId: wallId, isAutoFilled: false, photoId: { not: null } },
    include: { photo: { select: { storagePath: true } } },
  });

  if (!tile?.photo?.storagePath) { console.log('No tile with photo'); process.exit(1); }
  console.log(`Tile: ${tile.gridX},${tile.gridY} photo: ${tile.photo.storagePath}`);

  // Get original photo and crop
  const originalBuffer = await storageService.getFile(tile.photo.storagePath);
  const cropped = await mosaicEngine.cropTile(originalBuffer);
  console.log(`Cropped: ${cropped.length} bytes`);

  // Save cropped (no overlay) for comparison
  const outDir = '/tmp/mosaic-test';
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tile-original.jpg'), cropped);
  console.log(`Saved: ${outDir}/tile-original.jpg`);

  // Blend at different intensities
  for (const intensity of [35, 50, 70]) {
    const blended = await mosaicEngine.blendTargetOverlay(
      cropped, targetBuffer,
      tile.gridX, tile.gridY,
      wall.gridWidth, wall.gridHeight,
      intensity,
    );
    const fname = `tile-overlay-${intensity}pct.jpg`;
    fs.writeFileSync(path.join(outDir, fname), blended);
    console.log(`Saved: ${outDir}/${fname} (${blended.length} bytes)`);
  }

  // Also save the target section for this cell
  const sharp = (await import('sharp')).default;
  const targetMeta = await sharp(targetBuffer).metadata();
  const cellW = Math.floor((targetMeta.width || 12) / wall.gridWidth);
  const cellH = Math.floor((targetMeta.height || 12) / wall.gridHeight);
  const section = await sharp(targetBuffer)
    .extract({ left: tile.gridX * cellW, top: tile.gridY * cellH, width: cellW, height: cellH })
    .resize(300, 300, { fit: 'fill' })
    .jpeg()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, 'target-section.jpg'), section);
  console.log(`Saved: ${outDir}/target-section.jpg`);

  // Also check what's currently stored
  if (tile.croppedImagePath) {
    const stored = await storageService.getFile(tile.croppedImagePath);
    fs.writeFileSync(path.join(outDir, 'tile-stored-current.jpg'), stored);
    console.log(`Saved: ${outDir}/tile-stored-current.jpg (${stored.length} bytes)`);
  }

  console.log('\nVergleiche tile-original.jpg vs tile-stored-current.jpg vs tile-overlay-35pct.jpg');
  console.log('Wenn stored === original, hat das Re-Render nicht funktioniert.');

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
