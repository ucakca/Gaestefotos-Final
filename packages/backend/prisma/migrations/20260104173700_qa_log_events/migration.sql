-- CreateEnum
CREATE TYPE "QaLogLevel" AS ENUM ('IMPORTANT', 'DEBUG');

-- CreateTable
CREATE TABLE "qa_log_events" (
    "id" TEXT NOT NULL,
    "level" "QaLogLevel" NOT NULL DEFAULT 'IMPORTANT',
    "type" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "userId" TEXT,
    "userRole" TEXT,
    "eventId" TEXT,
    "path" TEXT,
    "method" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_log_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qa_log_events_createdAt_idx" ON "qa_log_events"("createdAt");

-- CreateIndex
CREATE INDEX "qa_log_events_level_idx" ON "qa_log_events"("level");

-- CreateIndex
CREATE INDEX "qa_log_events_type_idx" ON "qa_log_events"("type");

-- CreateIndex
CREATE INDEX "qa_log_events_eventId_idx" ON "qa_log_events"("eventId");

-- CreateIndex
CREATE INDEX "qa_log_events_userId_idx" ON "qa_log_events"("userId");
