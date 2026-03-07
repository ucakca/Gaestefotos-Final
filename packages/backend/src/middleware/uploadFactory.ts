import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

type UploadType = 'image' | 'video' | 'audio' | 'any';

const MIME_PREFIXES: Record<UploadType, string | null> = {
  image: 'image/',
  video: 'video/',
  audio: 'audio/',
  any: null,
};

const DEFAULT_LIMITS: Record<UploadType, number> = {
  image: 100,
  video: 100,
  audio: 20,
  any: 100,
};

/**
 * Create a multer upload instance with consistent config.
 * @param type - MIME type group to accept
 * @param maxMb - Max file size in MB (default per type)
 * @param useDisk - Use disk storage instead of memory (for large files like video)
 */
export function createUpload(
  type: UploadType = 'image',
  maxMb?: number,
  useDisk = false,
) {
  const limit = (maxMb ?? DEFAULT_LIMITS[type]) * 1024 * 1024;
  const mimePrefix = MIME_PREFIXES[type];

  const fileFilter: multer.Options['fileFilter'] = mimePrefix
    ? (_req, file, cb) => {
        if (file.mimetype.startsWith(mimePrefix)) {
          cb(null, true);
        } else {
          cb(new Error(`Nur ${type === 'image' ? 'Bild' : type === 'video' ? 'Video' : 'Audio'}-Dateien sind erlaubt`));
        }
      }
    : undefined;

  const storage = useDisk
    ? multer.diskStorage({
        destination: (() => {
          const dir = process.env.VIDEO_UPLOAD_TMP_DIR || '/tmp/upload-tmp';
          fs.mkdirSync(dir, { recursive: true });
          return dir;
        })(),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '';
          cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
        },
      })
    : multer.memoryStorage();

  return multer({ storage, limits: { fileSize: limit }, fileFilter });
}
