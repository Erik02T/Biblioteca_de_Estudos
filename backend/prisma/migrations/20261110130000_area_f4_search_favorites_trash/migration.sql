-- AlterTable
ALTER TABLE "Area"
ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Area_userId_deletedAt_isFavorite_updatedAt_idx"
ON "Area"("userId", "deletedAt", "isFavorite", "updatedAt");
