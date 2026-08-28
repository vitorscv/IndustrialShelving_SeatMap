// Bootstraps the very first admin and operator users. Run manually, once:
//   npm run prisma:seed-admin
// Reads ADMIN_USERNAME/ADMIN_PASSWORD and OPERATOR_USERNAME/OPERATOR_PASSWORD
// from .env — never hardcode real credentials here. Additional users are
// created afterwards through the authenticated POST /auth/users endpoint,
// not through this script.
// Kept separate from seed.ts (the warehouse layout seeder, which is not
// idempotent and must never be re-run against a populated database).
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

async function bootstrapUser(
  prisma: PrismaClient,
  username: string | undefined,
  password: string | undefined,
  role: Role,
  envVarNames: string,
) {
  if (!username || !password) {
    throw new Error(`Set ${envVarNames} in .env before running the seed script.`);
  }
  if (password.length < 8) {
    throw new Error(`Password for "${envVarNames}" must be at least 8 characters long.`);
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    console.log(`User "${username}" already exists — leaving it untouched (not overwriting the password).`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
  await prisma.user.create({ data: { username, passwordHash, role } });
  console.log(`Created user "${username}" with role ${role}. Additional users can be created via POST /auth/users once logged in.`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await bootstrapUser(
      prisma,
      process.env.ADMIN_USERNAME,
      process.env.ADMIN_PASSWORD,
      'ADMIN',
      'ADMIN_USERNAME and ADMIN_PASSWORD',
    );
    await bootstrapUser(
      prisma,
      process.env.OPERATOR_USERNAME,
      process.env.OPERATOR_PASSWORD,
      'OPERATOR',
      'OPERATOR_USERNAME and OPERATOR_PASSWORD',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
