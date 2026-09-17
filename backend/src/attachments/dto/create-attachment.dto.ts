import { AttachmentType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const ATTACHMENT_URL_MAX_LENGTH = 2048;

export function isValidAttachmentUrl(value: string): boolean {
  if (value.length > ATTACHMENT_URL_MAX_LENGTH) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export class CreateAttachmentDto {
  @IsEnum(AttachmentType)
  tipo: AttachmentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(ATTACHMENT_URL_MAX_LENGTH)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;

  @IsString()
  @IsOptional()
  nome?: string;

  @IsUUID()
  areaId: string;
}
