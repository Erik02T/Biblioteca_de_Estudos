import { AttachmentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttachmentDto {
  @IsEnum(AttachmentType)
  tipo: AttachmentType;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  nome?: string;

  @IsUUID()
  areaId: string;
}
