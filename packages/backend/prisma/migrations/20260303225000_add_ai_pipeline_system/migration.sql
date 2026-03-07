-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PipelineExecutor" AS ENUM ('COMFYUI', 'LLM', 'LOCAL', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PipelineInputType" AS ENUM ('SINGLE_IMAGE', 'MULTI_IMAGE', 'TEXT_ONLY', 'IMAGE_AND_TEXT', 'NAME_ONLY', 'NAME_AND_PHOTO', 'NONE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PipelineOutputType" AS ENUM ('IMAGE', 'TEXT', 'VIDEO', 'GIF', 'JSON');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable: ai_pipelines
CREATE TABLE IF NOT EXISTS "ai_pipelines" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "executor" "PipelineExecutor" NOT NULL,
    "model" TEXT,
    "workflowJson" JSONB,
    "fallbackWorkflow" TEXT,
    "inputType" "PipelineInputType" NOT NULL DEFAULT 'SINGLE_IMAGE',
    "outputType" "PipelineOutputType" NOT NULL DEFAULT 'IMAGE',
    "defaultStrength" DOUBLE PRECISION DEFAULT 0.75,
    "defaultSteps" INTEGER DEFAULT 4,
    "defaultCfg" DOUBLE PRECISION DEFAULT 1.0,
    "defaultSampler" TEXT DEFAULT 'euler',
    "defaultScheduler" TEXT DEFAULT 'beta',
    "extraConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "avgDurationMs" INTEGER,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_pipeline_prompts
CREATE TABLE IF NOT EXISTS "ai_pipeline_prompts" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "systemPrompt" TEXT,
    "editPrompt" TEXT,
    "strength" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variantLabel" TEXT,
    "trafficWeight" INTEGER NOT NULL DEFAULT 100,
    "testCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "changelog" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_pipeline_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_pipeline_nodes
CREATE TABLE IF NOT EXISTS "ai_pipeline_nodes" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "config" JSONB,
    "connections" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_pipeline_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_pipeline_events
CREATE TABLE IF NOT EXISTS "ai_pipeline_events" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customPrompt" TEXT,
    "customNegativePrompt" TEXT,
    "customLogoUrl" TEXT,
    "logoPosition" TEXT DEFAULT 'bottom-right',
    "logoOpacity" DOUBLE PRECISION DEFAULT 0.8,
    "logoScale" DOUBLE PRECISION DEFAULT 0.15,
    "customConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_pipeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_pipelines_featureKey_key" ON "ai_pipelines"("featureKey");
CREATE INDEX IF NOT EXISTS "ai_pipelines_executor_idx" ON "ai_pipelines"("executor");
CREATE INDEX IF NOT EXISTS "ai_pipelines_isActive_idx" ON "ai_pipelines"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_pipeline_prompts_pipelineId_version_variantLabel_key" ON "ai_pipeline_prompts"("pipelineId", "version", "variantLabel");
CREATE INDEX IF NOT EXISTS "ai_pipeline_prompts_pipelineId_isActive_idx" ON "ai_pipeline_prompts"("pipelineId", "isActive");
CREATE INDEX IF NOT EXISTS "ai_pipeline_prompts_pipelineId_variantLabel_idx" ON "ai_pipeline_prompts"("pipelineId", "variantLabel");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_pipeline_nodes_pipelineId_nodeId_key" ON "ai_pipeline_nodes"("pipelineId", "nodeId");
CREATE INDEX IF NOT EXISTS "ai_pipeline_nodes_pipelineId_idx" ON "ai_pipeline_nodes"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_pipeline_events_pipelineId_eventId_key" ON "ai_pipeline_events"("pipelineId", "eventId");
CREATE INDEX IF NOT EXISTS "ai_pipeline_events_eventId_idx" ON "ai_pipeline_events"("eventId");
CREATE INDEX IF NOT EXISTS "ai_pipeline_events_pipelineId_idx" ON "ai_pipeline_events"("pipelineId");

-- AddForeignKey
ALTER TABLE "ai_pipeline_prompts" ADD CONSTRAINT "ai_pipeline_prompts_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "ai_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pipeline_nodes" ADD CONSTRAINT "ai_pipeline_nodes_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "ai_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pipeline_events" ADD CONSTRAINT "ai_pipeline_events_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "ai_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pipeline_events" ADD CONSTRAINT "ai_pipeline_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
