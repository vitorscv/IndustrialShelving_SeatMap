import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { LoginThrottleService } from './login-throttle.service';

// Replaces the old @Throttle({ default: { limit: 5, ttl: 15min } })
// decorator on POST /auth/login. A Guard (what @Throttle/ThrottlerGuard
// use) only runs BEFORE the handler and has no way to know whether the
// request eventually succeeded or failed — that's exactly why the old
// mechanism counted every request, successes included. An Interceptor can
// wrap the handler's outcome (via next.handle()'s success/error channels),
// which is what makes "only count failed attempts" possible here.
@Injectable()
export class LoginThrottleInterceptor implements NestInterceptor {
  constructor(private readonly loginThrottle: LoginThrottleService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? 'unknown';

    // Throws (429) before AuthService.login even runs if this IP already
    // has 5 failed attempts within the current 15-minute window.
    this.loginThrottle.assertNotBlocked(ip);

    return next.handle().pipe(
      tap(() => this.loginThrottle.registerSuccess(ip)),
      catchError((err: unknown) => {
        // Only wrong-username/wrong-password counts as an "attempt" —
        // a malformed request body (400, from DTO validation) or any
        // other error is never held against this IP.
        if (err instanceof UnauthorizedException) {
          this.loginThrottle.registerFailure(ip);
        }
        return throwError(() => err);
      }),
    );
  }
}
