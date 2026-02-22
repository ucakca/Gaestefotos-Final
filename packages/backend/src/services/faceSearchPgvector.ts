/**
 * pgvector-powered Face Search Service
 * 
 * Uses PostgreSQL pgvector extension for fast vector similarity search
 * instead of loading all photos into memory for JS-based comparison.
 * 
 * Falls back to the existing JS-based faceSearch.ts if pgvector is not available.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface VectorSearchResult {
  photoId: string;
  photoUrl: string;
  similarity: number;
  facePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

let pgvectorAvailable: boolean | null = null;

/**
 * Check if pgvector extension is installed and face_embedding table exists.
 */
async function checkPgvectorAvailable(): Promise<boolean> {
  if (pgvectorAvailable !== null) return pgvectorAvailable;

  try {
    const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'face_embedding'
      ) AS exists`
    );
    pgvectorAvailable = result[0]?.exists === true;
    logger.info(`[FaceSearch] pgvector available: ${pgvectorAvailable}`);
  } catch {
    pgvectorAvailable = false;
    logger.info('[FaceSearch] pgvector not available, using JS fallback');
  }
  return pgvectorAvailable;
}

/**
 * Store a face embedding in the pgvector table.
 * Called during photo upload after face detection.
 */
export async function storeFaceEmbedding(opts: {
  photoId: string;
  eventId: string;
  descriptor: number[];         // 128-dim (face-api) OR 512-dim (ArcFace)
  descriptorArc?: number[];     // 512-dim ArcFace embedding (optional, from FAL.ai InsightFace)
  faceIndex: number;
  box?: { x: number; y: number; width: number; height: number };
  confidence?: number;
}): Promise<void> {
  if (!(await checkPgvectorAvailable())) return;

  const { photoId, eventId, descriptor, descriptorArc, faceIndex, box, confidence } = opts;
  const dim = descriptor.length; // 128 or 512
  const model = descriptorArc ? 'arcface-512' : (dim === 512 ? 'arcface-512' : 'face-api-128');

  try {
    const vectorStr = `[${descriptor.join(',')}]`;
    const arcStr = descriptorArc ? `[${descriptorArc.join(',')}]` : null;

    if (arcStr) {
      // Store both: 128-dim in embedding, 512-dim ArcFace in embedding_arc
      await prisma.$executeRawUnsafe(
        `INSERT INTO face_embedding (photo_id, event_id, embedding, embedding_arc, face_index, box_x, box_y, box_width, box_height, confidence, model)
         VALUES ($1::uuid, $2::uuid, $3::vector(128), $4::vector(512), $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT DO NOTHING`,
        photoId, eventId, vectorStr, arcStr, faceIndex,
        box?.x ?? null, box?.y ?? null, box?.width ?? null, box?.height ?? null,
        confidence ?? null, model
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO face_embedding (photo_id, event_id, embedding, face_index, box_x, box_y, box_width, box_height, confidence, model)
         VALUES ($1::uuid, $2::uuid, $3::vector(128), $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        photoId, eventId, vectorStr, faceIndex,
        box?.x ?? null, box?.y ?? null, box?.width ?? null, box?.height ?? null,
        confidence ?? null, model
      );
    }
  } catch (error) {
    logger.warn('[FaceSearch] Failed to store face embedding', {
      photoId, error: (error as Error).message,
    });
  }
}

/**
 * Search for photos matching a face descriptor using pgvector cosine similarity.
 * Much faster than JS-based comparison, especially for large events.
 */
export async function searchByVector(
  eventId: string,
  descriptor: number[],     // accepts 128-dim or 512-dim
  minSimilarity: number = 0.6,
  limit: number = 100
): Promise<VectorSearchResult[]> {
  if (!(await checkPgvectorAvailable())) {
    return []; // Caller should fall back to JS-based search
  }

  const dim = descriptor.length; // 128 = face-api, 512 = ArcFace

  try {
    const vectorStr = `[${descriptor.join(',')}]`;
    const maxDistance = 1 - minSimilarity;

    let sql: string;
    if (dim === 512) {
      // ArcFace 512-dim search: use embedding_arc column where available,
      // fall back to rows where embedding_arc is NULL (old photos only have 128-dim)
      sql = `SELECT
         fe.photo_id,
         1 - (fe.embedding_arc <=> $1::vector(512)) AS similarity,
         fe.box_x, fe.box_y, fe.box_width, fe.box_height,
         p.url, p."storagePath" as storage_path
       FROM face_embedding fe
       JOIN "Photo" p ON p.id = fe.photo_id
       WHERE fe.event_id = $2::uuid
         AND fe.embedding_arc IS NOT NULL
         AND p."deletedAt" IS NULL
         AND p.status = 'APPROVED'
         AND (fe.embedding_arc <=> $1::vector(512)) < $3
       ORDER BY fe.embedding_arc <=> $1::vector(512)
       LIMIT $4`;
    } else {
      // Legacy 128-dim search (face-api)
      sql = `SELECT
         fe.photo_id,
         1 - (fe.embedding <=> $1::vector(128)) AS similarity,
         fe.box_x, fe.box_y, fe.box_width, fe.box_height,
         p.url, p."storagePath" as storage_path
       FROM face_embedding fe
       JOIN "Photo" p ON p.id = fe.photo_id
       WHERE fe.event_id = $2::uuid
         AND p."deletedAt" IS NULL
         AND p.status = 'APPROVED'
         AND (fe.embedding <=> $1::vector(128)) < $3
       ORDER BY fe.embedding <=> $1::vector(128)
       LIMIT $4`;
    }

    const results = await prisma.$queryRawUnsafe<{
      photo_id: string;
      similarity: number;
      box_x: number | null;
      box_y: number | null;
      box_width: number | null;
      box_height: number | null;
      url: string | null;
      storage_path: string | null;
    }[]>(sql, vectorStr, eventId, maxDistance, limit);

    return results.map(r => ({
      photoId: r.photo_id,
      photoUrl: `/cdn/${r.photo_id}`,
      similarity: Number(r.similarity),
      facePosition: r.box_x != null ? {
        x: r.box_x,
        y: r.box_y!,
        width: r.box_width!,
        height: r.box_height!,
      } : undefined,
    }));
  } catch (error) {
    logger.error('[FaceSearch] pgvector search failed', {
      eventId, error: (error as Error).message,
    });
    return [];
  }
}

/**
 * Delete face embeddings for a photo (e.g. on photo deletion).
 */
export async function deleteFaceEmbeddings(photoId: string): Promise<void> {
  if (!(await checkPgvectorAvailable())) return;

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM face_embedding WHERE photo_id = $1::uuid`,
      photoId
    );
  } catch (error) {
    logger.warn('[FaceSearch] Failed to delete face embeddings', {
      photoId, error: (error as Error).message,
    });
  }
}

/**
 * Get stats about face embeddings for an event.
 */
export async function getFaceEmbeddingStats(eventId: string): Promise<{
  totalEmbeddings: number;
  totalPhotos: number;
  pgvectorAvailable: boolean;
}> {
  const available = await checkPgvectorAvailable();
  if (!available) {
    return { totalEmbeddings: 0, totalPhotos: 0, pgvectorAvailable: false };
  }

  try {
    const result = await prisma.$queryRawUnsafe<{
      total_embeddings: bigint;
      total_photos: bigint;
    }[]>(
      `SELECT
         COUNT(*) AS total_embeddings,
         COUNT(DISTINCT photo_id) AS total_photos
       FROM face_embedding
       WHERE event_id = $1::uuid`,
      eventId
    );

    return {
      totalEmbeddings: Number(result[0]?.total_embeddings || 0),
      totalPhotos: Number(result[0]?.total_photos || 0),
      pgvectorAvailable: true,
    };
  } catch {
    return { totalEmbeddings: 0, totalPhotos: 0, pgvectorAvailable: false };
  }
}
