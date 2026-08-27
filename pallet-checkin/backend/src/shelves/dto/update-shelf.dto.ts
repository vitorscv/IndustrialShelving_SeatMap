import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Rename only for now — changing `locations` would mean adding/removing
// positions (and deciding what happens to any that are OCCUPIED), which is
// a bigger, separate feature than a simple inline title edit.
export class UpdateShelfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}
