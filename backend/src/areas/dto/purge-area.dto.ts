import { Equals, IsISO8601 } from 'class-validator';

export class PurgeAreaDto {
  @Equals(true)
  confirmed: boolean;

  @IsISO8601({ strict: true })
  updatedAt: string;
}
