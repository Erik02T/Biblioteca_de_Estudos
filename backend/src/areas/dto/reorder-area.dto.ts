import { IsOptional, IsString } from 'class-validator';

export class ReorderAreaDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  beforeId?: string | null;

  @IsOptional()
  @IsString()
  afterId?: string | null;
}
