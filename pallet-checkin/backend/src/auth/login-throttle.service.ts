import { Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

// Same threshold as the @Throttle() decorator this replaces (see
// LoginThrottleInterceptor) — 5 failed attempts per IP within a 15-minute
// window. A successful login resets an IP's record entirely: legitimate
// use (page reloads, several people logging in, testing) never counts
// against this, only actual wrong-username/wrong-password attempts do.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

interface FailedAttemptRecord {
  failedCount: number;
  windowExpiresAt: number;
}

// Deliberately NOT built on @nestjs/throttler's own ThrottlerStorage: that
// storage's increment() runs unconditionally (it's designed to be called
// from a Guard, before the handler knows the outcome) and its internal
// per-key state also schedules its own setTimeout cleanups keyed by
// object identity — reaching in to delete a key out from under it risks
// a stale timer callback later reading a now-missing entry. A small,
// dedicated in-memory map avoids that entirely and makes "reset on
// success" a plain, safe Map.delete().
@Injectable()
export class LoginThrottleService {
  private readonly recordsByIp = new Map<string, FailedAttemptRecord>();

  // Called before attempting authentication. Throws the same
  // ThrottlerException (429, same message) the old @Throttle() decorator
  // would have thrown, so callers see no difference once actually blocked.
  assertNotBlocked(ip: string): void {
    const record = this.recordsByIp.get(ip);
    if (!record) return;

    if (Date.now() >= record.windowExpiresAt) {
      // The 15-minute window has naturally elapsed — clean slate.
      this.recordsByIp.delete(ip);
      return;
    }

    if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
      throw new ThrottlerException();
    }
  }

  // Called only when this specific request's login attempt failed
  // (invalid username or password) — see LoginThrottleInterceptor.
  registerFailure(ip: string): void {
    const now = Date.now();
    const record = this.recordsByIp.get(ip);

    if (!record || now >= record.windowExpiresAt) {
      this.recordsByIp.set(ip, { failedCount: 1, windowExpiresAt: now + WINDOW_MS });
      return;
    }

    record.failedCount += 1;
  }

  // Called on a successful login — clears this IP's record entirely, so
  // failed attempts before a successful login never carry over and count
  // against a later, unrelated failed attempt.
  registerSuccess(ip: string): void {
    this.recordsByIp.delete(ip);
  }
}
