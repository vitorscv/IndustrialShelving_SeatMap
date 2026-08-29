import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ShelvesModule } from './shelves/shelves.module';
import { PositionsModule } from './positions/positions.module';
import { MovementsModule } from './movements/movements.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Generous global default so normal use (dashboard polling every few
    // seconds) is never affected — the login route overrides this down to
    // a much stricter limit via its own @Throttle() decorator.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    ShelvesModule,
    PositionsModule,
    MovementsModule,
    AuthModule,
    ProductsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
