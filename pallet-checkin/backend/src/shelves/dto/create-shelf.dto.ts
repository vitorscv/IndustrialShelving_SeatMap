import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateShelfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  locations: number;
}
