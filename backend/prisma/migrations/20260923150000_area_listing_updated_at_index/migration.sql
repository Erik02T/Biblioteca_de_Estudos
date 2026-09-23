DROP INDEX "Area_userId_section_subSection_idx";

CREATE INDEX "Area_userId_section_subSection_updatedAt_idx"
  ON "Area"("userId", "section", "subSection", "updatedAt");