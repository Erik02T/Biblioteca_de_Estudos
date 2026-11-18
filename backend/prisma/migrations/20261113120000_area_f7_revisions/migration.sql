CREATE TABLE "PageRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "areaId" TEXT NOT NULL REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "document" JSONB NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PageRevision_areaId_createdAt_id_idx" ON "PageRevision"("areaId", "createdAt", "id");
CREATE TABLE "RevisionFile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "revisionId" TEXT NOT NULL REFERENCES "PageRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "attachmentId" TEXT NOT NULL,
  "tipo" "AttachmentType" NOT NULL,
  "nome" TEXT,
  "storageKey" TEXT,
  "linkUrl" TEXT,
  "sha256" TEXT
);
CREATE UNIQUE INDEX "RevisionFile_revisionId_attachmentId_key" ON "RevisionFile"("revisionId", "attachmentId");
