import { SectionType, SubSectionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
