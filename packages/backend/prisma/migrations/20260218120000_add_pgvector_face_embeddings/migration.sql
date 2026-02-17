-- Enable pgvector extension (requires superuser or CREATE EXTENSION privilege)
CREATE EXTENSION IF NOT EXISTS vector;

-- Face embeddings table: stores 128-dimensional face descriptor vectors
-- Separate from photos table to keep Prisma schema clean (pgvector not natively supported)
CREATE TABLE IF NOT EXISTS "face_embedding" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "photo_id"    UUID NOT NULL REFERENCES "Photo"("id") ON DELETE CASCADE,
  "event_id"    UUID NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
  "embedding"   vector(128) NOT NULL,
  "face_index"  INTEGER NOT NULL DEFAULT 0,
  "box_x"       REAL,
  "box_y"       REAL,
  "box_width"   REAL,
  "box_height"  REAL,
  "confidence"  REAL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast vector similarity search using IVFFlat
-- Lists = sqrt(expected_rows); start with 100, tune later
CREATE INDEX IF NOT EXISTS "idx_face_embedding_event" ON "face_embedding" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_face_embedding_photo" ON "face_embedding" ("photo_id");

-- IVFFlat index for cosine similarity search within an event
-- This index requires at least 100 rows to be effective; will be created by migration script
-- CREATE INDEX idx_face_embedding_cosine ON face_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Backfill: migrate existing face descriptors from Photo.faceData JSON to face_embedding table
-- Run this AFTER deployment:
--   INSERT INTO face_embedding (photo_id, event_id, embedding, face_index, box_x, box_y, box_width, box_height)
--   SELECT p.id, p."eventId",
--          (jsonb_array_elements(p."faceData"->'descriptors'))::text::vector(128),
--          row_number() OVER (PARTITION BY p.id) - 1,
--          (jsonb_array_elements(p."faceData"->'faces')->>'x')::real,
--          (jsonb_array_elements(p."faceData"->'faces')->>'y')::real,
--          (jsonb_array_elements(p."faceData"->'faces')->>'width')::real,
--          (jsonb_array_elements(p."faceData"->'faces')->>'height')::real
--   FROM "Photo" p
--   WHERE p."faceData" IS NOT NULL
--     AND p."faceCount" > 0
--     AND jsonb_array_length(p."faceData"->'descriptors') > 0;
