import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { QUANTITY_PATTERN } from '../../common/quantity';

// All fields are required — this replaces the position's editable data
// wholesale (the frontend form is always pre-filled from the current
// Position, so a partial PATCH semantic isn't needed). vendorId/cidade
// replace salesInfo the same way CreateMovementDto's CHECK_IN path does:
// the service resolves the vendor and re-derives salesInfo internally.
export class EditOccupiedPositionDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @IsString()
  @IsNotEmpty()
  product: string;

  // Free text, not a plain number — one or more positive integers
  // separated by "/" (e.g. "2500/3000" for two orders on one pallet).
  @IsString()
  @Matches(QUANTITY_PATTERN, {
    message: 'quantity must be one or more positive integers separated by "/" (e.g. "5000" or "2500/3000")',
  })
  quantity: string;

  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  cidade: string;
}
