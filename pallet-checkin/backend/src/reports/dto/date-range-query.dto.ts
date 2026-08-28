import { IsDateString, IsOptional } from 'class-validator';

// Shared by every report that only needs an optional from/to window
// (top-products, by-salesperson, activity-peaks) — same YYYY-MM-DD,
// both-ends-inclusive convention as ExportMovementsQueryDto.
export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
