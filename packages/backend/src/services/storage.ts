import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';

// SeaweedFS S3 API Configuration
const SEAWEEDFS_ENDPOINT = process.env.SEAWEEDFS_ENDPOINT || 'localhost:8333';
const SEAWEEDFS_SECURE = process.env.SEAWEEDFS_SECURE === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';
const SEAWEEDFS_ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY || (IS_PROD ? '' : 'admin');
const SEAWEEDFS_SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY || (IS_PROD ? '' : 'password');
const BUCKET = process.env.SEAWEEDFS_BUCKET || 'gaestefotos-v2';

if (IS_PROD && (!process.env.SEAWEEDFS_ACCESS_KEY || !process.env.SEAWEEDFS_SECRET_KEY)) {
  throw new Error('Server misconfigured: SEAWEEDFS_ACCESS_KEY/SEAWEEDFS_SECRET_KEY must be set in production');
}

function sanitizeFilename(original: string): { base: string; ext: string } {
  const trimmed = String(original || '').trim();
  const baseName = path.basename(trimmed || 'file');
  const ext = path.extname(baseName).toLowerCase();
  const rawBase = ext ? baseName.slice(0, -ext.length) : baseName;

  const safeBase = rawBase
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80);

  const safeExt = ext && /^[.][a-z0-9]{1,10}$/.test(ext) ? ext : '';
  return { base: safeBase || 'file', ext: safeExt };
}

const s3Client = new S3Client({
  endpoint: `http${SEAWEEDFS_SECURE ? 's' : ''}://${SEAWEEDFS_ENDPOINT}`,
  region: 'us-east-1', // SeaweedFS doesn't use regions, but SDK requires it
  credentials: {
    accessKeyId: SEAWEEDFS_ACCESS_KEY,
    secretAccessKey: SEAWEEDFS_SECRET_KEY,
  },
  forcePathStyle: true, // Required for SeaweedFS
});

export class StorageService {
  async uploadFile(
    eventId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
    _mediaId?: string,
    _uploadedBy?: string,
    _hostId?: string
  ): Promise<string> {
    const { base, ext } = sanitizeFilename(filename);
    const nonce = typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : crypto.randomBytes(16).toString('hex');
    const key = `events/${eventId}/${Date.now()}-${nonce}-${base}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return key;
  }

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response: any = await s3Client.send(command);
    const body = response?.Body;
    if (!body) {
      throw new Error('Storage: empty response body');
    }

    if (Buffer.isBuffer(body)) return body;
    if (typeof body === 'string') return Buffer.from(body);

    const stream: Readable = body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    await s3Client.send(command);
  }

  async ensureBucketExists(): Promise<void> {
    // Bucket creation is handled by SeaweedFS
    // SeaweedFS creates buckets automatically on first upload
    // This is a placeholder for bucket verification if needed
  }
}

export const storageService = new StorageService();

