import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsOptional,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { CreateAreaDto } from './create-area.dto';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsNotEmpty()
  @IsDateString()
  updatedAt: string;
}
