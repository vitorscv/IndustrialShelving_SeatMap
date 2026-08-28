import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_COST_FACTOR = 12;

// A real bcrypt hash of an arbitrary fixed string (cost 12) — used only to
// give the "user not found" path a bcrypt.compare() to run, so it costs
// roughly the same time as the "wrong password" path. Without this, an
// attacker could time responses to tell which usernames exist even though
// the error message itself is identical either way.
const DUMMY_HASH_FOR_TIMING_SAFETY = '$2b$12$gleIpL5SoLhjGAsqeSyUQ.Ik.6YI1.Ub9JEWqCz5GRilID8D5494u';

// Every query that touches User explicitly selects only these columns —
// passwordHash must never be attached to an object that could be returned
// from an API response, so it's never even fetched outside this service's
// own login check.
const SAFE_USER_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true, username: true, passwordHash: true, role: true },
    });

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH_FOR_TIMING_SAFETY,
    );

    // Same exception, same message, whether the username doesn't exist or
    // the password is wrong — distinguishing the two lets an attacker
    // enumerate valid usernames.
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Minimal claims only — the JWT payload is base64-encoded, not
    // encrypted, so nothing sensitive belongs in it. `role` is included so
    // RolesGuard can check it straight off the token, with no extra DB
    // query on every request.
    const accessToken = this.jwtService.sign({ sub: user.id, username: user.username, role: user.role });
    return { accessToken };
  }

  // Requires an already-valid JWT to call (enforced by the guard on the
  // controller route) — there is no public/unauthenticated way to create a
  // user. The very first user is created by prisma/seed-admin.ts instead.
  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);

    // dto.role omitted falls through to the schema's own @default(OPERATOR)
    // — creating a user never silently grants admin access, ADMIN has to
    // be chosen explicitly by whoever is creating the account.
    return this.prisma.user.create({
      data: { username: dto.username, passwordHash, role: dto.role },
      select: SAFE_USER_SELECT,
    });
  }
}
