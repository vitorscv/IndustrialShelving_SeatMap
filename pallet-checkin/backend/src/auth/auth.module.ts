import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getJwtSecret } from './jwt-secret';
import { LoginThrottleService } from './login-throttle.service';
import { LoginThrottleInterceptor } from './login-throttle.interceptor';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      // One work shift — not indefinite. Forces re-login instead of a
      // token that stays valid forever if it ever leaks.
      signOptions: { expiresIn: '8h', algorithm: 'HS256' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginThrottleService, LoginThrottleInterceptor],
})
export class AuthModule {}
