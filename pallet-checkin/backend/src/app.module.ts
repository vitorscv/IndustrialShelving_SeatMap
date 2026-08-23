import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ShelvesModule } from './shelves/shelves.module';
import { PositionsModule } from './positions/positions.module';
import { MovementsModule } from './movements/movements.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, ShelvesModule, PositionsModule, MovementsModule, AuthModule],
})
export class AppModule {}
