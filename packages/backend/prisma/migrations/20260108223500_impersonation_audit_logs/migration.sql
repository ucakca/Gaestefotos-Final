-- CreateTable
CREATE TABLE "impersonation_audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT,
    "ttlSeconds" INTEGER NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_adminUserId_idx" ON "impersonation_audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_targetUserId_idx" ON "impersonation_audit_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_createdAt_idx" ON "impersonation_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "impersonation_audit_logs" ADD CONSTRAINT "impersonation_audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_audit_logs" ADD CONSTRAINT "impersonation_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
