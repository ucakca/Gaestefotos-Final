/*
  Warnings:

  - You are about to drop the column `config` on the `invitation_templates` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `invitation_templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invitation_templates" DROP COLUMN "config",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "storagePathOriginal" TEXT,
ADD COLUMN     "storagePathThumb" TEXT;
