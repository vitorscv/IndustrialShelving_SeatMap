import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class StalePositionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minDays?: number;
}
