// Bootstraps the very first admin user. Run manually, once:
//   npm run prisma:seed-admin
// Reads ADMIN_USERNAME / ADMIN_PASSWORD from .env — never hardcode real
// credentials here. Additional users are created afterwards through the
// authenticated POST /auth/users endpoint, not through this script.
// Kept separate from seed.ts (the warehouse layout seeder, which is not
// idempotent and must never be re-run against a populated database).
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before running the seed script.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) {
      console.log(`User "${username}" already exists — leaving it untouched (not overwriting the password).`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
    await prisma.user.create({ data: { username, passwordHash } });
    console.log(`Created user "${username}". You can now log in with it — additional users can be created via POST /auth/users once logged in.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
