import { Controller, Get } from '@nestjs/common';

// No auth, no dependencies (not even a DB ping) — this only needs to prove
// the Nest process itself is up and accepting requests, which is exactly
// what Railway's health check polls for before routing traffic to a new
// deploy.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
