import { SectionType, SubSectionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAreaDto {
  @IsEnum(SectionType)
  section: SectionType;

  @IsEnum(SubSectionType)
  subSection: SubSectionType;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  nivelEntendimento?: number;

  @IsString()
  @IsOptional()
  icone?: string;

  @IsObject()
  @IsOptional()
  conteudo?: Record<string, unknown>;
}
