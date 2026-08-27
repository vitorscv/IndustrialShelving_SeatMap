import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../jwt-secret';

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Explicit even though it's passport-jwt's default: an expired
      // token's signature is still valid, so this is the check that
      // actually rejects it.
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
    });
  }

  // Only the minimal claims from the token — no DB lookup here by design,
  // so a valid signature + unexpired token is sufficient to authenticate
  // every request without hitting the database.
  validate(payload: JwtPayload) {
    return { userId: payload.sub, username: payload.username };
  }
}
