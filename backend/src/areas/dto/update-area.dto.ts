import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateAreaDto } from './create-area.dto';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}
