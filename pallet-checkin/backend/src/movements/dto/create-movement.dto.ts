import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  positionId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsString()
  @IsNotEmpty()
  palletCode: string;

  @IsString()
  @IsNotEmpty()
  operatorName: string;
}
