import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { LoginThrottleInterceptor } from './login-throttle.interceptor';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Max 5 FAILED attempts per IP per 15 minutes — slows down brute-force/
  // credential stuffing without penalizing normal use (page reloads,
  // several people logging in, testing). See LoginThrottleInterceptor:
  // only a wrong username/password counts as an attempt; a successful
  // login resets the count for that IP instead of adding to it.
  @UseInterceptors(LoginThrottleInterceptor)
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Creating a user requires an already-valid JWT from an ADMIN — there is
  // no public, unauthenticated way to register an account, and an
  // OPERATOR can't create accounts either (of either role). The first
  // (bootstrap) user is created by prisma/seed-admin.ts, run manually once.
  @Roles('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }
}
