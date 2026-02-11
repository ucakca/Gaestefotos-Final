import prisma from '../config/database';
import { storageService } from '../services/storage';
import { mosaicEngine } from '../services/mosaicEngine';

async function main() {
  const wallId = '9c2463ee-46c8-406d-ac7a-1229da2c8a25';
  const newIntensity = 35; // 35% overlay — sichtbar aber Foto bleibt erkennbar

  console.log(`Setze overlayIntensity auf ${newIntensity}%...`);
  await prisma.mosaicWall.update({
    where: { id: wallId },
    data: { overlayIntensity: newIntensity },
  });

  const wall = await prisma.mosaicWall.findUnique({ where: { id: wallId } });
  if (!wall || !wall.targetImagePath) {
    console.log('Kein Target-Image gefunden');
    process.exit(1);
  }

  console.log(`Wall: ${wall.gridWidth}x${wall.gridHeight}, Overlay: ${wall.overlayIntensity}%`);

  const targetBuffer = await storageService.getFile(wall.targetImagePath);
  console.log('Target-Image geladen.');

  const tiles = await prisma.mosaicTile.findMany({
    where: { mosaicWallId: wallId, isAutoFilled: false, croppedImagePath: { not: null } },
    select: { id: true, gridX: true, gridY: true, croppedImagePath: true, photoId: true },
  });

  console.log(`${tiles.length} Tiles werden neu gerendert...\n`);

  let ok = 0;
  let fail = 0;

  for (const tile of tiles) {
    try {
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
        sourceBuffer, targetBuffer,
        tile.gridX, tile.gridY,
        wall.gridWidth, wall.gridHeight,
        newIntensity,
      );

      await storageService.uploadFile(
        wall.eventId,
        `mosaic-tile-${tile.gridX}-${tile.gridY}.jpg`,
        blended,
        'image/jpeg',
      );

      ok++;
      process.stdout.write(`✅ ${tile.gridX},${tile.gridY}  `);
      if (ok % 8 === 0) console.log('');
    } catch (err) {
      fail++;
      console.log(`❌ ${tile.gridX},${tile.gridY}: ${(err as Error).message}`);
    }
  }

  console.log(`\n\nFertig: ${ok} OK, ${fail} fehlgeschlagen`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
