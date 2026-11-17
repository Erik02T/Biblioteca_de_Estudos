-- AlterTable
ALTER TABLE "Area" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Area_userId_parentId_section_subSection_updatedAt_idx"
ON "Area"("userId", "parentId", "section", "subSection", "updatedAt");

-- AddForeignKey
ALTER TABLE "Area"
ADD CONSTRAINT "Area_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Area"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
