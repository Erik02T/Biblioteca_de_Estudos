-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('LINGUAGENS', 'FACULDADE', 'PROJETOS', 'OUTROS');

-- CreateEnum
CREATE TYPE "SubSectionType" AS ENUM ('ESTUDANDO', 'ESTUDADO');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('LINK', 'IMAGEM', 'ARQUIVO');

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "SectionType" NOT NULL,
    "subSection" "SubSectionType" NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nivelEntendimento" INTEGER NOT NULL DEFAULT 0,
    "icone" TEXT,
    "conteudo" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Area_nivelEntendimento_range_check"
      CHECK ("nivelEntendimento" BETWEEN 0 AND 5)
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "tipo" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "nome" TEXT,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Area_userId_section_subSection_idx" ON "Area"("userId", "section", "subSection");

-- CreateIndex
CREATE INDEX "Attachment_areaId_idx" ON "Attachment"("areaId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
