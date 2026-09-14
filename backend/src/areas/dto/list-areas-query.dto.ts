import { SectionType, SubSectionType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListAreasQueryDto {
  @IsEnum(SectionType)
  @IsOptional()
  section?: SectionType;

  @IsEnum(SubSectionType)
  @IsOptional()
  subSection?: SubSectionType;
}
