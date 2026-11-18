-- Migration: F6 - View configurations and templates
-- Created: 2026-11-13

-- Create enums
CREATE TYPE "ViewLayout" AS ENUM ('LIST', 'TABLE', 'BOARD');
CREATE TYPE "ViewScope" AS ENUM ('ROOTS', 'ALL');
CREATE TYPE "TemplateType" AS ENUM ('NOTE', 'LECTURE', 'PROJECT');

-- Create ViewConfiguration table
CREATE TABLE "ViewConfiguration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" "ViewLayout" NOT NULL DEFAULT 'LIST',
    "scope" "ViewScope" NOT NULL DEFAULT 'ROOTS',
    "section" "SectionType" NOT NULL,
    "subSection" "SubSectionType" NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "orderBy" TEXT NOT NULL DEFAULT 'updatedAt',
    "orderDirection" TEXT NOT NULL DEFAULT 'desc',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewConfiguration_pkey" PRIMARY KEY ("id")
);

-- Create Template table
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TemplateType" NOT NULL,
    "section" "SectionType" NOT NULL,
    "subSection" "SubSectionType" NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "ViewConfiguration_userId_section_subSection_idx" ON "ViewConfiguration"("userId", "section", "subSection");
CREATE UNIQUE INDEX "ViewConfiguration_userId_name_section_subSection_key" ON "ViewConfiguration"("userId", "name", "section", "subSection");
CREATE INDEX "Template_userId_type_section_subSection_idx" ON "Template"("userId", "type", "section", "subSection");

-- Add foreign key constraints
ALTER TABLE "ViewConfiguration" ADD CONSTRAINT "ViewConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
