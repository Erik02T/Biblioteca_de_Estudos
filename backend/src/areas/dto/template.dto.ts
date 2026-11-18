import {
  IsDateString,
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { TemplateType, SectionType, SubSectionType } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateType)
  type: TemplateType;

  @IsEnum(SectionType)
  section: SectionType;

  @IsEnum(SubSectionType)
  subSection: SubSectionType;

  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateType)
  @IsOptional()
  type?: TemplateType;

  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;
}

export class ApplyTemplateDto {
  @IsString()
  @IsOptional()
  targetAreaId?: string;

  @IsEnum(SectionType)
  section: SectionType;

  @IsEnum(SubSectionType)
  subSection: SubSectionType;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;
}

export class TemplateFromPageDto {
  @IsUUID()
  pageId: string;

  @IsDateString()
  updatedAt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsEnum(TemplateType)
  type: TemplateType;
}
