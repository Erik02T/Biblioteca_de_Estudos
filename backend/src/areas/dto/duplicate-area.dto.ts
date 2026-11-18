import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DuplicateAreaDto {
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
