import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

// No User model / roles / multi-tenancy: this only gates the read-only
// management dashboard, so credentials are configured via env vars for now.
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(dto: LoginDto) {
    const expectedUsername = process.env.DASHBOARD_USERNAME ?? 'admin';
    const expectedPassword = process.env.DASHBOARD_PASSWORD ?? 'admin123';

    if (dto.username !== expectedUsername || dto.password !== expectedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({ sub: dto.username, username: dto.username });
    return { accessToken };
  }
}
