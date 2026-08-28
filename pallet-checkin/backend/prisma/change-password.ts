// Manually changes a user's password from the terminal — an admin tool
// for the project owner to run directly, not a self-service feature (there
// is no HTTP endpoint for this; the account owner has no way to trigger it
// themselves). Run:
//   npm run password:change -- <username> <newPassword>
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

async function main() {
  const [username, newPassword] = process.argv.slice(2);

  if (!username || !newPassword) {
    throw new Error('Usage: npm run password:change -- <username> <newPassword>');
  }
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!existing) {
      throw new Error(`No user found with username "${username}".`);
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
    await prisma.user.update({ where: { username }, data: { passwordHash } });
    // Confirms which account changed — never echoes the password itself
    // back to the terminal or any log.
    console.log(`Password updated for user "${username}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
