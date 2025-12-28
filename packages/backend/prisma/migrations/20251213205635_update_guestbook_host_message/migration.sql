/*
  Warnings:

  - You are about to drop the `guestbook_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "guestbook_requests" DROP CONSTRAINT "guestbook_requests_eventId_fkey";

-- DropForeignKey
ALTER TABLE "guestbook_requests" DROP CONSTRAINT "guestbook_requests_guestId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "guestbookHostMessage" TEXT;

-- DropTable
DROP TABLE "guestbook_requests";
