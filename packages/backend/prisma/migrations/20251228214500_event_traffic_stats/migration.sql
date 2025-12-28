-- CreateTable
CREATE TABLE "event_traffic_stats" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_traffic_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_traffic_stats_eventId_idx" ON "event_traffic_stats"("eventId");

-- CreateIndex
CREATE INDEX "event_traffic_stats_source_idx" ON "event_traffic_stats"("source");

-- CreateIndex
CREATE UNIQUE INDEX "event_traffic_stats_eventId_source_key" ON "event_traffic_stats"("eventId", "source");

-- AddForeignKey
ALTER TABLE "event_traffic_stats" ADD CONSTRAINT "event_traffic_stats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
