-- CreateTable
CREATE TABLE "event_reminder_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageEndsAt" TIMESTAMP(3),

    CONSTRAINT "event_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_reminder_logs_eventId_idx" ON "event_reminder_logs"("eventId");

-- CreateIndex
CREATE INDEX "event_reminder_logs_kind_idx" ON "event_reminder_logs"("kind");

-- CreateIndex
CREATE INDEX "event_reminder_logs_sentAt_idx" ON "event_reminder_logs"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_reminder_logs_eventId_kind_daysBefore_key" ON "event_reminder_logs"("eventId", "kind", "daysBefore");

-- AddForeignKey
ALTER TABLE "event_reminder_logs" ADD CONSTRAINT "event_reminder_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
