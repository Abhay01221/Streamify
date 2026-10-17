import 'dotenv/config';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from './utils/prisma';
async function main() {
  const { ADMIN_EMAIL: email, ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = z.object({
    ADMIN_EMAIL: z.string().email(), ADMIN_USERNAME: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
    ADMIN_PASSWORD: z.string().min(12).max(72),
  }).parse(process.env);
  if (await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })) throw new Error('User already exists; bootstrap never modifies existing accounts');
  await prisma.user.create({ data: { email, username, passwordHash: await bcrypt.hash(password, 12), isAdmin: true,
    profile: { create: {} }, stats: { create: {} }, streak: { create: {} }, notificationSettings: { create: {} } } });
  console.log('Administrator created');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
