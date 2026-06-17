import { PrismaClient } from '../../src/generated/prisma-client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

const tables = [
  'redemption_logs',
  'generation_logs',
  'redemption_codes',
  'users',
  'admins',
  'channels',
];

export async function resetTables() {
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
  }
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
}

export async function seedTestAdmin(password = 'admin123') {
  const hash = await bcrypt.hash(password, 10);
  return prisma.admins.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: hash,
      role: 'super',
    },
  });
}

export async function seedTestChannels(gatewayUrl: string) {
  await prisma.channels.createMany({
    data: [
      {
        name: 'Test Paid',
        type: 'paid',
        gateway_url: gatewayUrl,
        api_key: 'test-paid-key',
        model: 'gpt-image-2',
        cost_per_image: 25,
        priority: 1,
        daily_free_limit: 0,
        is_active: true,
      },
      {
        name: 'Test Free',
        type: 'free',
        gateway_url: gatewayUrl,
        api_key: null,
        model: 'gpt-image-1',
        cost_per_image: 0,
        priority: 2,
        daily_free_limit: 5,
        is_active: true,
      },
    ],
  });
}

export async function getTestPaidChannel() {
  return prisma.channels.findFirstOrThrow({ where: { type: 'paid' } });
}

export async function getTestFreeChannel() {
  return prisma.channels.findFirstOrThrow({ where: { type: 'free' } });
}
