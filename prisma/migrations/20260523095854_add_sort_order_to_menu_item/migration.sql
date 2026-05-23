-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "sortOrder" INTEGER;

-- CreateIndex
CREATE INDEX "MenuItem_sortOrder_idx" ON "MenuItem"("sortOrder");
