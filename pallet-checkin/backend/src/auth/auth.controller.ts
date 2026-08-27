import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Max 5 attempts per IP per 15 minutes — slows down brute-force/credential
  // stuffing without the global throttler's more generous limit (which
  // exists mainly so dashboard polling every few seconds isn't affected).
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Creating a user requires an already-valid JWT — there is no public,
  // unauthenticated way to register an account. The first (bootstrap) user
  // is created by prisma/seed-admin.ts, run manually once.
  @UseGuards(JwtAuthGuard)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }
}
