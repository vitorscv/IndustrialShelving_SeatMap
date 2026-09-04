import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Rename only — Vendor has no other editable field today.
export class UpdateVendorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
