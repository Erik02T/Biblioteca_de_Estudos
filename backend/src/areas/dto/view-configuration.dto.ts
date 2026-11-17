import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import {
  ViewLayout,
  ViewScope,
  SectionType,
  SubSectionType,
} from '@prisma/client';

export class CreateViewConfigurationDto {
  @IsString()
  name: string;

  @IsEnum(ViewLayout)
  @IsOptional()
  layout?: ViewLayout;

  @IsEnum(ViewScope)
  @IsOptional()
  scope?: ViewScope;

  @IsEnum(SectionType)
  @IsOptional()
  section?: SectionType;

  @IsEnum(SubSectionType)
  @IsOptional()
  subSection?: SubSectionType;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  orderDirection?: string;
}

export class UpdateViewConfigurationDto {
  @IsEnum(SectionType)
  @IsOptional()
  section?: SectionType | null;

  @IsEnum(SubSectionType)
  @IsOptional()
  subSection?: SubSectionType | null;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ViewLayout)
  @IsOptional()
  layout?: ViewLayout;

  @IsEnum(ViewScope)
  @IsOptional()
  scope?: ViewScope;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  orderDirection?: string;
}
