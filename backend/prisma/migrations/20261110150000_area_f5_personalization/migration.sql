-- AlterTable
ALTER TABLE "Area"
ADD COLUMN "coverAttachmentId" TEXT,
ADD COLUMN "coverPosition" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "fullWidth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill sibling order deterministically (createdAt, id)
WITH ordered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY "userId", "parentId", section, "subSection"
      ORDER BY "createdAt" ASC, id ASC
    ) - 1)::INTEGER AS rn
  FROM "Area"
)
UPDATE "Area"
SET "sortOrder" = ordered.rn
FROM ordered
WHERE "Area".id = ordered.id;

-- CreateIndex
CREATE INDEX "Area_userId_parentId_section_subSection_sortOrder_id_idx"
ON "Area"("userId", "parentId", section, "subSection", "sortOrder", id);

-- AddForeignKey
ALTER TABLE "Area"
ADD CONSTRAINT "Area_coverAttachmentId_fkey"
FOREIGN KEY ("coverAttachmentId") REFERENCES "Attachment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
