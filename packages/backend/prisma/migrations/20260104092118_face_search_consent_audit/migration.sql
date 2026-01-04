-- CreateEnum
CREATE TYPE "FaceSearchConsentAction" AS ENUM ('ACCEPTED', 'REVOKED');

-- CreateTable
CREATE TABLE "face_search_consents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "consentKey" TEXT,
    "noticeText" TEXT,
    "checkboxLabel" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_search_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_search_consent_audit_logs" (
    "id" TEXT NOT NULL,
    "consentId" TEXT,
    "eventId" TEXT NOT NULL,
    "action" "FaceSearchConsentAction" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "consentKey" TEXT,
    "noticeText" TEXT,
    "checkboxLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_search_consent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "face_search_consents_eventId_idx" ON "face_search_consents"("eventId");

-- CreateIndex
CREATE INDEX "face_search_consents_expiresAt_idx" ON "face_search_consents"("expiresAt");

-- CreateIndex
CREATE INDEX "face_search_consents_revokedAt_idx" ON "face_search_consents"("revokedAt");

-- CreateIndex
CREATE INDEX "face_search_consent_audit_logs_consentId_idx" ON "face_search_consent_audit_logs"("consentId");

-- CreateIndex
CREATE INDEX "face_search_consent_audit_logs_eventId_idx" ON "face_search_consent_audit_logs"("eventId");

-- CreateIndex
CREATE INDEX "face_search_consent_audit_logs_action_idx" ON "face_search_consent_audit_logs"("action");

-- CreateIndex
CREATE INDEX "face_search_consent_audit_logs_createdAt_idx" ON "face_search_consent_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "face_search_consents" ADD CONSTRAINT "face_search_consents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_search_consent_audit_logs" ADD CONSTRAINT "face_search_consent_audit_logs_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "face_search_consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_search_consent_audit_logs" ADD CONSTRAINT "face_search_consent_audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
