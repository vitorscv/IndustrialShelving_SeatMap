import { IsEnum, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
import { MovementType } from '@prisma/client';
import { QUANTITY_PATTERN } from '../../common/quantity';

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  positionId: string;

  @IsEnum(MovementType)
  type: MovementType;

  // Required on CHECK_IN; on CHECK_OUT the service reads the current value
  // already stored on the Position instead, so it's not required here.
  // Free text, not a plain number — one or more positive integers
  // separated by "/" (e.g. "2500/3000" for two orders on one pallet).
  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @Matches(QUANTITY_PATTERN, {
    message: 'quantity must be one or more positive integers separated by "/" (e.g. "5000" or "2500/3000")',
  })
  quantity?: string;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  orderNumber?: string;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  product?: string;

  // Raw free text, possibly several vendor names joined by "/" (e.g.
  // "MACHADO/GOMES E LIMA") — MovementsService parses this and resolves a
  // canonical vendorId only when it's a single name that exactly matches
  // the Vendor catalog (case/accent-insensitive); otherwise the position
  // is stored unlinked (vendorId null), same as any legacy free-text
  // record. salesInfo is always derived as `${vendedorText}/${cidade}`
  // (using the canonical catalog name when resolved, the raw text
  // otherwise) regardless of whether vendorId was resolved.
  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  vendedorText?: string;

  @ValidateIf((dto: CreateMovementDto) => dto.type === MovementType.CHECK_IN)
  @IsString()
  @IsNotEmpty()
  cidade?: string;
}
