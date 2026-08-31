import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteMovementDto {
  // Required, non-empty — the entire point of this endpoint is that a
  // deletion is never undocumented, so there's no code path that skips it.
  @IsString()
  @IsNotEmpty()
  reason: string;
}
