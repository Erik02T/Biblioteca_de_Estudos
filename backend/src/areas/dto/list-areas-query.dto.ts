import { SectionType, SubSectionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsObject,
  IsIn,
  MaxLength,
} from 'class-validator';

export class ListAreasQueryDto {
  @IsEnum(SectionType)
  @IsOptional()
  section?: SectionType;

  @IsEnum(SubSectionType)
  @IsOptional()
  subSection?: SubSectionType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  deleted?: boolean;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  orderDirection?: string;

  @IsIn(['ROOTS', 'ALL'])
  @IsOptional()
  scope?: 'ROOTS' | 'ALL';

  @IsString()
  @MaxLength(255)
  @IsOptional()
  q?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  categoria?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  minLevel?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  maxLevel?: number;

  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  recent?: boolean;
}
