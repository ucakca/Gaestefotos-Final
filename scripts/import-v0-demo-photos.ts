/**
 * Import v0 Demo Photos
 * 
 * Downloads Unsplash demo images and uploads them to the test event.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const prisma = new PrismaClient();

const EVENT_ID = '58a97b44-4a38-42c8-a919-93d53b58afac';

// Demo photos from v0 (Unsplash wedding photos)
const demoPhotos = [
  { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', category: 'Trauung' },
  { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80', category: 'Trauung' },
  { url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', category: 'Feier' },
  { url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80', category: 'Feier' },
  { url: 'https://images.unsplash.com/photo-1606216794074-730e3918a45a?w=800&q=80', category: 'Feier' },
  { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80', category: 'Tanzen' },
  { url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&q=80', category: 'Tanzen' },
  { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80', category: 'Feier' },
  { url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=800&q=80', category: 'Trauung' },
  { url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80', category: 'Feier' },
];

async function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        https.get(response.headers.location!, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('Importing v0 demo photos...\n');

  // Get categories
  const categories = await prisma.category.findMany({
    where: { eventId: EVENT_ID },
  });

  const categoryMap = new Map(categories.map(c => [c.name, c.id]));
  console.log('Categories:', Array.from(categoryMap.keys()));

  // Create temp directory
  const tempDir = '/tmp/v0-demo-photos';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Storage directory
  const storageDir = `/root/gaestefotos-app-v2/packages/backend/uploads/events/${EVENT_ID}`;
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  for (let i = 0; i < demoPhotos.length; i++) {
    const photo = demoPhotos[i];
    const photoId = uuidv4();
    const fileName = `${Date.now()}-${photoId}.jpg`;
    const tempPath = path.join(tempDir, fileName);
    const storagePath = `events/${EVENT_ID}/${fileName}`;
    const fullStoragePath = path.join(storageDir, fileName);

    console.log(`[${i + 1}/${demoPhotos.length}] Downloading: ${photo.url.substring(0, 50)}...`);

    try {
      // Download image
      await downloadImage(photo.url, tempPath);

      // Copy to storage
      fs.copyFileSync(tempPath, fullStoragePath);

      // Get category ID
      const categoryId = categoryMap.get(photo.category) || null;

      // Insert into database
      await prisma.photo.create({
        data: {
          id: photoId,
          eventId: EVENT_ID,
          storagePath: storagePath,
          url: `/api/photos/${photoId}/file`,
          status: 'APPROVED',
          categoryId: categoryId,
          uploadedBy: 'Demo Import',
        },
      });

      console.log(`  ✓ Saved as ${fileName} (Category: ${photo.category})`);

      // Cleanup temp file
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
    }
  }

  console.log('\n✅ Demo photos imported successfully!');
  await prisma.$disconnect();
}

main().catch(console.error);
