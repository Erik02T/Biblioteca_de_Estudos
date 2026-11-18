-- AlterTable
ALTER TABLE "Area"
ADD COLUMN "targetPageId" TEXT;

-- CreateIndex
CREATE INDEX "Area_userId_targetPageId_deletedAt_idx"
ON "Area"("userId", "targetPageId", "deletedAt");

-- AddForeignKey
ALTER TABLE "Area"
ADD CONSTRAINT "Area_targetPageId_fkey"
FOREIGN KEY ("targetPageId") REFERENCES "Area"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
