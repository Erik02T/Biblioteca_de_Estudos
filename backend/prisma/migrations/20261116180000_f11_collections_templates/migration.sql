-- Additive migration: legacy favorite timestamps are deliberately not visits.
BEGIN;
CREATE TABLE "AreaOpening" (
  "areaId" TEXT PRIMARY KEY REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AreaOpening_userId_lastOpenedAt_areaId_idx" ON "AreaOpening"("userId", "lastOpenedAt", "areaId");
ALTER TABLE "ViewConfiguration" ALTER COLUMN "section" DROP NOT NULL;
ALTER TABLE "ViewConfiguration" ALTER COLUMN "subSection" DROP NOT NULL;
-- Keep the Prisma index, and enforce uniqueness for global/null contexts too.
CREATE UNIQUE INDEX "ViewConfiguration_global_name_key" ON "ViewConfiguration" ("userId", "name") WHERE "section" IS NULL AND "subSection" IS NULL;
CREATE UNIQUE INDEX "ViewConfiguration_section_name_key" ON "ViewConfiguration" ("userId", "name", "section") WHERE "section" IS NOT NULL AND "subSection" IS NULL;
CREATE UNIQUE INDEX "ViewConfiguration_status_name_key" ON "ViewConfiguration" ("userId", "name", "subSection") WHERE "section" IS NULL AND "subSection" IS NOT NULL;
ALTER TABLE "Template" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Template" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE TABLE "TemplateFile" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "attachmentId" TEXT NOT NULL,
  "tipo" "AttachmentType" NOT NULL,
  "nome" TEXT,
  "storageKey" TEXT,
  "linkUrl" TEXT,
  "sha256" TEXT
);
CREATE UNIQUE INDEX "TemplateFile_templateId_attachmentId_key" ON "TemplateFile"("templateId", "attachmentId");
COMMIT;
