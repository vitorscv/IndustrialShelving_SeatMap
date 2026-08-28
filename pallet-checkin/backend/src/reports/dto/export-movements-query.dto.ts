import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { MovementType } from '@prisma/client';

export class ExportMovementsQueryDto {
  @IsEnum(MovementType)
  type: MovementType;

  // Plain YYYY-MM-DD strings, both ends inclusive of the whole day — the
  // service turns these into 00:00:00.000 / 23:59:59.999 boundaries rather
  // than relying on Date's own midnight-only parsing.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
