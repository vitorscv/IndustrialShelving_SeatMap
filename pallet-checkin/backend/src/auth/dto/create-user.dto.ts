import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  // Keeps usernames predictable (used as a JWT claim and, eventually, in
  // audit trails) without being so strict it rejects real names.
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username must contain only letters, numbers, dots, underscores or hyphens',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(200)
  password: string;

  // Omitted → falls through to the schema's own @default(OPERATOR) in
  // AuthService.createUser — never silently ADMIN.
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
