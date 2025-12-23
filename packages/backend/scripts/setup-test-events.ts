import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { storageService } from '../src/services/storage';
import { imageProcessor } from '../src/services/imageProcessor';

const prisma = new PrismaClient();

const SAMPLE_IMAGES = [
  'https://picsum.photos/seed/gf-active-1/1200/900',
  'https://picsum.photos/seed/gf-active-2/1200/900',
  'https://picsum.photos/seed/gf-active-3/1200/900',
  'https://picsum.photos/seed/gf-expired-1/1200/900',
  'https://picsum.photos/seed/gf-expired-2/1200/900',
];

const DEFAULT_SAMPLE_VIDEO_URL =
  'https://filesamples.com/samples/video/mp4/sample_640x360.mp4';

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function safeSlug(base: string): string {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureHostUser() {
  const email = process.env.TEST_HOST_EMAIL || 'test.host@gaestefotos.local';
  const password = process.env.TEST_HOST_PASSWORD || 'Test1234!';
  const name = process.env.TEST_HOST_NAME || 'Test Host';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { user: existing, email, password };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: passwordHash,
      role: 'HOST',
    },
  });

  return { user, email, password };
}

async function ensureEvent(params: {
  hostId: string;
  slug: string;
  title: string;
  dateTime: Date;
  allowUploads: boolean;
  allowDownloads: boolean;
}) {
  const slug = safeSlug(params.slug);

  const event = await prisma.event.upsert({
    where: { slug },
    update: {
      title: params.title,
      dateTime: params.dateTime,
      isActive: true,
      deletedAt: null,
      purgeAfter: null,
      featuresConfig: {
        showGuestlist: false,
        mysteryMode: false,
        allowUploads: params.allowUploads,
        moderationRequired: false,
        allowDownloads: params.allowDownloads,
      },
    },
    create: {
      hostId: params.hostId,
      slug,
      title: params.title,
      dateTime: params.dateTime,
      isActive: true,
      featuresConfig: {
        showGuestlist: false,
        mysteryMode: false,
        allowUploads: params.allowUploads,
        moderationRequired: false,
        allowDownloads: params.allowDownloads,
      },
    },
  });

  return event;
}

async function clearEventMedia(eventId: string) {
  // Keep this non-destructive for storage: only DB records are deleted.
  // Storage objects are left as-is to avoid accidental destructive behavior.
  await prisma.photo.deleteMany({ where: { eventId } });
  await (prisma as any).video.deleteMany({ where: { eventId } });
}

async function seedPhotos(event: { id: string; hostId: string }, label: string) {
  const maxPhotos = Number(process.env.TEST_PHOTO_COUNT || 5);
  const selected = SAMPLE_IMAGES.slice(0, maxPhotos);

  let ok = 0;
  for (let i = 0; i < selected.length; i++) {
    const url = selected[i];
    const imageBuffer = await downloadToBuffer(url);
    const processed = await imageProcessor.processImage(imageBuffer, true);

    const contentType = processed.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const filename = `${label}-photo-${i + 1}.${processed.format === 'webp' ? 'webp' : 'jpg'}`;

    const storagePath = await storageService.uploadFile(
      event.id,
      filename,
      processed.optimized,
      contentType,
      undefined,
      'Seed Script',
      event.hostId
    );

    const proxyUrl = `/api/photos/${'__ID__'}/file`; // placeholder, not used
    const presignedUrl = await storageService.getFileUrl(storagePath, 7 * 24 * 3600);

    await prisma.photo.create({
      data: {
        eventId: event.id,
        storagePath,
        url: presignedUrl,
        status: 'APPROVED',
        uploadedBy: 'Seed Script',
        title: `${label} Foto ${i + 1}`,
        description: null,
        tags: [],
      },
    });

    ok++;
  }

  return ok;
}

async function seedVideos(event: { id: string; hostId: string }, label: string) {
  const videoUrl = process.env.TEST_VIDEO_URL || DEFAULT_SAMPLE_VIDEO_URL;
  const count = Number(process.env.TEST_VIDEO_COUNT || 1);

  let ok = 0;
  const videoBuffer = await downloadToBuffer(videoUrl);

  for (let i = 0; i < count; i++) {
    const filename = `${label}-video-${i + 1}.mp4`;
    const storagePath = await storageService.uploadFile(
      event.id,
      filename,
      videoBuffer,
      'video/mp4',
      undefined,
      'Seed Script',
      event.hostId
    );

    // Video proxy route expects /api/videos/:id/file in this codebase.
    const created = await (prisma as any).video.create({
      data: {
        eventId: event.id,
        storagePath,
        url: '',
        status: 'APPROVED',
        uploadedBy: 'Seed Script',
        scanStatus: 'CLEAN',
        scannedAt: new Date(),
        sizeBytes: BigInt(videoBuffer.length),
      },
    });

    const proxyUrl = `/api/videos/${created.id}/file`;
    await (prisma as any).video.update({
      where: { id: created.id },
      data: { url: proxyUrl },
    });

    ok++;
  }

  return ok;
}

async function main() {
  const { user, email, password } = await ensureHostUser();

  const activeEvent = await ensureEvent({
    hostId: user.id,
    slug: process.env.TEST_EVENT_ACTIVE_SLUG || 'gf-test-active',
    title: process.env.TEST_EVENT_ACTIVE_TITLE || 'GF Test Event (Active)',
    dateTime: new Date(),
    allowUploads: true,
    allowDownloads: true,
  });

  const expiredEvent = await ensureEvent({
    hostId: user.id,
    slug: process.env.TEST_EVENT_EXPIRED_SLUG || 'gf-test-expired',
    title: process.env.TEST_EVENT_EXPIRED_TITLE || 'GF Test Event (Expired)',
    dateTime: daysAgo(30),
    allowUploads: true,
    allowDownloads: true,
  });

  if (process.env.TEST_RESET_MEDIA === 'true') {
    await clearEventMedia(activeEvent.id);
    await clearEventMedia(expiredEvent.id);
  }

  const activePhotos = await seedPhotos(activeEvent, 'active');
  const activeVideos = await seedVideos(activeEvent, 'active');
  const expiredPhotos = await seedPhotos(expiredEvent, 'expired');
  const expiredVideos = await seedVideos(expiredEvent, 'expired');

  // storageEndsAt is computed from dateTime + package duration. For expired event (dateTime - 30d)
  // default free duration 14d => storageEndsAt in the past => locked.
  console.log('=== Test Events ready ===');
  console.log('Host credentials:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('Active event:');
  console.log(`  id:   ${activeEvent.id}`);
  console.log(`  slug: ${activeEvent.slug}`);
  console.log(`  photos: ${activePhotos}, videos: ${activeVideos}`);
  console.log('Expired event:');
  console.log(`  id:   ${expiredEvent.id}`);
  console.log(`  slug: ${expiredEvent.slug}`);
  console.log(`  photos: ${expiredPhotos}, videos: ${expiredVideos}`);
  console.log('Public URLs:');
  console.log(`  /e2/${activeEvent.slug}`);
  console.log(`  /e2/${expiredEvent.slug}`);
}

main()
  .catch((err) => {
    console.error('setup-test-events failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
