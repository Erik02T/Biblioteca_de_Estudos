import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RevisionTokenDto {
  @IsNotEmpty()
  @IsDateString()
  updatedAt: string;
}

export class CreateRevisionDto extends RevisionTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class ExportDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];

  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTrash?: boolean;
}
