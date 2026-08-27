import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateIf } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  positionId: string;

  @IsEnum(MovementType)
  type: MovementType;

  // Required on CHECK_IN; on CHECK_OUT the service reads the current value
  // already stored on the Position instead, so it's not required here.
  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  orderNumber?: string;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  product?: string;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  salesInfo?: string;
}
