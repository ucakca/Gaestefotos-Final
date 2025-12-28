-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_completions" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "guestId" TEXT,
    "uploaderName" TEXT,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_ratings" (
    "id" TEXT NOT NULL,
    "completionId" TEXT NOT NULL,
    "raterGuestId" TEXT,
    "raterName" TEXT,
    "ipAddress" TEXT,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenges_eventId_idx" ON "challenges"("eventId");

-- CreateIndex
CREATE INDEX "challenges_categoryId_idx" ON "challenges"("categoryId");

-- CreateIndex
CREATE INDEX "challenges_isActive_idx" ON "challenges"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_completions_photoId_key" ON "challenge_completions"("photoId");

-- CreateIndex
CREATE INDEX "challenge_completions_challengeId_idx" ON "challenge_completions"("challengeId");

-- CreateIndex
CREATE INDEX "challenge_completions_photoId_idx" ON "challenge_completions"("photoId");

-- CreateIndex
CREATE INDEX "challenge_completions_guestId_idx" ON "challenge_completions"("guestId");

-- CreateIndex
CREATE INDEX "challenge_ratings_completionId_idx" ON "challenge_ratings"("completionId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_ratings_completionId_ipAddress_key" ON "challenge_ratings"("completionId", "ipAddress");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_ratings" ADD CONSTRAINT "challenge_ratings_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "challenge_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
