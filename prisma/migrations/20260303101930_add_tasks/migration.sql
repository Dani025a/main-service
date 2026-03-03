/*
  Warnings:

  - Added the required column `seller_id` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "seller_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "idx_notifications_seller_id" ON "notifications"("seller_id");
