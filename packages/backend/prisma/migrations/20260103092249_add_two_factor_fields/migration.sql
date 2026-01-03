-- AlterTable
ALTER TABLE "event_traffic_stats" ALTER COLUMN "lastSeenAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorRecoveryCodesHashed" JSONB,
ADD COLUMN     "twoFactorSecretEncrypted" TEXT,
ADD COLUMN     "twoFactorSecretIv" TEXT,
ADD COLUMN     "twoFactorSecretTag" TEXT,
ADD COLUMN     "twoFactorSetupAt" TIMESTAMP(3);
