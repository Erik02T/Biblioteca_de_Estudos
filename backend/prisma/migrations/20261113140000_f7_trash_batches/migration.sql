-- Legacy trash entries remain independent: no guessed batches or rewritten content.
ALTER TABLE "Area" ADD COLUMN "deletionBatchId" TEXT;
CREATE INDEX "Area_userId_deletionBatchId_idx" ON "Area"("userId", "deletionBatchId");
