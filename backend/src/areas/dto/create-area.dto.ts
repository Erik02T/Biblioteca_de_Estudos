import { SectionType, SubSectionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const AREA_NOME_MAX_LENGTH = 255;
export const AREA_CATEGORIA_MAX_LENGTH = 255;
export const AREA_ICONE_MAX_LENGTH = 255;
export const AREA_CONTEUDO_MAX_BYTES = 1024 * 1024; // 1 MB

export function IsEditorJsonSizeWithinLimit(
  maxBytes: number = AREA_CONTEUDO_MAX_BYTES,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEditorJsonSizeWithinLimit',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) return true;
          if (typeof value !== 'object') return false;
          try {
            const jsonString = JSON.stringify(value);
            return Buffer.byteLength(jsonString, 'utf8') <= maxBytes;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} excede o limite de tamanho permitido (${maxBytes} bytes)`;
        },
      },
    });
  };
}

export class CreateAreaDto {
  @IsEnum(SectionType)
  section: SectionType;

  @IsEnum(SubSectionType)
  subSection: SubSectionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(AREA_NOME_MAX_LENGTH)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(AREA_CATEGORIA_MAX_LENGTH)
  categoria: string;

  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  nivelEntendimento?: number;

  @IsString()
  @IsOptional()
  @MaxLength(AREA_ICONE_MAX_LENGTH)
  icone?: string;

  @IsObject()
  @IsOptional()
  @IsEditorJsonSizeWithinLimit(AREA_CONTEUDO_MAX_BYTES)
  conteudo?: Record<string, unknown>;
}
