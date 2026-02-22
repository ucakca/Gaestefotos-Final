-- Add ArcFace 512-dim embedding column to face_embedding table.
-- This is additive (non-breaking): existing 128-dim embeddings are preserved.
-- New photos will have both 128-dim (face-api, free) and 512-dim (ArcFace via FAL.ai, optional).
-- Search prefers 512-dim when available, falls back to 128-dim.

ALTER TABLE "face_embedding"
  ADD COLUMN IF NOT EXISTS "embedding_arc" vector(512),
  ADD COLUMN IF NOT EXISTS "model" TEXT DEFAULT 'face-api-128';

-- Update existing rows to reflect their model
UPDATE "face_embedding" SET "model" = 'face-api-128' WHERE "model" IS NULL;

-- HNSW index on 512-dim ArcFace embeddings (faster than IVFFlat for < 1M rows)
CREATE INDEX IF NOT EXISTS "idx_face_embedding_arc_cosine"
  ON "face_embedding" USING hnsw ("embedding_arc" vector_cosine_ops)
  WHERE "embedding_arc" IS NOT NULL;
