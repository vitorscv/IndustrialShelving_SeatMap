import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

// A wildcard origin ("*") would let ANY website's JavaScript call this API
// using a visiting operator's browser session — the origin allowlist comes
// from an env var so it's a deliberate, explicit choice per environment,
// never a default that silently opens up in production.
function getAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN;
  if (!raw || raw.trim() === '') {
    throw new Error(
      'FRONTEND_ORIGIN is not set. Set it to the real frontend URL(s) (comma-separated for more than one), e.g. FRONTEND_ORIGIN=http://localhost:5175',
    );
  }
  return raw.split(',').map((origin) => origin.trim());
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: getAllowedOrigins() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`Pallet check-in backend running on http://localhost:${port}`);
}
bootstrap();
